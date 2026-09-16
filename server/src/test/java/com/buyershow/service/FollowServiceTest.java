package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.util.CursorUtils;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.FollowQueryRow;
import com.buyershow.dto.response.FollowUserDTO;
import com.buyershow.entity.User;
import com.buyershow.mapper.FollowMapper;
import com.buyershow.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 关注/粉丝列表（游标分页）测试。
 *
 * @author Qoder
 * @since 2026/09/16
 */
class FollowServiceTest {

    private final FollowMapper followMapper = mock(FollowMapper.class);
    private final UserMapper userMapper = mock(UserMapper.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final FollowService followService = new FollowService(followMapper, userMapper, notificationService);

    @Test
    void testListFollowersReturnsPageWithRelationCursor() {
        SecurityContextHolder.clearContext();
        when(userMapper.selectById(10L)).thenReturn(activeUser(10L));
        when(followMapper.selectFollowerRows(eq(10L), isNull(), eq(2), isNull()))
                .thenReturn(List.of(followRow(5L, 88L), followRow(6L, 87L)));

        CursorPage<FollowUserDTO> page = followService.listFollowers(10L, null, 1);

        assertEquals(1, page.getList().size());
        assertEquals(5L, page.getList().get(0).getId());
        assertFalse(page.getList().get(0).getMutual());
        assertTrue(page.isHasMore());
        assertEquals(CursorUtils.encode(88L), page.getNextCursor());
    }

    @Test
    void testListFollowingRejectsInactiveUser() {
        SecurityContextHolder.clearContext();
        User banned = activeUser(10L);
        banned.setStatus(1);
        when(userMapper.selectById(10L)).thenReturn(banned);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> followService.listFollowing(10L, null, 20));

        assertEquals(ErrorCode.USER_NOT_FOUND.getCode(), exception.getCode());
        verify(followMapper, never()).selectFollowingRows(any(), any(), anyInt(), any());
    }

    private User activeUser(Long id) {
        User user = new User();
        user.setId(id);
        user.setStatus(0);
        return user;
    }

    private FollowQueryRow followRow(Long id, Long cursorId) {
        FollowQueryRow row = new FollowQueryRow();
        row.setId(id);
        row.setNickname("用户" + id);
        row.setIsFollowing(0);
        row.setMutual(0);
        row.setCursorId(cursorId);
        return row;
    }
}
