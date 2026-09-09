package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.request.CreateCommentRequest;
import com.buyershow.dto.response.CommentDTO;
import com.buyershow.entity.Comment;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import com.buyershow.mapper.CommentMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CommentService {

    private static final int COMMENT_ACTIVE = 0;
    private static final int COMMENT_DELETED = 1;
    private static final int DEFAULT_ROOT_LIMIT = 50;
    private static final int MAX_ROOT_LIMIT = 100;

    private final CommentMapper commentMapper;
    private final PostMapper postMapper;
    private final UserMapper userMapper;
    private final ContentModerationService contentModerationService;

    /** 查询通过审核的顶级评论及其一级回复，限制顶级评论数量。 */
    public List<CommentDTO> listComments(Long postId, int requestedLimit) {
        requireVisiblePost(postId);
        int limit = Math.min(Math.max(requestedLimit, 1), MAX_ROOT_LIMIT);
        List<CommentDTO> roots = commentMapper.selectVisibleRoots(postId, limit);
        if (roots.isEmpty()) {
            return roots;
        }

        Map<Long, CommentDTO> rootMap = new LinkedHashMap<>();
        for (CommentDTO root : roots) {
            root.setIsLiked(false);
            root.setReplies(new ArrayList<>());
            rootMap.put(root.getId(), root);
        }
        List<CommentDTO> replies = commentMapper.selectVisibleReplies(new ArrayList<>(rootMap.keySet()));
        for (CommentDTO reply : replies) {
            reply.setIsLiked(false);
            reply.setReplies(new ArrayList<>());
            CommentDTO parent = rootMap.get(reply.getParentId());
            if (parent != null) {
                parent.getReplies().add(reply);
            }
        }
        return new ArrayList<>(rootMap.values());
    }

    public List<CommentDTO> listComments(Long postId) {
        return listComments(postId, DEFAULT_ROOT_LIMIT);
    }

    @Transactional
    public CommentDTO createComment(Long postId, CreateCommentRequest request) {
        Long userId = requireCurrentUserId();
        requireVisiblePost(postId);
        Comment parent = validateParent(postId, request.getParentId());
        ModerationDecision decision = contentModerationService.evaluate(request.getContent());
        if (decision.getStatus() == ModerationStatus.REJECTED) {
            throw new BusinessException(ErrorCode.CONTENT_REJECTED, decision.getReason());
        }

        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setParentId(request.getParentId());
        comment.setContent(request.getContent().trim());
        comment.setReplyCount(0);
        comment.setLikeCount(0);
        comment.setStatus(COMMENT_ACTIVE);
        comment.setModerationStatus(decision.getStatus());
        comment.setModerationReason(decision.getReason());
        commentMapper.insert(comment);

        if (decision.getStatus() == ModerationStatus.APPROVED) {
            commentMapper.adjustPostCommentCount(postId, 1);
            if (parent != null) {
                commentMapper.adjustReplyCount(parent.getId(), 1);
            }
        }
        return toCreatedComment(comment, userMapper.selectById(userId));
    }

    @Transactional
    public void deleteComment(Long commentId) {
        Long userId = requireCurrentUserId();
        Comment comment = commentMapper.selectById(commentId);
        if (comment == null || comment.getStatus() == COMMENT_DELETED) {
            throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND);
        }
        if (!SecurityUtils.isAdmin() && !userId.equals(comment.getUserId())) {
            throw new BusinessException(ErrorCode.COMMENT_NO_DELETE);
        }

        if (comment.getParentId() == null) {
            int approvedCount = commentMapper.countApprovedThread(commentId);
            int changed = commentMapper.softDeleteThread(commentId);
            if (changed == 0) {
                throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND);
            }
            if (approvedCount > 0) {
                commentMapper.adjustPostCommentCount(comment.getPostId(), -approvedCount);
            }
            return;
        }

        int changed = commentMapper.softDeleteActive(commentId);
        if (changed == 0) {
            throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND);
        }
        if (comment.getModerationStatus() == ModerationStatus.APPROVED) {
            commentMapper.adjustPostCommentCount(comment.getPostId(), -1);
            commentMapper.adjustReplyCount(comment.getParentId(), -1);
        }
    }

    private CommentDTO toCreatedComment(Comment comment, User user) {
        return CommentDTO.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .userId(comment.getUserId())
                .parentId(comment.getParentId())
                .content(comment.getContent())
                .replyCount(0)
                .likeCount(0)
                .moderationStatus(comment.getModerationStatus())
                .isLiked(false)
                .createdAt(comment.getCreatedAt())
                .userNickname(user == null ? "未知用户" : user.getNickname())
                .userAvatarUrl(user == null ? null : user.getAvatarUrl())
                .replies(new ArrayList<>())
                .build();
    }

    private Comment validateParent(Long postId, Long parentId) {
        if (parentId == null) {
            return null;
        }
        Comment parent = commentMapper.selectById(parentId);
        if (parent == null || parent.getStatus() != COMMENT_ACTIVE
                || parent.getModerationStatus() != ModerationStatus.APPROVED
                || !postId.equals(parent.getPostId())) {
            throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND);
        }
        if (parent.getParentId() != null) {
            throw new BusinessException(ErrorCode.COMMENT_REPLY_DEPTH);
        }
        return parent;
    }

    private void requireVisiblePost(Long postId) {
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() != 0
                || post.getModerationStatus() != ModerationStatus.APPROVED) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
    }

    private Long requireCurrentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return userId;
    }
}
