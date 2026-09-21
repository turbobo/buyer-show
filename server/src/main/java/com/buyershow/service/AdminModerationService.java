package com.buyershow.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.PostStatus;
import com.buyershow.common.CommentStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.common.search.PostIndexEvents;
import com.buyershow.dto.request.HandleReportRequest;
import com.buyershow.dto.request.ModerateContentRequest;
import com.buyershow.dto.response.ModerationCommentDTO;
import com.buyershow.dto.response.ModerationPostDTO;
import com.buyershow.dto.response.ReportDTO;
import com.buyershow.entity.Comment;
import com.buyershow.entity.ContentReport;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import lombok.extern.slf4j.Slf4j;
import com.buyershow.mapper.CommentMapper;
import com.buyershow.mapper.ContentReportMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminModerationService {

    private static final int REPORT_ACCEPTED = 1;
    private static final int REPORT_DISMISSED = 2;
    private static final String REPORT_REJECT_REASON = "举报核实后已下架";

    private final PostMapper postMapper;
    private final CommentMapper commentMapper;
    private final ContentReportMapper contentReportMapper;
    private final UserMapper userMapper;
    private final UploadService uploadService;
    private final NotificationService notificationService;
    private final AdminUserService adminUserService;
    private final AdminAuditService adminAuditService;
    private final ApplicationEventPublisher eventPublisher;

    public IPage<ModerationPostDTO> listPendingPosts(long page, long size) {
        requireAdminId();
        IPage<Post> entityPage = postMapper.selectPage(page(page, size), Wrappers.<Post>lambdaQuery()
                .eq(Post::getStatus, PostStatus.PUBLIC.getValue())
                .eq(Post::getModerationStatus, ModerationStatus.PENDING.getValue())
                .orderByAsc(Post::getCreatedAt, Post::getId));
        return entityPage.convert(this::toModerationPostDTO);
    }

    public IPage<ModerationCommentDTO> listPendingComments(long page, long size) {
        requireAdminId();
        IPage<Comment> entityPage = commentMapper.selectPage(page(page, size), Wrappers.<Comment>lambdaQuery()
                .eq(Comment::getStatus, CommentStatus.ACTIVE.getValue())
                .eq(Comment::getModerationStatus, ModerationStatus.PENDING.getValue())
                .orderByAsc(Comment::getCreatedAt, Comment::getId));
        return entityPage.convert(this::toModerationCommentDTO);
    }

    public IPage<ReportDTO> listPendingReports(long page, long size) {
        requireAdminId();
        IPage<ContentReport> entityPage = contentReportMapper.selectPage(page(page, size), Wrappers.<ContentReport>lambdaQuery()
                .eq(ContentReport::getStatus, ContentReportService.STATUS_PENDING)
                .orderByAsc(ContentReport::getCreatedAt, ContentReport::getId));
        return entityPage.convert(this::toReportDTO);
    }

    /**
     * 待办计数（待审帖子/评论/举报），用于后台看板。
     *
     * @return 三类待办数量
     */
    public Map<String, Long> pendingCounts() {
        requireAdminId();
        long pendingPosts = postMapper.selectCount(Wrappers.<Post>lambdaQuery()
                .eq(Post::getStatus, PostStatus.PUBLIC.getValue())
                .eq(Post::getModerationStatus, ModerationStatus.PENDING.getValue()));
        long pendingComments = commentMapper.selectCount(Wrappers.<Comment>lambdaQuery()
                .eq(Comment::getStatus, CommentStatus.ACTIVE.getValue())
                .eq(Comment::getModerationStatus, ModerationStatus.PENDING.getValue()));
        long pendingReports = contentReportMapper.selectCount(Wrappers.<ContentReport>lambdaQuery()
                .eq(ContentReport::getStatus, ContentReportService.STATUS_PENDING));
        return Map.of(
                "pendingPosts", pendingPosts,
                "pendingComments", pendingComments,
                "pendingReports", pendingReports);
    }

    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    public void moderatePost(Long postId, ModerateContentRequest request) {
        Long adminId = requireAdminId();
        int newStatus = resolveModerationStatus(request.getAction()).getValue();
        String reason = trimToNull(request.getReason());
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() != PostStatus.PUBLIC.getValue()) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        int affected = postMapper.moderatePending(postId, newStatus, reason, adminId, LocalDateTime.now());
        if (affected == 0) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_PENDING);
        }
        if (newStatus == ModerationStatus.APPROVED.getValue()) {
            Post imageUpdate = new Post();
            imageUpdate.setId(postId);
            imageUpdate.setImages(uploadService.publishPendingImages(post.getUserId(), post.getImages()));
            postMapper.updateById(imageUpdate);
            notificationService.notifySystem(post.getUserId(),
                    String.format("你的帖子「%s」已审核通过", abbreviate(post.getTitle(), 50)), "post", postId);
            // G5：审核通过同步入搜索索引（事务提交后异步，失败仅告警）
            eventPublisher.publishEvent(new PostIndexEvents.PostIndexRequested(postId));
        } else {
            uploadService.deletePendingImages(post.getUserId(), post.getImages());
            notificationService.notifySystem(post.getUserId(),
                    String.format("你的帖子「%s」未通过审核%s，如有异议可发起申诉", abbreviate(post.getTitle(), 50),
                            reason != null ? "（" + reason + "）" : ""),
                    "post", postId);
            // G5：驳回时移除索引文档（此前已公开再被驳回的帖子）
            eventPublisher.publishEvent(new PostIndexEvents.PostIndexRemoved(postId));
        }
        String auditDetail = newStatus == ModerationStatus.APPROVED.getValue()
                ? "审核通过"
                : (reason != null ? "审核驳回：" + reason : "审核驳回");
        adminAuditService.log(adminId, "MODERATE_POST", "POST", postId, auditDetail);
    }

    @Transactional
    public void moderateComment(Long commentId, ModerateContentRequest request) {
        Long adminId = requireAdminId();
        Comment comment = commentMapper.selectById(commentId);
        if (comment == null || comment.getStatus() != CommentStatus.ACTIVE.getValue()) {
            throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND);
        }

        ModerationStatus newStatus = resolveModerationStatus(request.getAction());
        if (newStatus == ModerationStatus.APPROVED && comment.getParentId() != null) {
            Comment parent = commentMapper.selectById(comment.getParentId());
            if (parent == null || parent.getStatus() != CommentStatus.ACTIVE.getValue()
                    || parent.getModerationStatus() != ModerationStatus.APPROVED.getValue()) {
                throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "父评论不可见，无法通过该回复");
            }
        }

        int affected = commentMapper.moderatePending(
                commentId, newStatus.getValue(), trimToNull(request.getReason()), adminId, LocalDateTime.now());
        if (affected == 0) {
            throw new BusinessException(ErrorCode.CONTENT_NOT_PENDING);
        }
        String reason = trimToNull(request.getReason());
        if (newStatus == ModerationStatus.APPROVED) {
            commentMapper.adjustPostCommentCount(comment.getPostId(), 1);
            if (comment.getParentId() != null) {
                commentMapper.adjustReplyCount(comment.getParentId(), 1);
            }
            notificationService.notifySystem(comment.getUserId(), "你的评论已审核通过", "post", comment.getPostId());
        } else {
            notificationService.notifySystem(comment.getUserId(),
                    String.format("你的评论未通过审核%s", reason != null ? "（" + reason + "）" : ""),
                    "post", comment.getPostId());
        }
        String auditDetail = newStatus == ModerationStatus.APPROVED
                ? "审核通过"
                : (reason != null ? "审核驳回：" + reason : "审核驳回");
        adminAuditService.log(adminId, "MODERATE_COMMENT", "COMMENT", commentId, auditDetail);
    }

    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
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
            if (Boolean.TRUE.equals(request.getBanAuthor())) {
                banReportedAuthor(report);
            }
        }
        adminAuditService.log(adminId, "HANDLE_REPORT", "REPORT", reportId,
                (accepted ? "采纳并下架" : "驳回举报")
                        + (accepted && Boolean.TRUE.equals(request.getBanAuthor()) ? "，并封禁作者" : ""));
    }

    /**
     * 采纳举报时联动封禁内容作者（作者为管理员/自己等不可封禁场景静默跳过，不阻断举报处置）。
     */
    private void banReportedAuthor(ContentReport report) {
        Long authorId;
        if (report.getContentType() == ContentReportService.TYPE_POST) {
            Post post = postMapper.selectById(report.getContentId());
            authorId = post != null ? post.getUserId() : null;
        } else {
            Comment comment = commentMapper.selectById(report.getContentId());
            authorId = comment != null ? comment.getUserId() : null;
        }
        if (authorId == null) {
            return;
        }
        try {
            adminUserService.banUser(authorId, REPORT_REJECT_REASON);
        } catch (BusinessException exception) {
            log.warn("Ban reported author skipped. authorId: {}, reason: {}", authorId, exception.getMessage());
        }
    }

    private void rejectReportedContent(ContentReport report, Long adminId) {
        LocalDateTime now = LocalDateTime.now();
        if (report.getContentType() == ContentReportService.TYPE_POST) {
            postMapper.rejectApproved(report.getContentId(), REPORT_REJECT_REASON, adminId, now);
            // G5：下架同步移除索引文档（事务提交后异步，失败仅告警）
            eventPublisher.publishEvent(new PostIndexEvents.PostIndexRemoved(report.getContentId()));
            return;
        }

        Comment comment = commentMapper.selectById(report.getContentId());
        if (comment == null || comment.getStatus() != CommentStatus.ACTIVE.getValue()
                || comment.getModerationStatus() != ModerationStatus.APPROVED.getValue()) {
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

    private ModerationPostDTO toModerationPostDTO(Post post) {
        User user = userMapper.selectById(post.getUserId());
        return ModerationPostDTO.builder()
                .id(post.getId())
                .userId(post.getUserId())
                .userNickname(user != null ? user.getNickname() : null)
                .title(post.getTitle())
                .content(post.getContent())
                .images(post.getImages())
                .tags(post.getTags())
                .productName(post.getProductName())
                .productPrice(post.getProductPrice())
                .productSource(post.getProductSource())
                .productRating(post.getProductRating())
                .productLink(post.getProductLink())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .favoriteCount(post.getFavoriteCount())
                .status(post.getStatus())
                .moderationStatus(post.getModerationStatus())
                .moderationReason(post.getModerationReason())
                .createdAt(post.getCreatedAt())
                .build();
    }

    private ModerationCommentDTO toModerationCommentDTO(Comment comment) {
        User user = userMapper.selectById(comment.getUserId());
        return ModerationCommentDTO.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .userId(comment.getUserId())
                .userNickname(user != null ? user.getNickname() : null)
                .parentId(comment.getParentId())
                .content(comment.getContent())
                .replyCount(comment.getReplyCount())
                .likeCount(comment.getLikeCount())
                .status(comment.getStatus())
                .moderationStatus(comment.getModerationStatus())
                .moderationReason(comment.getModerationReason())
                .createdAt(comment.getCreatedAt())
                .build();
    }

    private ReportDTO toReportDTO(ContentReport report) {
        User reporter = userMapper.selectById(report.getReporterId());
        String contentTypeStr = report.getContentType() == ContentReportService.TYPE_POST ? "POST" : "COMMENT";
        String postTitle = null;
        String commentContent = null;
        if (report.getContentType() == ContentReportService.TYPE_POST) {
            Post post = postMapper.selectById(report.getContentId());
            postTitle = post != null ? post.getTitle() : null;
        } else {
            Comment comment = commentMapper.selectById(report.getContentId());
            commentContent = comment != null ? comment.getContent() : null;
        }
        return ReportDTO.builder()
                .id(report.getId())
                .contentType(contentTypeStr)
                .contentId(report.getContentId())
                .reporterId(report.getReporterId())
                .reporterNickname(reporter != null ? reporter.getNickname() : null)
                .reason(report.getReason())
                .postTitle(postTitle)
                .commentContent(commentContent)
                .status(report.getStatus())
                .handledBy(report.getHandledBy())
                .createdAt(report.getCreatedAt())
                .handledAt(report.getHandledAt())
                .build();
    }

    private <T> Page<T> page(long requestedPage, long requestedSize) {
        long safePage = Math.max(requestedPage, 1);
        long safeSize = Math.min(Math.max(requestedSize, 1), 100);
        return new Page<>(safePage, safeSize);
    }

    private ModerationStatus resolveModerationStatus(String action) {
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

    private String abbreviate(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength) + "…";
    }
}
