package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.response.UploadImageResponse;
import io.minio.CopyObjectArgs;
import io.minio.CopySource;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
public class UploadService {

    private static final long MAX_IMAGE_SIZE = 10L * 1024L * 1024L;
    private static final long MAX_IMAGE_PIXELS = 40_000_000L;
    private static final String JPEG = "image/jpeg";
    private static final String PNG = "image/png";
    private static final String WEBP = "image/webp";

    // 缩略图配置
    private static final int THUMBNAIL_MAX_WIDTH = 400;
    private static final float THUMBNAIL_JPEG_QUALITY = 0.85f;

    private final MinioClient minioClient;
    private final String publicUrl;
    private final String cdnUrl;
    private final String bucketName;

    public UploadService(
            MinioClient minioClient,
            @Value("${minio.public-url:${minio.endpoint}}") String publicUrl,
            @Value("${minio.cdn-url:}") String cdnUrl,
            @Value("${minio.bucket-name}") String bucketName) {
        this.minioClient = minioClient;
        this.publicUrl = publicUrl.replaceAll("/+$", "");
        this.cdnUrl = (cdnUrl != null && !cdnUrl.isBlank()) ? cdnUrl.replaceAll("/+$", "") : null;
        this.bucketName = bucketName;
    }

    public UploadImageResponse uploadImage(MultipartFile file) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        validateFile(file);
        PreparedImage prepared = prepareImage(file);
        String objectName = buildObjectName(userId, prepared.extension());

