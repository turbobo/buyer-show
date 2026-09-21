package com.buyershow.dto.response;

import lombok.Data;

/**
 * 收藏夹条目（G7）：含收藏帖子数。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class FavoriteFolderDTO {
    private Long id;
    private String name;
    private Long postCount;
}
