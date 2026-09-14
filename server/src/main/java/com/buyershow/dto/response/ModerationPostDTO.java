package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 管理端帖子审核 DTO。
 */
@Data
@Builder
public class ModerationPostDTO {
    private Long id;
    private Long userId;
    private String userNickname;
    private String title;
    private String content;
    private List<String> images;
    private List<String> tags;
    private String productName;
    private BigDecimal productPrice;
    private String productSource;
    private Integer productRating;
    private Integer likeCount;
    private Integer commentCount;
    private Integer favoriteCount;
    private Integer status;
    private Integer moderationStatus;
    private String moderationReason;
    private LocalDateTime createdAt;
}
