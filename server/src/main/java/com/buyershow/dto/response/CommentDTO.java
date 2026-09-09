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
    private String content;
    private Integer replyCount;
    private Integer likeCount;
    private Integer moderationStatus;
    private Boolean isLiked;
    private LocalDateTime createdAt;
    private String userNickname;
    private String userAvatarUrl;
    private List<CommentDTO> replies;
}