        try (ByteArrayInputStream inputStream = new ByteArrayInputStream(prepared.bytes())) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .stream(inputStream, prepared.bytes().length, -1)
                    .contentType(prepared.contentType())
                    .build());
        } catch (Exception exception) {
            log.error("Image upload failed. userId: {}, fileName: {}, error: {}",
                    userId, file.getOriginalFilename(), exception.getMessage(), exception);
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        return UploadImageResponse.builder()
                .url(buildPublicUrl(objectName))
                .objectName(objectName)
                .contentType(prepared.contentType())
                .size(prepared.bytes().length)
                .build();
    }

    public void validatePendingImages(Long ownerId, List<String> images) {
        String requiredPrefix = "pending/" + ownerId + "/";
        for (String image : images) {
            if (image == null || !image.startsWith(requiredPrefix) || image.contains("..")) {
                throw new BusinessException(ErrorCode.NO_PERMISSION, "图片不属于当前用户");
            }
        }
    }

    /**
     * 发布图片：将 pending 图片复制到 published/，同时生成缩略图到 thumbnails/。
     * 返回原图 URL 列表（缩略图 URL 通过 objectName 约定可推导）。
     */
    public List<String> publishImages(Long ownerId, List<String> images) {
        validatePendingImages(ownerId, images);
        List<String> publishedUrls = new ArrayList<>();
        for (String image : images) {
            String requiredPrefix = "pending/" + ownerId + "/";
            String publishedObject = "published/" + image.substring(requiredPrefix.length());
            String thumbnailObject = "thumbnails/" + image.substring(requiredPrefix.length());
            try {
                // 复制原图到 published/
                if (!objectExists(publishedObject)) {
                    minioClient.copyObject(CopyObjectArgs.builder()
                            .bucket(bucketName)
                            .object(publishedObject)
                            .source(CopySource.builder().bucket(bucketName).object(image).build())
                            .build());
                }
                // 生成缩略图
                generateAndUploadThumbnail(image, thumbnailObject);
                // 清理原 pending 图片
                removeObjectQuietly(image);
                publishedUrls.add(buildPublicUrl(publishedObject));
            } catch (Exception exception) {
                log.error("Image promotion failed. ownerId: {}, objectName: {}", ownerId, image, exception);
                throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED, "图片发布失败");
            }
        }
        return publishedUrls;
    }

    public void deletePendingImages(Long ownerId, List<String> images) {
        for (String image : images) {
            if (image != null && image.startsWith("pending/" + ownerId + "/")) {
                removeObjectQuietly(image);
            }
        }
    }

    public void cancelPendingUpload(String objectName) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        String requiredPrefix = "pending/" + userId + "/";
        if (objectName == null || !objectName.startsWith(requiredPrefix) || objectName.contains("..")) {
            throw new BusinessException(ErrorCode.NO_PERMISSION);
        }
        try {
            minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucketName).object(objectName).build());
        } catch (Exception exception) {
            log.warn("Orphan upload cleanup failed. userId: {}, objectName: {}, error: {}",
                    userId, objectName, exception.getMessage());
        }
    }

    // ─── 缩略图生成 ─────────────────────────────────────────────────

    /**
     * 生成缩略图并上传到 MinIO。
     * 规则：长边 ≤ 400px，保持宽高比，JPEG 质量 85%。
     */
    private void generateAndUploadThumbnail(String sourceObject, String thumbnailObject) {
        try {
            // 下载原图
            byte[] originalBytes;
            try (var stream = minioClient.getObject(
                    io.minio.GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(sourceObject)
                            .build())) {
                originalBytes = stream.readAllBytes();
            }

            BufferedImage original = ImageIO.read(new ByteArrayInputStream(originalBytes));
            if (original == null) {
                log.warn("Cannot decode image for thumbnail: {}", sourceObject);
                return;
            }

            // 计算缩略图尺寸
            int origWidth = original.getWidth();
            int origHeight = original.getHeight();
            int targetWidth = Math.min(origWidth, THUMBNAIL_MAX_WIDTH);
            int targetHeight = (int) ((double) targetWidth / origWidth * origHeight);

            // 缩放
            BufferedImage thumbnail = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = thumbnail.createGraphics();
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g2d.drawImage(original, 0, 0, targetWidth, targetHeight, null);
            g2d.dispose();

            // 编码为 JPEG（质量 85%）
            byte[] thumbnailBytes;
            try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
                if (!writers.hasNext()) {
                    log.warn("No JPEG writer available for thumbnail generation");
                    return;
                }
                ImageWriter writer = writers.next();
                try (ImageOutputStream ios = ImageIO.createImageOutputStream(output)) {
                    writer.setOutput(ios);
                    ImageWriteParam param = writer.getDefaultWriteParam();
                    if (param.canWriteCompressed()) {
                        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                        param.setCompressionQuality(THUMBNAIL_JPEG_QUALITY);
                    }
                    writer.write(null, new IIOImage(thumbnail, null, null), param);
                } finally {
                    writer.dispose();
                }
                thumbnailBytes = output.toByteArray();
            }

            // 上传缩略图
            try (ByteArrayInputStream inputStream = new ByteArrayInputStream(thumbnailBytes)) {
                minioClient.putObject(PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(thumbnailObject)
                        .stream(inputStream, thumbnailBytes.length, -1)
                        .contentType(JPEG)
                        .build());
            }
            log.debug("Thumbnail generated: {} -> {}", sourceObject, thumbnailObject);
        } catch (Exception exception) {
            log.warn("Thumbnail generation failed for {}: {}", sourceObject, exception.getMessage());
            // 缩略图生成失败不阻断发布流程
        }
    }

    // ─── 工具方法 ─────────────────────────────────────────────────

    private boolean objectExists(String objectName) {
        try {
            minioClient.statObject(StatObjectArgs.builder().bucket(bucketName).object(objectName).build());
            return true;
        } catch (Exception exception) {
            return false;
        }
    }

    private void removeObjectQuietly(String objectName) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder().bucket(bucketName).object(objectName).build());
        } catch (Exception exception) {
            log.warn("Object removal failed. objectName: {}, error: {}", objectName, exception.getMessage());
        }
    }

    /**
     * 构建公开访问 URL：优先使用 CDN 域名，否则使用 MinIO 公开 URL。
     */
    private String buildPublicUrl(String objectName) {
        String baseUrl = (cdnUrl != null) ? cdnUrl : publicUrl;
        return baseUrl + "/" + bucketName + "/" + objectName;
    }

    /**
     * 根据原图 URL 推导缩略图 URL。
     * 约定：published/xxx.jpg -> thumbnails/xxx.jpg
     */
    public String getThumbnailUrl(String imageUrl) {
        if (imageUrl == null) return null;
        return imageUrl.replace("/published/", "/thumbnails/");
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.FILE_TYPE_INVALID, "请选择非空图片文件");
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BusinessException(ErrorCode.FILE_TOO_LARGE);
        }
    }

    private PreparedImage prepareImage(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String detectedType = detectImageType(bytes);
            if (detectedType == null
                    || !detectedType.equalsIgnoreCase(file.getContentType())
                    || !hasMatchingExtension(file.getOriginalFilename(), detectedType)) {
                throw new BusinessException(ErrorCode.FILE_TYPE_INVALID);
            }
            if (WEBP.equals(detectedType)) {
                validateWebpContainer(bytes);
                return new PreparedImage(bytes, detectedType, "webp");
            }
            return decodeAndSanitize(bytes, detectedType);
        } catch (IOException exception) {
            throw new BusinessException(ErrorCode.FILE_TYPE_INVALID, "图片损坏或无法解析");
        }
    }

    private PreparedImage decodeAndSanitize(byte[] bytes, String contentType) throws IOException {
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
        if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0
                || (long) image.getWidth() * image.getHeight() > MAX_IMAGE_PIXELS) {
            throw new BusinessException(ErrorCode.FILE_TYPE_INVALID, "图片损坏或尺寸过大");
        }
        String format = JPEG.equals(contentType) ? "jpg" : "png";
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (!ImageIO.write(image, format, output)) {
                throw new BusinessException(ErrorCode.FILE_TYPE_INVALID);
            }
            return new PreparedImage(output.toByteArray(), contentType, format);
        }
    }

    private void validateWebpContainer(byte[] bytes) {
        if (bytes.length < 20) {
            throw new BusinessException(ErrorCode.FILE_TYPE_INVALID);
        }
        long declaredSize = Integer.toUnsignedLong(
                (bytes[4] & 0xFF) | ((bytes[5] & 0xFF) << 8)
                        | ((bytes[6] & 0xFF) << 16) | ((bytes[7] & 0xFF) << 24));
        String chunk = new String(bytes, 12, 4, java.nio.charset.StandardCharsets.US_ASCII);
        if (declaredSize + 8 > bytes.length
                || !("VP8 ".equals(chunk) || "VP8L".equals(chunk) || "VP8X".equals(chunk))) {
            throw new BusinessException(ErrorCode.FILE_TYPE_INVALID);
        }
    }

    private String detectImageType(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return JPEG;
        }
        if (bytes.length >= 8 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50
                && bytes[2] == 0x4E && bytes[3] == 0x47 && bytes[4] == 0x0D
                && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A) {
            return PNG;
        }
        if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I'
                && bytes[2] == 'F' && bytes[3] == 'F' && bytes[8] == 'W'
                && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return WEBP;
        }
        return null;
    }

    private boolean hasMatchingExtension(String filename, String contentType) {
        if (filename == null || !filename.contains(".")) {
            return false;
        }
        String extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        return (JPEG.equals(contentType) && ("jpg".equals(extension) || "jpeg".equals(extension)))
                || (PNG.equals(contentType) && "png".equals(extension))
                || (WEBP.equals(contentType) && "webp".equals(extension));
    }

    private String buildObjectName(Long userId, String extension) {
        LocalDate today = LocalDate.now();
        return "pending/" + userId + "/" + today.getYear() + "/" + today.getMonthValue()
                + "/" + UUID.randomUUID() + "." + extension;
    }

    private record PreparedImage(byte[] bytes, String contentType, String extension) {}
}
