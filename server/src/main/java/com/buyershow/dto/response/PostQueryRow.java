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
    private Integer moderationStatus;
    private Integer liked;
    private Integer favorited;
    private LocalDateTime createdAt;
    private String userNickname;
    private String userAvatarUrl;
    /** 关系表游标键（收藏/点赞列表按关系表 ID 排序时使用；为空时游标取帖子 ID） */
    private Long cursorKey;
    /** 最近一次申诉状态（仅"我的帖子"列表返回；0 待处理 / 1 已通过 / 2 已驳回） */
    private Integer appealStatus;
}
