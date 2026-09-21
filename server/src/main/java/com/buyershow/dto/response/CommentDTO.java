package com.buyershow.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentDTO {
    private Long id;
    private Long postId;
    private Long userId;
    private Long parentId;

    /** 被回复评论ID（G8）：NULL=直接回复楼主 */
    private Long replyToId;

    /** 被回复人昵称（G8）：由查询 LEFT JOIN 组装，供前端展示「回复 @昵称」 */
    private String replyToNickname;

    private String content;
    private Integer replyCount;
    private Integer likeCount;
    private Integer moderationStatus;
    private Boolean isLiked;
    private Boolean isFavorited;
    private LocalDateTime editedAt;
    private LocalDateTime createdAt;
    private String userNickname;
    private String userAvatarUrl;
    private List<CommentDTO> replies;
}
