package com.buyershow.common.security;

import com.buyershow.entity.User;
import com.buyershow.mapper.UserMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

class JwtAuthFilterTest {

    private final JwtTokenProvider tokenProvider = mock(JwtTokenProvider.class);
    private final UserMapper userMapper = mock(UserMapper.class);
    private final JwtAuthFilter filter = new JwtAuthFilter(tokenProvider, userMapper, new ObjectMapper());

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void invalidBearerTokenReturnsUnauthorizedEvenForPublicEndpoint() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/posts");
        request.addHeader("Authorization", "Bearer expired");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(tokenProvider.validateToken("expired")).thenReturn(false);

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("1002"));
    }

    @Test
    void authorityComesFromCurrentDatabaseRole() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/reports");
        request.addHeader("Authorization", "Bearer stale-admin-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        User user = new User();
        user.setId(1L);
        user.setRole(0);
        user.setStatus(0);
        when(tokenProvider.validateToken("stale-admin-token")).thenReturn(true);
        when(tokenProvider.getUserIdFromToken("stale-admin-token")).thenReturn(1L);
        when(userMapper.selectById(1L)).thenReturn(user);

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals("ROLE_USER", SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities().iterator().next().getAuthority());
        verify(tokenProvider, never()).getRoleFromToken(anyString());
    }
}
