package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreatePostRequest {
    @NotBlank(message = "标题不能为空")
    @Size(max = 200, message = "标题最多200字符")
    private String title;

    @NotBlank(message = "正文不能为空")
    @Size(min = 10, max = 5000, message = "正文10-5000字符")
    private String content;

    @NotEmpty(message = "至少需要一张图片")
    private List<String> images;

    private List<String> tags;
    private String productName;
    private BigDecimal productPrice;
    private String productSource;
    private Integer productRating;
}
