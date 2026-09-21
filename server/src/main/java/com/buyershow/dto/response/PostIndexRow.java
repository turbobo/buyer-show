package com.buyershow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 帖子搜索索引行（G5 ES 索引同步与重建用，仅含检索所需字段）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class PostIndexRow {
    private Long id;
    private String title;
    private String content;
    /** 标签 JSON 数组字符串（与 PostQueryRow 口径一致，由 PostAssembler 解析）。 */
    private String tagsJson;
    private String productName;
    private Long userId;
    private String userNickname;
    private Integer userStatus;
    private Long likeCount;
    private LocalDateTime createdAt;
}
