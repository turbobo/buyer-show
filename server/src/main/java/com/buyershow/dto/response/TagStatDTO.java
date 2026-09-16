package com.buyershow.dto.response;

import lombok.Data;

/**
 * 标签聚合统计行。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
public class TagStatDTO {
    private String tag;
    private Long postCount;
}
