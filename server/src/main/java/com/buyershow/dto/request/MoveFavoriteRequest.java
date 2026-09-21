package com.buyershow.dto.request;

import lombok.Data;

/**
 * 移动收藏请求（G7）：folderId 为空表示移回默认收藏夹。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class MoveFavoriteRequest {
    /** 目标收藏夹 ID；null 表示默认收藏夹。 */
    private Long folderId;
}
