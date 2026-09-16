package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.entity.Post;
import com.buyershow.entity.PostAppeal;
import com.buyershow.entity.User;
import com.buyershow.mapper.PostAppealMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 帖子申诉服务测试。
 *
 * @author Qoder
 * @since 2026/09/16
 */
class PostAppealServiceTest {

    private final PostAppealMapper postAppealMapper = mock(PostAppealMapper.class);
    private final PostMapper postMapper = mock(PostMapper.class);
    private final UserMapper userMapper = mock(UserMapper.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final AdminAuditService adminAuditService = mock(AdminAuditService.class);
    private final PostAppealService service = new PostAppealService(
            postAppealMapper, postMapper, userMapper, notificationService, adminAuditService);

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testCreateAppealSuccess() {
        loginAs(100L);
        when(postMapper.selectById(9L)).thenReturn(rejectedPost(100L));
        when(postAppealMapper.selectCount(any())).thenReturn(0L);

        service.createAppeal(9L, "内容并未违规，请复核");

        ArgumentCaptor<PostAppeal> captor = ArgumentCaptor.forClass(PostAppeal.class);
        verify(postAppealMapper).insert(captor.capture());
        assertEquals(9L, captor.getValue().getPostId());
        assertEquals(100L, captor.getValue().getUserId());
        assertEquals(PostAppealService.STATUS_PENDING, captor.getValue().getStatus());
    }

    @Test
    void testCreateAppealRejectsNonOwner() {
        loginAs(100L);
        when(postMapper.selectById(9L)).thenReturn(rejectedPost(5L));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.createAppeal(9L, "理由"));

        assertEquals(ErrorCode.POST_NOT_FOUND.getCode(), exception.getCode());
        verify(postAppealMapper, never()).insert(any(PostAppeal.class));
    }

    @Test
    void testCreateAppealRejectsNotRejectedPost() {
        loginAs(100L);
        Post post = rejectedPost(100L);
        post.setModerationStatus(0);
        when(postMapper.selectById(9L)).thenReturn(post);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.createAppeal(9L, "理由"));

        assertEquals("仅已下架的帖子可发起申诉", exception.getMessage());
    }

    @Test
    void testCreateAppealRejectsDuplicatePending() {
        loginAs(100L);
        when(postMapper.selectById(9L)).thenReturn(rejectedPost(100L));
        when(postAppealMapper.selectCount(any())).thenReturn(1L);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.createAppeal(9L, "理由"));

        assertEquals("已有待处理的申诉，请等待管理员处理", exception.getMessage());
        verify(postAppealMapper, never()).insert(any(PostAppeal.class));
    }

    @Test
    void testHandleAppealApproveUnbansPost() {
        authenticateAdmin();
        PostAppeal appeal = appeal(3L, 9L, 2L);
        when(postAppealMapper.selectById(3L)).thenReturn(appeal);
        when(postAppealMapper.handlePending(eq(3L), eq(1), any(), eq(100L), any(LocalDateTime.class)))
                .thenReturn(1);

        service.handleAppeal(3L, "APPROVE", "复核通过");

        verify(postMapper).approveRejected(eq(9L), eq(100L), any(LocalDateTime.class));
        verify(notificationService).notifySystem(eq(2L), org.mockito.ArgumentMatchers.contains("已恢复公开"), eq("post"), eq(9L));
        verify(adminAuditService).log(eq(100L), eq("HANDLE_APPEAL"), eq("APPEAL"), eq(3L), any());
    }

    @Test
    void testHandleAppealRejectNotifiesAuthor() {
        authenticateAdmin();
        PostAppeal appeal = appeal(3L, 9L, 2L);
        when(postAppealMapper.selectById(3L)).thenReturn(appeal);
        when(postAppealMapper.handlePending(eq(3L), eq(2), eq("内容确认违规"), eq(100L), any(LocalDateTime.class)))
                .thenReturn(1);

        service.handleAppeal(3L, "REJECT", "内容确认违规");

        verify(postMapper, never()).approveRejected(any(), any(), any());
        verify(notificationService).notifySystem(
                eq(2L), org.mockito.ArgumentMatchers.contains("未通过"), eq("post"), eq(9L));
    }

    @Test
    void testHandleAppealAlreadyHandled() {
        authenticateAdmin();
        when(postAppealMapper.selectById(3L)).thenReturn(appeal(3L, 9L, 2L));
        when(postAppealMapper.handlePending(eq(3L), eq(2), any(), eq(100L), any(LocalDateTime.class)))
                .thenReturn(0);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.handleAppeal(3L, "REJECT", null));

        assertEquals("该申诉已被处理", exception.getMessage());
        verify(postMapper, never()).approveRejected(any(), any(), any());
    }

    private Post rejectedPost(Long ownerId) {
        Post post = new Post();
        post.setId(9L);
        post.setUserId(ownerId);
        post.setStatus(0);
        post.setModerationStatus(2);
        return post;
    }

    private PostAppeal appeal(Long id, Long postId, Long userId) {
        PostAppeal app = new PostAppeal();
        app.setId(id);
        app.setPostId(postId);
        app.setUserId(userId);
        app.setStatus(PostAppealService.STATUS_PENDING);
        return app;
    }

    private void loginAs(Long userId) {
        User user = new User();
        user.setId(userId);
        user.setStatus(0);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
    }

    private void authenticateAdmin() {
        User admin = new User();
        admin.setId(100L);
        admin.setRole(1);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, null));
    }
}
