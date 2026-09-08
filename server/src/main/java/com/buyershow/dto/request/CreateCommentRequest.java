package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCommentRequest {
    @NotBlank(message = "评论内容不能为空")
    @Size(max = 1000, message = "评论最多1000字符")
    private String content;

    /** 父评论ID，null表示顶级评论 */
    private Long parentId;
}
