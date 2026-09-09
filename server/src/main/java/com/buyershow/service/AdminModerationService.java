package com.buyershow.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.request.HandleReportRequest;
import com.buyershow.dto.request.ModerateContentRequest;
import com.buyershow.entity.Comment;
import com.buyershow.entity.ContentReport;
import com.buyershow.entity.Post;
import com.buyershow.mapper.CommentMapper;
import com.buyershow.mapper.ContentReportMapper;
import com.buyershow.mapper.PostMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminModerationService {

    private static final int REPORT_ACCEPTED = 1;
    private static final int REPORT_DISMISSED = 2;
    private static final String REPORT_REJECT_REASON = "举报核实后已下架";

    private final PostMapper postMapper;
    private final CommentMapper commentMapper;
    private final ContentReportMapper contentReportMapper;
    private final UploadService uploadService;

    public IPage<Post> listPendingPosts(long page, long size) {
        requireAdminId();
        return postMapper.selectPage(page(page, size), Wrappers.<Post>lambdaQuery()
                .eq(Post::getStatus, 0)
                .eq(Post::getModerationStatus, ModerationStatus.PENDING)
                .orderByAsc(Post::getCreatedAt, Post::getId));
    }

    public IPage<Comment> listPendingComments(long page, long size) {
        requireAdminId();
        return commentMapper.selectPage(page(page, size), Wrappers.<Comment>lambdaQuery()
                .eq(Comment::getStatus, 0)
                .eq(Comment::getModerationStatus, ModerationStatus.PENDING)
                .orderByAsc(Comment::getCreatedAt, Comment::getId));
    }

    public IPage<ContentReport> listPendingReports(long page, long size) {
        requireAdminId();
        return contentReportMapper.selectPage(page(page, size), Wrappers.<ContentReport>lambdaQuery()
                .eq(ContentReport::getStatus, ContentReportService.STATUS_PENDING)
                .orderByAsc(ContentReport::getCreatedAt, ContentReport::getId));
    }

    @Transactional
    public void moderatePost(Long postId, ModerateContentRequest request) {
        Long adminId = requireAdminId();
        int newStatus = resolveModerationStatus(request.getAction());
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() != 0) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        int affected = postMapper.moderatePending(
                postId, newStatus, trimToNull(request.getReason()), adminId, LocalDateTime.now());
        if (affected == 0) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_PENDING);
        }
        if (newStatus == ModerationStatus.APPROVED) {
            Post imageUpdate = new Post();
            imageUpdate.setId(postId);
            imageUpdate.setImages(uploadService.publishImages(post.getUserId(), post.getImages()));
            postMapper.updateById(imageUpdate);
        } else {
            uploadService.deletePendingImages(post.getUserId(), post.getImages());
        }
    }

    @Transactional
    public void moderateComment(Long commentId, ModerateContentRequest request) {
        Long adminId = requireAdminId();
        Comment comment = commentMapper.selectById(commentId);
        if (comment == null || comment.getStatus() != 0) {
            throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND);
        }

        int newStatus = resolveModerationStatus(request.getAction());
        if (newStatus == ModerationStatus.APPROVED && comment.getParentId() != null) {
            Comment parent = commentMapper.selectById(comment.getParentId());
            if (parent == null || parent.getStatus() != 0
                    || parent.getModerationStatus() != ModerationStatus.APPROVED) {
                throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "父评论不可见，无法通过该回复");
            }
        }

        int affected = commentMapper.moderatePending(
                commentId, newStatus, trimToNull(request.getReason()), adminId, LocalDateTime.now());
        if (affected == 0) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_PENDING);
        }
        if (newStatus == ModerationStatus.APPROVED) {
            commentMapper.adjustPostCommentCount(comment.getPostId(), 1);
            if (comment.getParentId() != null) {
                commentMapper.adjustReplyCount(comment.getParentId(), 1);
            }
        }
    }

    @Transactional
    public void handleReport(Long reportId, HandleReportRequest request) {
        Long adminId = requireAdminId();
        ContentReport report = contentReportMapper.selectById(reportId);
        if (report == null) {
            throw new BusinessException(ErrorCode.REPORT_NOT_FOUND);
        }

        boolean accepted = "ACCEPT".equals(request.getAction());
        int affected = contentReportMapper.handlePending(
                reportId, accepted ? REPORT_ACCEPTED : REPORT_DISMISSED, adminId, LocalDateTime.now());
        if (affected == 0) {
            throw new BusinessException(ErrorCode.REPORT_ALREADY_HANDLED);
        }
        if (accepted) {
            rejectReportedContent(report, adminId);
        }
    }

    private void rejectReportedContent(ContentReport report, Long adminId) {
        LocalDateTime now = LocalDateTime.now();
        if (report.getContentType() == ContentReportService.TYPE_POST) {
            postMapper.rejectApproved(report.getContentId(), REPORT_REJECT_REASON, adminId, now);
            return;
        }

        Comment comment = commentMapper.selectById(report.getContentId());
        if (comment == null || comment.getStatus() != 0
                || comment.getModerationStatus() != ModerationStatus.APPROVED) {
            return;
        }
        if (comment.getParentId() == null) {
            int approvedCount = commentMapper.countApprovedThread(comment.getId());
            int changed = commentMapper.rejectApprovedThread(
                    comment.getId(), REPORT_REJECT_REASON, adminId, now);
            if (changed > 0 && approvedCount > 0) {
                commentMapper.adjustPostCommentCount(comment.getPostId(), -approvedCount);
            }
            return;
        }

        int changed = commentMapper.rejectApprovedThread(
                comment.getId(), REPORT_REJECT_REASON, adminId, now);
        if (changed > 0) {
            commentMapper.adjustPostCommentCount(comment.getPostId(), -1);
            commentMapper.adjustReplyCount(comment.getParentId(), -1);
        }
    }

    private <T> Page<T> page(long requestedPage, long requestedSize) {
        long safePage = Math.max(requestedPage, 1);
        long safeSize = Math.min(Math.max(requestedSize, 1), 100);
        return new Page<>(safePage, safeSize);
    }

    private int resolveModerationStatus(String action) {
        return "APPROVE".equals(action) ? ModerationStatus.APPROVED : ModerationStatus.REJECTED;
    }

    private Long requireAdminId() {
        if (!SecurityUtils.isAdmin()) {
            throw new BusinessException(ErrorCode.NO_PERMISSION);
        }
        return SecurityUtils.getCurrentUserId();
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
