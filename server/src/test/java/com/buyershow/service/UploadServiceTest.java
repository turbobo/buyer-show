package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.entity.User;
import io.minio.MinioClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UploadServiceTest {

    private final MinioClient minioClient = mock(MinioClient.class);
    private final UploadService uploadService = new UploadService(
            minioClient, "http://localhost:9000", "buyershow-images");

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testUploadImageRejectsEmptyFile() {
        authenticateUser();
        MockMultipartFile file = new MockMultipartFile("file", "empty.png", "image/png", new byte[0]);
        BusinessException exception = assertThrows(BusinessException.class, () -> uploadService.uploadImage(file));
        assertEquals(ErrorCode.FILE_TYPE_INVALID.getCode(), exception.getCode());
    }

    @Test
    void testUploadImageRejectsOversizedFile() {
        authenticateUser();
        MockMultipartFile file = new MockMultipartFile("file", "large.png", "image/png",
                new byte[10 * 1024 * 1024 + 1]);
        BusinessException exception = assertThrows(BusinessException.class, () -> uploadService.uploadImage(file));
        assertEquals(ErrorCode.FILE_TOO_LARGE.getCode(), exception.getCode());
    }

    @Test
    void testUploadImageRejectsTruncatedPng() {
        authenticateUser();
        byte[] headerOnly = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        MockMultipartFile file = new MockMultipartFile("file", "truncated.png", "image/png", headerOnly);
        BusinessException exception = assertThrows(BusinessException.class, () -> uploadService.uploadImage(file));
        assertEquals(ErrorCode.FILE_TYPE_INVALID.getCode(), exception.getCode());
    }

    @Test
    void testUploadImageMapsStorageFailure() throws Exception {
        authenticateUser();
        MockMultipartFile file = validPng();
        when(minioClient.putObject(any())).thenThrow(new RuntimeException("MinIO unavailable"));
        BusinessException exception = assertThrows(BusinessException.class, () -> uploadService.uploadImage(file));
        assertEquals(ErrorCode.FILE_UPLOAD_FAILED.getCode(), exception.getCode());
    }

    @Test
    void testUploadImageStoresPrivatePendingObject() throws Exception {
        authenticateUser();
        var response = uploadService.uploadImage(validPng());

        assertEquals("image/png", response.getContentType());
        assertTrue(response.getObjectName().startsWith("pending/100/"));
        assertNull(response.getUrl());
        verify(minioClient).putObject(any());
    }

    private MockMultipartFile validPng() throws Exception {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", output);
            return new MockMultipartFile("file", "product.png", "image/png", output.toByteArray());
        }
    }

    private void authenticateUser() {
        User user = new User();
        user.setId(100L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
    }
}
