package com.buyershow.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.request.CreateContentReportRequest;
import com.buyershow.entity.Comment;
import com.buyershow.entity.ContentReport;
import com.buyershow.entity.Post;
import com.buyershow.mapper.CommentMapper;
import com.buyershow.mapper.ContentReportMapper;
import com.buyershow.mapper.PostMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

/**
 * 用户内容举报服务。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@Service
@RequiredArgsConstructor
public class ContentReportService {

    public static final int TYPE_POST = 1;
    public static final int TYPE_COMMENT = 2;
    public static final int STATUS_PENDING = 0;

    private final ContentReportMapper contentReportMapper;
    private final PostMapper postMapper;
    private final CommentMapper commentMapper;

    /**
     * 创建举报并由唯一索引防止重复提交。
     *
     * @param request 举报请求
     * @return 已创建举报ID
     */
    public Long createReport(CreateContentReportRequest request) {
        Long reporterId = requireCurrentUserId();
        int contentType = resolveContentType(request.getContentType());
        ensureTargetExists(contentType, request.getContentId());

        ContentReport report = new ContentReport();
        report.setReporterId(reporterId);
        report.setContentType(contentType);
        report.setContentId(request.getContentId());
        report.setReason(request.getReason().trim());
        report.setDescription(trimToNull(request.getDescription()));
        report.setStatus(STATUS_PENDING);
        try {
            contentReportMapper.insert(report);
        } catch (DuplicateKeyException exception) {
            throw new BusinessException(ErrorCode.REPORT_DUPLICATED);
        }
        return report.getId();
    }

    private int resolveContentType(String contentType) {
        if ("POST".equals(contentType)) {
            return TYPE_POST;
        }
        if ("COMMENT".equals(contentType)) {
            return TYPE_COMMENT;
        }
        throw new BusinessException(ErrorCode.PARAM_INVALID);
    }

    private void ensureTargetExists(int contentType, Long contentId) {
        if (contentType == TYPE_POST) {
            Post post = postMapper.selectById(contentId);
            if (post == null || post.getStatus() != 0
                    || post.getModerationStatus() != com.buyershow.common.ModerationStatus.APPROVED) {
                throw new BusinessException(ErrorCode.POST_NOT_FOUND);
            }
            return;
        }

        Comment comment = commentMapper.selectById(contentId);
        if (comment == null || comment.getStatus() != 0
                || comment.getModerationStatus() != com.buyershow.common.ModerationStatus.APPROVED) {
            throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND);
        }
        Post parentPost = postMapper.selectById(comment.getPostId());
        if (parentPost == null || parentPost.getStatus() != 0
                || parentPost.getModerationStatus() != com.buyershow.common.ModerationStatus.APPROVED) {
            throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND);
        }
    }

    private Long requireCurrentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return userId;
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
