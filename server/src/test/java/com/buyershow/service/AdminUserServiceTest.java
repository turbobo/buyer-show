package com.buyershow.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.response.AdminUserDTO;
import com.buyershow.dto.response.ModerationPostDTO;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 管理端用户/帖子封禁服务测试。
 *
 * @author Qoder
 * @since 2026/09/16
 */
class AdminUserServiceTest {

    private final UserMapper userMapper = mock(UserMapper.class);
    private final PostMapper postMapper = mock(PostMapper.class);
    private final AdminAuditService adminAuditService = mock(AdminAuditService.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final AdminUserService service = new AdminUserService(
            userMapper, postMapper, adminAuditService, eventPublisher);

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testBanUserSuccess() {
        authenticate(1);
        when(userMapper.selectById(5L)).thenReturn(user(5L, 0, 0));
        when(userMapper.banUser(5L)).thenReturn(1);

        service.banUser(5L, "发布违规内容");

        verify(userMapper).banUser(5L);
    }

    @Test
    void testBanUserRejectsSelf() {
        authenticate(1);
        when(userMapper.selectById(100L)).thenReturn(user(100L, 0, 1));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.banUser(100L, null));

        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
        assertEquals("不能封禁自己", exception.getMessage());
        verify(userMapper, never()).banUser(any());
    }

    @Test
    void testBanUserRejectsAdminTarget() {
        authenticate(1);
        when(userMapper.selectById(5L)).thenReturn(user(5L, 0, 1));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.banUser(5L, null));

        assertEquals("管理员账号不可封禁", exception.getMessage());
        verify(userMapper, never()).banUser(any());
    }

    @Test
    void testUnbanUserRequiresBannedState() {
        authenticate(1);
        when(userMapper.selectById(5L)).thenReturn(user(5L, 0, 0));
        when(userMapper.unbanUser(5L)).thenReturn(0);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.unbanUser(5L));

        assertEquals("仅可解封已封禁的用户", exception.getMessage());
    }

    @Test
    void testBanPostUsesDefaultReason() {
        authenticate(1);
        Post post = post(9L);
        when(postMapper.selectById(9L)).thenReturn(post);
        when(postMapper.rejectApproved(eq(9L), anyString(), eq(100L), any(LocalDateTime.class)))
                .thenReturn(1);

        service.banPost(9L, null);

        verify(postMapper).rejectApproved(eq(9L), eq("管理员封禁"), eq(100L), any(LocalDateTime.class));
    }

    @Test
    void testUnbanPostSuccess() {
        authenticate(1);
        Post post = post(9L);
        when(postMapper.selectById(9L)).thenReturn(post);
        when(postMapper.approveRejected(eq(9L), eq(100L), any(LocalDateTime.class))).thenReturn(1);

        service.unbanPost(9L);

        verify(postMapper).approveRejected(eq(9L), eq(100L), any(LocalDateTime.class));
    }

    @Test
    void testGetPostDetailReturnsContent() {
        authenticate(1);
        Post post = post(9L);
        post.setTitle("被举报的帖子");
        post.setContent("正文内容");
        post.setModerationStatus(2);
        when(postMapper.selectById(9L)).thenReturn(post);
        when(userMapper.selectById(5L)).thenReturn(user(5L, 0, 0));

        ModerationPostDTO detail = service.getPostDetail(9L);

        assertEquals(9L, detail.getId());
        assertEquals("被举报的帖子", detail.getTitle());
        assertEquals(2, detail.getModerationStatus());
    }

    @Test
    void testGetPostDetailRejectsDeleted() {
        authenticate(1);
        Post post = post(9L);
        post.setStatus(2);
        when(postMapper.selectById(9L)).thenReturn(post);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.getPostDetail(9L));

        assertEquals(ErrorCode.POST_NOT_FOUND.getCode(), exception.getCode());
    }

    @Test
    void testListUsersIncludesLastLoginAt() {
        authenticate(1);
        User u = user(5L, 0, 0);
        u.setPostCount(3);
        u.setCreatedAt(LocalDateTime.of(2026, 9, 1, 10, 0));
        u.setLastLoginAt(LocalDateTime.of(2026, 9, 18, 6, 47));
        Page<User> entityPage = new Page<>(1, 10);
        entityPage.setRecords(List.of(u));
        when(userMapper.selectPage(any(), any())).thenReturn(entityPage);

        IPage<AdminUserDTO> result = service.listUsers(1, 10, null, null);

        AdminUserDTO dto = result.getRecords().get(0);
        assertEquals(LocalDateTime.of(2026, 9, 18, 6, 47), dto.getLastLoginAt());
        assertEquals(LocalDateTime.of(2026, 9, 1, 10, 0), dto.getCreatedAt());
        assertEquals(3, dto.getPostCount());
    }

    private void authenticate(int role) {
        User admin = new User();
        admin.setId(100L);
        admin.setRole(role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, null));
    }

    private User user(Long id, int status, int role) {
        User user = new User();
        user.setId(id);
        user.setStatus(status);
        user.setRole(role);
        user.setNickname("用户" + id);
        user.setUsername("user" + id);
        return user;
    }

    private Post post(Long id) {
        Post post = new Post();
        post.setId(id);
        post.setStatus(0);
        post.setModerationStatus(0);
        post.setUserId(5L);
        return post;
    }
}
