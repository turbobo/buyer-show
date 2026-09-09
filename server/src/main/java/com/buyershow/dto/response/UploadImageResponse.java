package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

/**
 * 图片上传结果。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@Data
@Builder
public class UploadImageResponse {

    private String url;
    private String objectName;
    private String contentType;
    private long size;
}
