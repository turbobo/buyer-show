package com.buyershow.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.search.PostIndexEvents;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.request.UpdateProfileRequest;
import com.buyershow.dto.response.UserDTO;
import com.buyershow.entity.Follow;
import com.buyershow.entity.User;
import com.buyershow.entity.UserBlock;
import com.buyershow.mapper.FollowMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserBlockMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final FollowMapper followMapper;
    private final UserBlockMapper userBlockMapper;
    private final PostMapper postMapper;
    private final ApplicationEventPublisher eventPublisher;

    public UserDTO getUserProfile(Long userId) {
        User user = findUserOrThrow(userId);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        boolean isFollowing = currentUserId != null && isFollowing(currentUserId, userId);
        boolean blockedByMe = currentUserId != null && isBlockedByMe(currentUserId, userId);
        return toUserDTO(user, isFollowing, blockedByMe);
    }

    public UserDTO getCurrentUserProfile() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return getUserProfile(userId);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "user:profile", key = "#result.id"),
            @CacheEvict(cacheNames = "user:profile", key = "#root.target.getCurrentUserIdSafe()")
    })
    public UserDTO updateCurrentUserProfile(UpdateProfileRequest request) {
        Long userId = requireCurrentUserId();
        User user = findUserOrThrow(userId);

        if (request.getNickname() != null && !request.getNickname().isBlank()) {
            String nickname = request.getNickname().trim();
            Long count = userMapper.selectCount(
                    Wrappers.<User>lambdaQuery()
                            .eq(User::getNickname, nickname)
                            .ne(User::getId, userId));
            if (count > 0) {
                throw new BusinessException(ErrorCode.NICKNAME_EXISTS);
            }
            user.setNickname(nickname);
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }
        userMapper.updateById(user);
        return toUserDTO(user, false, null);
    }

    /**
     * 供 @CacheEvict SpEL 调用，安全获取当前用户 ID。
     */
    public Long getCurrentUserIdSafe() {
        return SecurityUtils.getCurrentUserId();
    }

    /**
     * 注销账号（软注销，不可逆）：批量软删本人全部帖子并清零计数，置状态为注销。
     * 注销后登录/刷新令牌/资料查看均被拒绝（ACCOUNT_DELETED / USER_NOT_FOUND）；
     * ES 搜索索引在事务提交后异步清理，失败仅告警。
     */
    @Transactional
    @CacheEvict(cacheNames = "user:profile", key = "#root.target.getCurrentUserIdSafe()")
    public void deactivateCurrentUser() {
        Long userId = requireCurrentUserId();
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() != UserStatus.ACTIVE.getValue()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        List<Long> postIds = postMapper.selectPostIdsByUserId(userId);
        if (!postIds.isEmpty()) {
            postMapper.softDeleteAllByUserId(userId);
        }
        user.setPostCount(0);
        user.setStatus(UserStatus.DELETED.getValue());
        userMapper.updateById(user);
        log.info("用户注销账号: userId={}, 软删帖数={}", userId, postIds.size());
        // G5：批量删除搜索索引文档（事务提交后异步，失败仅告警）
        postIds.forEach(postId -> eventPublisher.publishEvent(new PostIndexEvents.PostIndexRemoved(postId)));
    }

    // ─── 缓存层：User 实体查询 ──────────────────────────────────────

    /**
     * 带缓存的 User 实体查询（10 分钟 TTL）。
     * 缓存的是数据库实体，不含用户维度的 isFollowing 等字段。
     */
    @Cacheable(cacheNames = "user:profile", key = "#userId",
            unless = "#result == null")
    public User findUserOrThrow(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() == UserStatus.DELETED.getValue()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    // ─── 私有方法 ─────────────────────────────────────────────────

    private boolean isFollowing(Long followerId, Long followingId) {
        if (followerId.equals(followingId)) {
            return false;
        }
        Long count = followMapper.selectCount(
                Wrappers.<Follow>lambdaQuery()
                        .eq(Follow::getFollowerId, followerId)
                        .eq(Follow::getFollowingId, followingId));
        return count != null && count > 0;
    }

    private boolean isBlockedByMe(Long blockerId, Long blockedId) {
        if (blockerId.equals(blockedId)) {
            return false;
        }
        Long count = userBlockMapper.selectCount(
                Wrappers.<UserBlock>lambdaQuery()
                        .eq(UserBlock::getBlockerId, blockerId)
                        .eq(UserBlock::getBlockedId, blockedId));
        return count != null && count > 0;
    }

    private UserDTO toUserDTO(User user, boolean isFollowing, Boolean blockedByMe) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .postCount(user.getPostCount())
                .followerCount(user.getFollowerCount())
                .followingCount(user.getFollowingCount())
                .isFollowing(isFollowing)
                .blockedByMe(blockedByMe)
                .build();
    }

    private Long requireCurrentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return userId;
    }
}
