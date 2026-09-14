package com.buyershow.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.entity.Follow;
import com.buyershow.entity.User;
import com.buyershow.mapper.FollowMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FollowService {

    private final FollowMapper followMapper;
    private final UserMapper userMapper;
    private final NotificationService notificationService;

    @Transactional
    public boolean toggleFollow(Long targetUserId) {
        Long currentUserId = requireCurrentUserId();
        
        if (currentUserId.equals(targetUserId)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "不能关注自己");
        }

        User targetUser = userMapper.selectById(targetUserId);
        if (targetUser == null || targetUser.getStatus() != UserStatus.ACTIVE.getValue()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }

        // 检查是否已关注
        Long count = followMapper.selectCount(
                Wrappers.<Follow>lambdaQuery()
                        .eq(Follow::getFollowerId, currentUserId)
                        .eq(Follow::getFollowingId, targetUserId));

        if (count != null && count > 0) {
            // 取消关注
            followMapper.delete(
                    Wrappers.<Follow>lambdaQuery()
                            .eq(Follow::getFollowerId, currentUserId)
                            .eq(Follow::getFollowingId, targetUserId));
            userMapper.adjustFollowerCount(targetUserId, -1);
            userMapper.adjustFollowingCount(currentUserId, -1);
            return false;
        } else {
            // 添加关注
            Follow follow = new Follow();
            follow.setFollowerId(currentUserId);
            follow.setFollowingId(targetUserId);
            followMapper.insert(follow);
            userMapper.adjustFollowerCount(targetUserId, 1);
            userMapper.adjustFollowingCount(currentUserId, 1);
            
            // 发送关注通知
            notificationService.notifyFollow(targetUserId, currentUserId);
            return true;
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
