package com.buyershow.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 帖子查询内部行模型。JSON 字段先按字符串接收，由组装器统一反序列化。
 */
@Data
public class PostQueryRow {
    private Long id;
    private Long userId;
    private String title;
    private String content;
    private String imagesJson;
    private String tagsJson;
    private String productName;
    private BigDecimal productPrice;
    private String productSource;
    private Integer productRating;
    private Integer likeCount;
    private Integer commentCount;
    private Integer favoriteCount;
    private Integer liked;
    private Integer favorited;
    private LocalDateTime createdAt;
    private String userNickname;
    private String userAvatarUrl;
}
