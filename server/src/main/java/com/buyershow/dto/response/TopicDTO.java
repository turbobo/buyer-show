package com.buyershow.dto.response;

import lombok.Data;

/**
 * 运营话题条目（G10）：含关联帖子数。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class TopicDTO {
    private Long id;
    private String name;
    private String coverUrl;
    private String description;
    private Integer sortOrder;
    private Integer status;
    /** 关联帖子数（含待审，运营侧口径）。 */
    private long postCount;
}
