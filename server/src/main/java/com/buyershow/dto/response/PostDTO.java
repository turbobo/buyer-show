package com.buyershow.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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

    /** 正文 @提及的昵称到用户映射（G4；仅详情接口实时解析返回，供前端高亮跳转）。 */
    private List<MentionDTO> mentions;

    /** ES 搜索高亮片段（G5；字段名 -> 含 <em> 标记的 HTML 片段，仅搜索接口返回，前端拆分渲染）。 */
    private Map<String, String> highlights;
}
