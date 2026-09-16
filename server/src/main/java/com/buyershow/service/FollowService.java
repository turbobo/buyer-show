package com.buyershow.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.common.util.CursorUtils;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.FollowQueryRow;
import com.buyershow.dto.response.FollowUserDTO;
import com.buyershow.entity.Follow;
import com.buyershow.entity.User;
import com.buyershow.mapper.FollowMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FollowService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

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

    /**
     * 查询指定用户的粉丝列表（按关注时间倒序，游标分页）。
     *
     * @param userId 目标用户ID
     * @param cursor 游标（上一页最后一条关注关系ID编码）
     * @param requestedLimit 每页数量
     * @return 用户游标页
     */
    public CursorPage<FollowUserDTO> listFollowers(Long userId, String cursor, int requestedLimit) {
        requireActiveUser(userId);
        int limit = normalizePageSize(requestedLimit);
        Long cursorId = CursorUtils.decode(cursor);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<FollowQueryRow> rows = followMapper.selectFollowerRows(userId, cursorId, limit + 1, currentUserId);

        return toFollowPage(rows, limit);
    }

    /**
     * 查询指定用户关注的人（按关注时间倒序，游标分页）。
     *
     * @param userId 目标用户ID
     * @param cursor 游标（上一页最后一条关注关系ID编码）
     * @param requestedLimit 每页数量
     * @return 用户游标页
     */
    public CursorPage<FollowUserDTO> listFollowing(Long userId, String cursor, int requestedLimit) {
        requireActiveUser(userId);
        int limit = normalizePageSize(requestedLimit);
        Long cursorId = CursorUtils.decode(cursor);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<FollowQueryRow> rows = followMapper.selectFollowingRows(userId, cursorId, limit + 1, currentUserId);

        return toFollowPage(rows, limit);
    }

    private void requireActiveUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() != UserStatus.ACTIVE.getValue()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
    }

    private CursorPage<FollowUserDTO> toFollowPage(List<FollowQueryRow> rows, int limit) {
        boolean hasMore = rows.size() > limit;
        List<FollowQueryRow> visibleRows = hasMore ? rows.subList(0, limit) : rows;
        List<FollowUserDTO> users = visibleRows.stream()
                .map(row -> FollowUserDTO.builder()
                        .id(row.getId())
                        .nickname(row.getNickname())
                        .avatarUrl(row.getAvatarUrl())
                        .bio(row.getBio())
                        .isFollowing(row.getIsFollowing() != null && row.getIsFollowing() == 1)
                        .mutual(row.getMutual() != null && row.getMutual() == 1)
                        .build())
                .toList();

        String nextCursor = null;
        if (hasMore && !visibleRows.isEmpty()) {
            nextCursor = CursorUtils.encode(visibleRows.get(visibleRows.size() - 1).getCursorId());
        }

        return CursorPage.<FollowUserDTO>builder()
                .list(users)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .build();
    }

    private int normalizePageSize(int requestedLimit) {
        if (requestedLimit <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }

    private Long requireCurrentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return userId;
    }
}
