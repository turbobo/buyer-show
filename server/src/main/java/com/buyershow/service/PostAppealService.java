package com.buyershow.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.PostStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.response.AppealDTO;
import com.buyershow.entity.Post;
import com.buyershow.entity.PostAppeal;
import com.buyershow.entity.User;
import com.buyershow.mapper.PostAppealMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 帖子申诉服务：作者对已下架（驳回/封禁）帖子发起申诉，管理员审批（通过则解封）。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PostAppealService {

    /** 申诉状态：0 待处理 / 1 已通过 / 2 已驳回 */
    public static final int STATUS_PENDING = 0;
    private static final int STATUS_APPROVED = 1;
    private static final int STATUS_REJECTED = 2;

    private final PostAppealMapper postAppealMapper;
    private final PostMapper postMapper;
    private final UserMapper userMapper;
    private final NotificationService notificationService;

    /**
     * 发起申诉：仅帖子作者、帖子处于已下架状态（驳回/封禁）、且无待处理申诉时可提交。
     *
     * @param postId 帖子ID
     * @param reason 申诉理由
     */
    @Transactional
    public void createAppeal(Long postId, String reason) {
        Long userId = requireCurrentUserId();
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() == PostStatus.DELETED.getValue() || !post.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        if (post.getModerationStatus() != ModerationStatus.REJECTED.getValue()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "仅已下架的帖子可发起申诉");
        }
        Long pendingCount = postAppealMapper.selectCount(Wrappers.<PostAppeal>lambdaQuery()
                .eq(PostAppeal::getPostId, postId)
                .eq(PostAppeal::getUserId, userId)
                .eq(PostAppeal::getStatus, STATUS_PENDING));
        if (pendingCount != null && pendingCount > 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "已有待处理的申诉，请等待管理员处理");
        }

        PostAppeal appeal = new PostAppeal();
        appeal.setPostId(postId);
        appeal.setUserId(userId);
        appeal.setReason(reason.trim());
        appeal.setStatus(STATUS_PENDING);
        postAppealMapper.insert(appeal);
        log.info("Post appeal created. userId: {}, postId: {}, appealId: {}", userId, postId, appeal.getId());
    }

    /**
     * 申诉列表（管理端，待处理优先）。
     *
     * @param page 页码
     * @param size 每页数量
     * @param status 状态筛选（可空）
     * @return 申诉分页
     */
    public IPage<AppealDTO> listAppeals(long page, long size, Integer status) {
        requireAdminId();
        IPage<PostAppeal> entityPage = postAppealMapper.selectPage(page(page, size),
                Wrappers.<PostAppeal>lambdaQuery()
                        .eq(status != null, PostAppeal::getStatus, status)
                        .orderByAsc(PostAppeal::getStatus)
                        .orderByDesc(PostAppeal::getId));
        return entityPage.convert(this::toAppealDTO);
    }

    /**
     * 处理申诉：通过则解封帖子；驳回保留封禁状态。并发安全（仅待处理可被处理一次）。
     *
     * @param appealId 申诉ID
     * @param action 处理动作（APPROVE / REJECT）
     * @param reason 处理说明（可空）
     */
    @Transactional
    public void handleAppeal(Long appealId, String action, String reason) {
        Long adminId = requireAdminId();
        PostAppeal appeal = postAppealMapper.selectById(appealId);
        if (appeal == null) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "申诉不存在");
        }
        boolean approved = "APPROVE".equals(action);
        String handleReason = trimToNull(reason);
        int affected = postAppealMapper.handlePending(
                appealId,
                approved ? STATUS_APPROVED : STATUS_REJECTED,
                handleReason,
                adminId,
                LocalDateTime.now());
        if (affected == 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "该申诉已被处理");
        }
        String postTitle = abbreviate(resolvePostTitle(appeal.getPostId()), 50);
        if (approved) {
            postMapper.approveRejected(appeal.getPostId(), adminId, LocalDateTime.now());
            notificationService.notifySystem(appeal.getUserId(),
                    String.format("你的申诉已通过，「%s」已恢复公开", postTitle), "post", appeal.getPostId());
        } else {
            notificationService.notifySystem(appeal.getUserId(),
                    String.format("你的申诉未通过，「%s」维持下架%s", postTitle,
                            handleReason != null ? "（" + handleReason + "）" : ""),
                    "post", appeal.getPostId());
        }
        log.info("Post appeal handled. adminId: {}, appealId: {}, approved: {}, postId: {}",
                adminId, appealId, approved, appeal.getPostId());
    }

    private AppealDTO toAppealDTO(PostAppeal appeal) {
        Post post = postMapper.selectById(appeal.getPostId());
        User user = userMapper.selectById(appeal.getUserId());
        return AppealDTO.builder()
                .id(appeal.getId())
                .postId(appeal.getPostId())
                .postTitle(post != null ? post.getTitle() : null)
                .userId(appeal.getUserId())
                .userNickname(user != null ? user.getNickname() : null)
                .reason(appeal.getReason())
                .status(appeal.getStatus())
                .handleReason(appeal.getHandleReason())
                .createdAt(appeal.getCreatedAt())
                .handledAt(appeal.getHandledAt())
                .build();
    }

    private String resolvePostTitle(Long postId) {
        Post post = postMapper.selectById(postId);
        return post != null && post.getTitle() != null ? post.getTitle() : "帖子";
    }

    private String abbreviate(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength) + "…";
    }

    private <T> Page<T> page(long requestedPage, long requestedSize) {
        long safePage = Math.max(requestedPage, 1);
        long safeSize = Math.min(Math.max(requestedSize, 1), 100);
        return new Page<>(safePage, safeSize);
    }

    private Long requireCurrentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return userId;
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
