package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.response.UploadImageResponse;
import com.buyershow.service.UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 图片上传 REST 接口。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    /**
     * 上传单张 JPEG、PNG 或 WebP 图片。
     *
     * @param file 图片文件
     * @return 图片公开访问地址
     */
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public R<UploadImageResponse> uploadImage(@RequestParam("file") MultipartFile file) {
        return R.ok(uploadService.uploadImage(file));
    }

    @DeleteMapping("/image")
    public R<Void> deleteImage(@RequestParam("objectName") String objectName) {
        uploadService.deleteOwnImage(objectName);
        return R.ok();
    }
}
