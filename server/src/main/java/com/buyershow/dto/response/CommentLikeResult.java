package com.buyershow.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 评论点赞切换结果。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
@AllArgsConstructor
public class CommentLikeResult {
    private boolean liked;
    private int likeCount;
}
