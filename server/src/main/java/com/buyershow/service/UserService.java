package com.buyershow.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.request.UpdateProfileRequest;
import com.buyershow.dto.response.UserDTO;
import com.buyershow.entity.Follow;
import com.buyershow.entity.User;
import com.buyershow.mapper.FollowMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final FollowMapper followMapper;

    public UserDTO getUserProfile(Long userId) {
        User user = findUserOrThrow(userId);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        boolean isFollowing = currentUserId != null && isFollowing(currentUserId, userId);
        return toUserDTO(user, isFollowing);
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
        return toUserDTO(user, false);
    }

    /**
     * 供 @CacheEvict SpEL 调用，安全获取当前用户 ID。
     */
    public Long getCurrentUserIdSafe() {
        return SecurityUtils.getCurrentUserId();
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

    private UserDTO toUserDTO(User user, boolean isFollowing) {
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
