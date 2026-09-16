package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PostDTO {
    private Long id;
    private Long userId;
    private String title;
    private String content;
    private List<String> images;
    private List<String> thumbnails;
    private List<String> tags;
    private String productName;
    private BigDecimal productPrice;
    private String productSource;
    private Integer productRating;
    private Integer likeCount;
    private Integer commentCount;
    private Integer favoriteCount;
    private Integer moderationStatus;
    /** 最近一次申诉状态（仅"我的帖子"列表返回；0 待处理 / 1 已通过 / 2 已驳回） */
    private Integer appealStatus;
    private Boolean isLiked;
    private Boolean isFavorited;
    private LocalDateTime createdAt;

    // User info (flattened from JOIN)
    private String userNickname;
    private String userAvatarUrl;
}
