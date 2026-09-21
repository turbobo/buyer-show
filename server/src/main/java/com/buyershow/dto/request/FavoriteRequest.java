package com.buyershow.dto.request;

import lombok.Data;

/**
 * 收藏帖子请求（G7）：folderId 为空表示收藏到默认收藏夹。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class FavoriteRequest {
    /** 目标收藏夹 ID；null 表示默认收藏夹。 */
    private Long folderId;
}
