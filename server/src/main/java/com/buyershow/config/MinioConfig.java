package com.buyershow.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MinIO 客户端配置。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@Configuration
public class MinioConfig {

    /**
     * 创建 S3 兼容的 MinIO 客户端。
     *
     * @param endpoint  MinIO 服务地址
     * @param accessKey 访问密钥
     * @param secretKey 密钥
     * @return MinIO 客户端
     */
    @Bean
    public MinioClient minioClient(
            @Value("${minio.endpoint}") String endpoint,
            @Value("${minio.access-key}") String accessKey,
            @Value("${minio.secret-key}") String secretKey) {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}
