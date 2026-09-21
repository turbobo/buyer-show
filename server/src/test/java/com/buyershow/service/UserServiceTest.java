package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.search.PostIndexEvents;
import com.buyershow.entity.User;
import com.buyershow.mapper.FollowMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserBlockMapper;
import com.buyershow.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 用户资料与账号注销测试（G 组后续：个人中心补全）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class UserServiceTest {

    private final UserMapper userMapper = mock(UserMapper.class);
    private final FollowMapper followMapper = mock(FollowMapper.class);
    private final UserBlockMapper userBlockMapper = mock(UserBlockMapper.class);
    private final PostMapper postMapper = mock(PostMapper.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userMapper, followMapper, userBlockMapper, postMapper, eventPublisher);
    }

    private void loginAs(Long userId) {
        User principal = new User();
        principal.setId(userId);
        principal.setStatus(UserStatus.ACTIVE.getValue());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private User activeUser(Long userId) {
        User user = new User();
        user.setId(userId);
        user.setNickname("测试用户");
        user.setStatus(UserStatus.ACTIVE.getValue());
        user.setPostCount(3);
        return user;
    }

    @Test
    void testDeactivateRequiresLogin() {
        SecurityContextHolder.clearContext();

        BusinessException exception = assertThrows(BusinessException.class,
                () -> userService.deactivateCurrentUser());

        assertEquals(ErrorCode.TOKEN_INVALID.getCode(), exception.getCode());
        verify(userMapper, never()).updateById(any(User.class));
    }

    @Test
    void testDeactivateSoftDeletesPostsAndMarksDeleted() {
        loginAs(10L);
        User user = activeUser(10L);
        when(userMapper.selectById(10L)).thenReturn(user);
        when(postMapper.selectPostIdsByUserId(10L)).thenReturn(List.of(101L, 102L));

        userService.deactivateCurrentUser();

        assertEquals(UserStatus.DELETED.getValue(), user.getStatus());
        assertEquals(0, user.getPostCount());
        verify(postMapper).softDeleteAllByUserId(10L);
        verify(userMapper).updateById(user);
        ArgumentCaptor<PostIndexEvents.PostIndexRemoved> captor = ArgumentCaptor.forClass(PostIndexEvents.PostIndexRemoved.class);
        verify(eventPublisher, times(2)).publishEvent(captor.capture());
        assertEquals(List.of(101L, 102L),
                captor.getAllValues().stream().map(PostIndexEvents.PostIndexRemoved::postId).toList());
    }

    @Test
    void testDeactivateWithoutPostsSkipsPostCleanup() {
        loginAs(10L);
        User user = activeUser(10L);
        when(userMapper.selectById(10L)).thenReturn(user);
        when(postMapper.selectPostIdsByUserId(10L)).thenReturn(List.of());

        userService.deactivateCurrentUser();

        assertEquals(UserStatus.DELETED.getValue(), user.getStatus());
        assertEquals(0, user.getPostCount());
        verify(postMapper, never()).softDeleteAllByUserId(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void testDeactivateAlreadyDeletedRejected() {
        loginAs(10L);
        User user = activeUser(10L);
        user.setStatus(UserStatus.DELETED.getValue());
        when(userMapper.selectById(10L)).thenReturn(user);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> userService.deactivateCurrentUser());

        assertEquals(ErrorCode.USER_NOT_FOUND.getCode(), exception.getCode());
        verify(userMapper, never()).updateById(any(User.class));
    }
}
