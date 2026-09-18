package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.JwtTokenProvider;
import com.buyershow.common.security.LoginRateLimiter;
import com.buyershow.dto.request.ChangePasswordRequest;
import com.buyershow.dto.request.LoginRequest;
import com.buyershow.dto.request.RegisterRequest;
import com.buyershow.dto.response.TokenPair;
import com.buyershow.entity.User;
import com.buyershow.mapper.UserMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 认证服务多标识注册登录测试。
 *
 * @author Qoder
 * @since 2026/09/14
 */
class AuthServiceTest {

    private final UserMapper userMapper = mock(UserMapper.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final JwtTokenProvider jwtTokenProvider = mock(JwtTokenProvider.class);
    private final LoginRateLimiter loginRateLimiter = mock(LoginRateLimiter.class);
    private final CaptchaService captchaService = mock(CaptchaService.class);
    private final AuthService authService = new AuthService(
            userMapper, passwordEncoder, jwtTokenProvider, loginRateLimiter, captchaService);

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testChangePasswordRejectsWrongCurrentPassword() {
        authenticate(1L);
        User user = new User();
        user.setId(1L);
        user.setPasswordHash("hash-old");
        when(userMapper.selectById(1L)).thenReturn(user);
        when(passwordEncoder.matches("wrong-pass", "hash-old")).thenReturn(false);

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("wrong-pass");
        request.setNewPassword("new-pass-123");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> authService.changePassword(request));
        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
        verify(userMapper, never()).updateById(any(User.class));
    }

    @Test
    void testChangePasswordUpdatesHashWhenValid() {
        authenticate(1L);
        User user = new User();
        user.setId(1L);
        user.setPasswordHash("hash-old");
        when(userMapper.selectById(1L)).thenReturn(user);
        when(passwordEncoder.matches("old-pass-123", "hash-old")).thenReturn(true);
        when(passwordEncoder.matches("new-pass-456", "hash-old")).thenReturn(false);
        when(passwordEncoder.encode("new-pass-456")).thenReturn("hash-new");

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("old-pass-123");
        request.setNewPassword("new-pass-456");
        authService.changePassword(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userMapper).updateById(captor.capture());
        assertEquals(1L, captor.getValue().getId());
        assertEquals("hash-new", captor.getValue().getPasswordHash());
    }

    private void authenticate(Long userId) {
        User user = new User();
        user.setId(userId);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
    }

    @Test
    void testRegisterBindsOptionalPhoneAndEmail() {
        RegisterRequest request = registerRequest("lisi", "13800138000", "lisi@example.com");
        when(userMapper.selectCount(any())).thenReturn(0L);
        when(passwordEncoder.encode("secret123")).thenReturn("hashed");
        when(userMapper.insert(any(User.class))).thenAnswer(invocation -> {
            User inserted = invocation.getArgument(0);
            inserted.setId(7L);
            return 1;
        });
        stubTokens();

        TokenPair tokens = authService.register(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userMapper).insert(captor.capture());
        assertEquals("13800138000", captor.getValue().getPhone());
        assertEquals("lisi@example.com", captor.getValue().getEmail());
        assertEquals("token-access", tokens.getAccessToken());
    }

    @Test
    void testRegisterRejectsDuplicatedPhone() {
        RegisterRequest request = registerRequest("lisi", "13800138000", null);
        when(userMapper.selectCount(any())).thenReturn(0L, 0L, 1L);

        BusinessException exception = assertThrows(BusinessException.class, () -> authService.register(request));

        assertEquals(ErrorCode.PHONE_EXISTS.getCode(), exception.getCode());
        verify(userMapper, never()).insert(any(User.class));
    }

    @Test
    void testLoginMatchesPhoneIdentifier() {
        User user = activeUser();
        when(userMapper.selectList(any())).thenReturn(List.of(user));
        when(passwordEncoder.matches("secret123", "hashed")).thenReturn(true);
        stubTokens();

        TokenPair tokens = authService.login(loginRequest("13800138000"), "127.0.0.1");

        assertEquals("token-access", tokens.getAccessToken());
        assertEquals(Long.valueOf(7L), tokens.getUserId());
        verify(userMapper).updateLastLogin(eq(7L), any(LocalDateTime.class));
    }

    @Test
    void testLoginToleratesLastLoginUpdateFailure() {
        User user = activeUser();
        when(userMapper.selectList(any())).thenReturn(List.of(user));
        when(passwordEncoder.matches("secret123", "hashed")).thenReturn(true);
        stubTokens();
        doThrow(new RuntimeException("db down")).when(userMapper)
                .updateLastLogin(eq(7L), any(LocalDateTime.class));

        TokenPair tokens = authService.login(loginRequest("13800138000"), "127.0.0.1");

        assertEquals("token-access", tokens.getAccessToken());
    }

    @Test
    void testLoginMatchesEmailIdentifier() {
        User user = activeUser();
        user.setEmail("lisi@example.com");
        when(userMapper.selectList(any())).thenReturn(List.of(user));
        when(passwordEncoder.matches("secret123", "hashed")).thenReturn(true);
        stubTokens();

        TokenPair tokens = authService.login(loginRequest("lisi@example.com"), "127.0.0.1");

        assertEquals(Long.valueOf(7L), tokens.getUserId());
    }

    @Test
    void testLoginRejectsUnknownIdentifier() {
        when(userMapper.selectList(any())).thenReturn(List.of());

        BusinessException exception = assertThrows(BusinessException.class,
                () -> authService.login(loginRequest("nobody"), "127.0.0.1"));

        assertEquals(ErrorCode.AUTH_FAILED.getCode(), exception.getCode());
    }

    private RegisterRequest registerRequest(String username, String phone, String email) {
        RegisterRequest request = new RegisterRequest();
        request.setUsername(username);
        request.setPassword("secret123");
        request.setNickname("李四");
        request.setPhone(phone);
        request.setEmail(email);
        return request;
    }

    private LoginRequest loginRequest(String identifier) {
        LoginRequest request = new LoginRequest();
        request.setUsername(identifier);
        request.setPassword("secret123");
        return request;
    }

    private User activeUser() {
        User user = new User();
        user.setId(7L);
        user.setUsername("lisi");
        user.setPhone("13800138000");
        user.setPasswordHash("hashed");
        user.setNickname("李四");
        user.setRole(0);
        user.setStatus(0);
        return user;
    }

    private void stubTokens() {
        when(jwtTokenProvider.generateAccessToken(anyLong(), anyString())).thenReturn("token-access");
        when(jwtTokenProvider.generateRefreshToken(anyLong())).thenReturn("token-refresh");
    }
}
