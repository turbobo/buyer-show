package com.buyershow.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.PostStatus;
import com.buyershow.common.UserRole;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.response.AdminUserDTO;
import com.buyershow.dto.response.AdminUserPostDTO;
import com.buyershow.dto.response.ModerationPostDTO;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 管理端用户与内容管理服务：用户封禁/解封、用户帖子封禁/解封。
 * 封禁用户后其内容由公开查询的 `u.status = 0` 条件自动隐藏，解封后自动恢复。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final String DEFAULT_POST_BAN_REASON = "管理员封禁";

    private final UserMapper userMapper;
    private final PostMapper postMapper;
    private final AdminAuditService adminAuditService;

    /**
     * 用户列表（昵称/用户名模糊搜索 + 状态筛选 + 分页）。
     *
     * @param page 页码
     * @param size 每页数量
     * @param search 搜索关键词（可空）
     * @param status 状态筛选（可空：0 正常 / 1 封禁 / 2 注销）
     * @return 用户分页
     */
    public IPage<AdminUserDTO> listUsers(long page, long size, String search, Integer status) {
        requireAdminId();
        String keyword = search == null || search.isBlank() ? null : search.trim();
        IPage<User> entityPage = userMapper.selectPage(page(page, size),
                Wrappers.<User>lambdaQuery()
                        .and(keyword != null,
                                w -> w.like(User::getNickname, keyword).or().like(User::getUsername, keyword))
                        .eq(status != null, User::getStatus, status)
                        .orderByDesc(User::getId));
        return entityPage.convert(this::toUserDTO);
    }

    /**
     * 封禁用户：仅可封禁正常状态的用户；不能封禁自己，也不能封禁管理员账号。
     *
     * @param userId 目标用户ID
     * @param reason 封禁理由（可空，写入日志）
     */
    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    public void banUser(Long userId, String reason) {
        Long adminId = requireAdminId();
        User target = requireUser(userId);
        if (userId.equals(adminId)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "不能封禁自己");
        }
        if (target.getRole() != null && target.getRole() == UserRole.ADMIN.getValue()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "管理员账号不可封禁");
        }
        if (userMapper.banUser(userId) == 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "仅可封禁正常状态的用户");
        }
        adminAuditService.log(adminId, "BAN_USER", "USER", userId, trimToNull(reason));
        log.info("Admin ban user. adminId: {}, targetUserId: {}, reason: {}", adminId, userId, trimToNull(reason));
    }

    /**
     * 解封用户：仅可解封已封禁状态的用户。
     *
     * @param userId 目标用户ID
     */
    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    public void unbanUser(Long userId) {
        Long adminId = requireAdminId();
        requireUser(userId);
        if (userMapper.unbanUser(userId) == 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "仅可解封已封禁的用户");
        }
        adminAuditService.log(adminId, "UNBAN_USER", "USER", userId, null);
        log.info("Admin unban user. adminId: {}, targetUserId: {}", adminId, userId);
    }

    /**
     * 用户帖子列表（未删除的帖子，含封禁/待审状态；支持标题搜索与状态筛选）。
     *
     * @param userId 目标用户ID
     * @param page 页码
     * @param size 每页数量
     * @param search 标题关键词（可空）
     * @param moderationStatus 审核状态筛选（可空：0 公开 / 1 待审 / 2 已封禁）
     * @return 帖子分页
     */
    public IPage<AdminUserPostDTO> listUserPosts(Long userId, long page, long size,
                                                 String search, Integer moderationStatus) {
        requireAdminId();
        requireUser(userId);
        String keyword = trimToNull(search);
        IPage<Post> entityPage = postMapper.selectPage(page(page, size),
                Wrappers.<Post>lambdaQuery()
                        .eq(Post::getUserId, userId)
                        .eq(Post::getStatus, PostStatus.PUBLIC.getValue())
                        .eq(moderationStatus != null, Post::getModerationStatus, moderationStatus)
                        .like(keyword != null, Post::getTitle, keyword)
                        .orderByDesc(Post::getId));
        return entityPage.convert(this::toUserPostDTO);
    }

    /**
     * 管理端帖子详情（含封禁/待审内容，供预览与处置确认）。
     *
     * @param postId 帖子ID
     * @return 帖子详情（含完整内容与审核信息）
     */
    public ModerationPostDTO getPostDetail(Long postId) {
        requireAdminId();
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() == PostStatus.DELETED.getValue()) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        return toModerationPostDTO(post);
    }

    /**
     * 封禁帖子：仅可封禁公开中（审核通过）的帖子，封禁后立即从公开视图消失。
     *
     * @param postId 帖子ID
     * @param reason 封禁理由（可空，默认"管理员封禁"）
     */
    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    public void banPost(Long postId, String reason) {
        Long adminId = requireAdminId();
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() != PostStatus.PUBLIC.getValue()) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        String finalReason = trimToNull(reason);
        int affected = postMapper.rejectApproved(postId,
                finalReason != null ? finalReason : DEFAULT_POST_BAN_REASON, adminId, LocalDateTime.now());
        if (affected == 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "仅可封禁公开中的帖子");
        }
        adminAuditService.log(adminId, "BAN_POST", "POST", postId, finalReason);
        log.info("Admin ban post. adminId: {}, postId: {}, reason: {}", adminId, postId, finalReason);
    }

    /**
     * 解封帖子：将已封禁（含审核驳回）的帖子恢复为公开。
     *
     * @param postId 帖子ID
     */
    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    public void unbanPost(Long postId) {
        Long adminId = requireAdminId();
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() != PostStatus.PUBLIC.getValue()) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        if (postMapper.approveRejected(postId, adminId, LocalDateTime.now()) == 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "仅可解封已封禁的帖子");
        }
        adminAuditService.log(adminId, "UNBAN_POST", "POST", postId, null);
        log.info("Admin unban post. adminId: {}, postId: {}", adminId, postId);
    }

    private User requireUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() == UserStatus.DELETED.getValue()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    private AdminUserDTO toUserDTO(User user) {
        return AdminUserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .avatarUrl(user.getAvatarUrl())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .status(user.getStatus())
                .postCount(user.getPostCount())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }

    private AdminUserPostDTO toUserPostDTO(Post post) {
        List<String> images = post.getImages();
        return AdminUserPostDTO.builder()
                .id(post.getId())
                .title(post.getTitle())
                .coverImage(images == null || images.isEmpty() ? null : images.get(0))
                .moderationStatus(post.getModerationStatus())
                .status(post.getStatus())
                .createdAt(post.getCreatedAt())
                .build();
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
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .favoriteCount(post.getFavoriteCount())
                .status(post.getStatus())
                .moderationStatus(post.getModerationStatus())
                .moderationReason(post.getModerationReason())
                .createdAt(post.getCreatedAt())
                .build();
    }

    private <T> Page<T> page(long requestedPage, long requestedSize) {
        long safePage = Math.max(requestedPage, 1);
        long safeSize = Math.min(Math.max(requestedSize, 1), 100);
        return new Page<>(safePage, safeSize);
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
