package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.UserRole;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.request.TagOperationRequest;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import com.buyershow.mapper.PostMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 标签管理服务测试。
 *
 * @author Qoder
 * @since 2026/09/16
 */
class TagAdminServiceTest {

    private final PostMapper postMapper = mock(PostMapper.class);
    private final AdminAuditService adminAuditService = mock(AdminAuditService.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final TagAdminService service = new TagAdminService(
            postMapper, adminAuditService, new ObjectMapper(), eventPublisher);

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testRenameTagReplacesAndDeduplicates() {
        authenticateAdmin();
        Post post1 = post(1L, List.of("美妆", "数码"));
        Post post2 = post(2L, List.of("数码", "美妆"));
        when(postMapper.selectPostsWithTag("美妆")).thenReturn(List.of(post1, post2));

        TagOperationRequest request = new TagOperationRequest();
        request.setSource("美妆");
        request.setTarget("数码");
        int affected = service.renameTag(request);

        assertEquals(2, affected);
        verify(postMapper).updatePostTags(eq(1L), eq("[\"数码\"]"));
        verify(postMapper).updatePostTags(eq(2L), eq("[\"数码\"]"));
        verify(adminAuditService).log(any(), eq("RENAME_TAG"), eq("TAG"), eq(0L), any());
    }

    @Test
    void testRenameTagRejectsSameName() {
        authenticateAdmin();
        TagOperationRequest request = new TagOperationRequest();
        request.setSource("美妆");
        request.setTarget("美妆");

        BusinessException exception = assertThrows(BusinessException.class, () -> service.renameTag(request));

        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
        verify(postMapper, never()).selectPostsWithTag(any());
    }

    private Post post(Long id, List<String> tags) {
        Post post = new Post();
        post.setId(id);
        post.setTags(tags);
        return post;
    }

    private void authenticateAdmin() {
        User user = new User();
        user.setId(100L);
        user.setRole(UserRole.ADMIN.getValue());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
    }
}
