package com.buyershow.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.buyershow.common.CommentStatus;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.PostStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.common.util.CursorUtils;
import com.buyershow.dto.request.CreateCommentRequest;
import com.buyershow.dto.response.CommentDTO;
import com.buyershow.dto.response.CommentLikeResult;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.UserCommentRow;
import com.buyershow.entity.Comment;
import com.buyershow.entity.CommentLike;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import com.buyershow.mapper.CommentLikeMapper;
import com.buyershow.mapper.CommentMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CommentService {

    private static final int DEFAULT_ROOT_LIMIT = 50;
    private static final int MAX_ROOT_LIMIT = 100;

    private final CommentMapper commentMapper;
    private final CommentLikeMapper commentLikeMapper;
    private final PostMapper postMapper;
    private final UserMapper userMapper;
    private final ContentModerationService contentModerationService;
    private final NotificationService notificationService;

    public List<CommentDTO> listComments(Long postId, int requestedLimit) {
        return listComments(postId, requestedLimit, "latest");
    }

    /**
     * 按排序方式查询顶级评论与一级回复（树形组装）。
     *
     * @param postId 帖子ID
     * @param requestedLimit 顶级评论数量上限
     * @param sort 排序方式（latest 最新 / hot 最热）
     * @return 树形评论列表
     */
    public List<CommentDTO> listComments(Long postId, int requestedLimit, String sort) {
        requireVisiblePost(postId);
        int limit = Math.min(Math.max(requestedLimit, 1), MAX_ROOT_LIMIT);
        Long viewerId = SecurityUtils.getCurrentUserId();
        boolean hot = "hot".equalsIgnoreCase(sort);
        List<CommentDTO> roots = hot
                ? commentMapper.selectHotVisibleRoots(postId, viewerId, limit)
                : commentMapper.selectVisibleRoots(postId, viewerId, limit);
        if (roots.isEmpty()) {
            return roots;
        }

        Map<Long, CommentDTO> rootMap = new LinkedHashMap<>();
        for (CommentDTO root : roots) {
            root.setReplies(new ArrayList<>());
            rootMap.put(root.getId(), root);
        }
        List<CommentDTO> replies = commentMapper.selectVisibleReplies(new ArrayList<>(rootMap.keySet()), viewerId);
        for (CommentDTO reply : replies) {
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

    /**
     * 查询当前用户的评论（含待审/未通过状态，仅本人可见，游标分页）。
     *
     * @param cursor 游标（上一页最后一条评论ID的编码）
     * @param requestedLimit 每页数量
     * @return 评论游标页
     */
    public CursorPage<UserCommentRow> listMyComments(String cursor, int requestedLimit) {
        Long userId = requireCurrentUserId();
        int limit = Math.min(Math.max(requestedLimit, 1), MAX_ROOT_LIMIT);
        Long cursorId = CursorUtils.decode(cursor);
        List<UserCommentRow> rows = commentMapper.selectUserComments(userId, cursorId, limit + 1);

        boolean hasMore = rows.size() > limit;
        List<UserCommentRow> visible = hasMore ? rows.subList(0, limit) : rows;
        String nextCursor = null;
        if (hasMore && !visible.isEmpty()) {
            nextCursor = CursorUtils.encode(visible.get(visible.size() - 1).getId());
        }

        return CursorPage.<UserCommentRow>builder()
                .list(visible)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .build();
    }

    /**
     * 点赞/取消点赞评论（幂等切换），返回最新状态与计数。
     *
     * @param commentId 评论ID
     * @return 点赞结果
     */
    @Transactional
    public CommentLikeResult toggleCommentLike(Long commentId) {
        Long userId = requireCurrentUserId();
        Comment comment = commentMapper.selectById(commentId);
        if (comment == null || comment.getStatus() != CommentStatus.ACTIVE.getValue()
                || comment.getModerationStatus() != ModerationStatus.APPROVED.getValue()) {
            throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND);
        }
        CommentLike existing = commentLikeMapper.selectOne(
                Wrappers.<CommentLike>lambdaQuery()
                        .eq(CommentLike::getCommentId, commentId)
                        .eq(CommentLike::getUserId, userId));
        boolean liked;
        if (existing != null) {
            commentLikeMapper.deleteById(existing.getId());
            commentMapper.adjustCommentLikeCount(commentId, -1);
            liked = false;
        } else {
            CommentLike like = new CommentLike();
            like.setCommentId(commentId);
            like.setUserId(userId);
            try {
                commentLikeMapper.insert(like);
                commentMapper.adjustCommentLikeCount(commentId, 1);
            } catch (DuplicateKeyException exception) {
                // 并发重复点赞：幂等处理，不重复计数
            }
            liked = true;
        }
        Comment updated = commentMapper.selectById(commentId);
        int likeCount = updated != null && updated.getLikeCount() != null ? updated.getLikeCount() : 0;
        return new CommentLikeResult(liked, likeCount);
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
        comment.setStatus(CommentStatus.ACTIVE.getValue());
        comment.setModerationStatus(decision.getStatus().getValue());
        comment.setModerationReason(decision.getReason());
        commentMapper.insert(comment);

        if (decision.getStatus() == ModerationStatus.APPROVED) {
            commentMapper.adjustPostCommentCount(postId, 1);
            if (parent != null) {
                commentMapper.adjustReplyCount(parent.getId(), 1);
            }
            // 发送评论通知
            Post post = postMapper.selectById(postId);
            if (post != null) {
                notificationService.notifyComment(post.getUserId(), userId, postId, request.getContent());
            }
        }
        return toCreatedComment(comment, userMapper.selectById(userId));
    }

    @Transactional
    public void deleteComment(Long commentId) {
        Long userId = requireCurrentUserId();
        Comment comment = commentMapper.selectById(commentId);
        if (comment == null || comment.getStatus() == CommentStatus.DELETED.getValue()) {
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
        if (comment.getModerationStatus() == ModerationStatus.APPROVED.getValue()) {
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
        if (parent == null || parent.getStatus() != CommentStatus.ACTIVE.getValue()
                || parent.getModerationStatus() != ModerationStatus.APPROVED.getValue()
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
        if (post == null || post.getStatus() != PostStatus.PUBLIC.getValue()
                || post.getModerationStatus() != ModerationStatus.APPROVED.getValue()) {
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
