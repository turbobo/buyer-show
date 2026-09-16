package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 编辑评论请求（发布后 5 分钟内）。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
public class UpdateCommentRequest {

    @NotBlank(message = "评论内容不能为空")
    @Size(max = 1000, message = "评论内容最多 1000 字")
    private String content;
}
