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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final FollowMapper followMapper;

    public UserDTO getUserProfile(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() == UserStatus.DELETED.getValue()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
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
    public UserDTO updateCurrentUserProfile(UpdateProfileRequest request) {
        Long userId = requireCurrentUserId();
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() != UserStatus.ACTIVE.getValue()) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }

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
