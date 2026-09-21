package com.buyershow.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.response.BlockedUserDTO;
import com.buyershow.entity.Follow;
import com.buyershow.entity.User;
import com.buyershow.entity.UserBlock;
import com.buyershow.mapper.FollowMapper;
import com.buyershow.mapper.UserBlockMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 用户拉黑服务（G6）：拉黑后双方内容互不可见（查询层 SQL 过滤）、
 * 禁止私信（ConversationService 校验）、并自动双向取关。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserBlockService {

    private final UserBlockMapper userBlockMapper;
    private final FollowMapper followMapper;
    private final UserMapper userMapper;

    /**
     * 拉黑用户（幂等）；同时解除双方任一方向的关注关系。
     *
     * @param targetUserId 被拉黑用户ID
     * @return true 表示已处于拉黑状态
     */
    @Transactional
    public boolean block(Long targetUserId) {
        Long currentUserId = requireCurrentUserId();
        if (currentUserId.equals(targetUserId)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "不能拉黑自己");
        }
        User target = userMapper.selectById(targetUserId);
        if (target == null || target.getStatus() != UserStatus.ACTIVE.getValue()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        Long exists = userBlockMapper.selectCount(
                Wrappers.<UserBlock>lambdaQuery()
                        .eq(UserBlock::getBlockerId, currentUserId)
                        .eq(UserBlock::getBlockedId, targetUserId));
        if (exists != null && exists > 0) {
            return true;
        }
        UserBlock block = new UserBlock();
        block.setBlockerId(currentUserId);
        block.setBlockedId(targetUserId);
        userBlockMapper.insert(block);
        removeFollowDirection(currentUserId, targetUserId);
        removeFollowDirection(targetUserId, currentUserId);
        log.info("User {} blocked user {}", currentUserId, targetUserId);
        return true;
    }

    /**
     * 解除拉黑（幂等）；不恢复已解除的关注关系。
     *
     * @param targetUserId 被解除用户ID
     * @return false 表示已不在拉黑状态
     */
    @Transactional
    public boolean unblock(Long targetUserId) {
        Long currentUserId = requireCurrentUserId();
        userBlockMapper.delete(
                Wrappers.<UserBlock>lambdaQuery()
                        .eq(UserBlock::getBlockerId, currentUserId)
                        .eq(UserBlock::getBlockedId, targetUserId));
        return false;
    }

    /** 我的拉黑列表（按拉黑时间倒序）。 */
    public List<BlockedUserDTO> listBlockedUsers() {
        Long currentUserId = requireCurrentUserId();
        return userBlockMapper.selectBlockedUsers(currentUserId);
    }

    /** 删除 follower→following 方向的关注并同步双方计数。 */
    private void removeFollowDirection(Long followerId, Long followingId) {
        int deleted = followMapper.delete(
                Wrappers.<Follow>lambdaQuery()
                        .eq(Follow::getFollowerId, followerId)
                        .eq(Follow::getFollowingId, followingId));
        if (deleted > 0) {
            userMapper.adjustFollowerCount(followingId, -1);
            userMapper.adjustFollowingCount(followerId, -1);
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
