package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCommentRequest {
    @NotBlank(message = "评论内容不能为空")
    @Size(max = 1000, message = "评论最多1000字符")
    private String content;

    /** 父评论ID（楼的根评论），null表示顶级评论；仅传 replyToId 时由服务端推导 */
    private Long parentId;

    /** 被回复评论ID（G8）：楼内回复的回复；null 表示直接回复楼主 */
    private Long replyToId;
}
