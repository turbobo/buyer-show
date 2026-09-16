package com.buyershow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.UserRole;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.JwtTokenProvider;
import com.buyershow.common.security.LoginRateLimiter;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.request.ChangePasswordRequest;
import com.buyershow.dto.request.LoginRequest;
import com.buyershow.dto.request.RegisterRequest;
import com.buyershow.dto.response.TokenPair;
import com.buyershow.entity.User;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final LoginRateLimiter loginRateLimiter;

    public TokenPair register(RegisterRequest request) {
        String username = request.getUsername().trim();
        String phone = trimToNull(request.getPhone());
        String email = trimToNull(request.getEmail());
        log.info("用户注册: username={}, phone={}, email={}", username, phone, email);

        // Check username uniqueness
        Long count = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if (count > 0) {
            throw new BusinessException(ErrorCode.USERNAME_EXISTS);
        }

        // Check nickname uniqueness
        Long nicknameCount = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getNickname, request.getNickname()));
        if (nicknameCount > 0) {
            throw new BusinessException(ErrorCode.NICKNAME_EXISTS);
        }

        // Check optional contact uniqueness
        if (phone != null && userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getPhone, phone)) > 0) {
            throw new BusinessException(ErrorCode.PHONE_EXISTS);
        }
        if (email != null && userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getEmail, email)) > 0) {
            throw new BusinessException(ErrorCode.EMAIL_EXISTS);
        }

        // Create user
        User user = new User();
        user.setUsername(username);
        user.setPhone(phone);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname());
        user.setRole(UserRole.USER.getValue());
        user.setStatus(UserStatus.ACTIVE.getValue());
        user.setPostCount(0);
        user.setFollowerCount(0);
        user.setFollowingCount(0);
        try {
            userMapper.insert(user);
        } catch (DuplicateKeyException exception) {
            throw new BusinessException(ErrorCode.ACCOUNT_EXISTS);
        }

        return buildTokenPair(user);
    }

    /**
     * 修改当前登录用户密码（校验旧密码；新密码不得与旧密码相同）。
     *
     * @param request 旧密码 / 新密码
     */
    public void changePassword(ChangePasswordRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "当前密码不正确");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "新密码不能与当前密码相同");
        }
        User update = new User();
        update.setId(userId);
        update.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userMapper.updateById(update);
        log.info("用户修改密码: userId={}", userId);
    }

    public TokenPair login(LoginRequest request, String clientIp) {
        String identifier = request.getUsername().trim();
        log.info("用户登录: identifier={}, ip={}", identifier, clientIp);

        // 限流检查
        loginRateLimiter.checkRateLimit(identifier, clientIp);

        User user = resolveByLoginIdentifier(identifier);
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.AUTH_FAILED);
        }

        if (user.getStatus() == UserStatus.BANNED.getValue()) {
            throw new BusinessException(ErrorCode.ACCOUNT_BANNED);
        }
        if (user.getStatus() == UserStatus.DELETED.getValue()) {
            throw new BusinessException(ErrorCode.ACCOUNT_DELETED);
        }

        // 登录成功，清除计数
        loginRateLimiter.clearAttempts(identifier, clientIp);

        return buildTokenPair(user);
    }

    public TokenPair refresh(String refreshToken) {
        if (!jwtTokenProvider.validateRefreshToken(refreshToken)) {
            log.warn("Refresh token 无效");
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() != UserStatus.ACTIVE.getValue()) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        return buildTokenPair(user);
    }

    private TokenPair buildTokenPair(User user) {
        String role = user.getRole() == UserRole.ADMIN.getValue() ? "ADMIN" : "USER";
        return TokenPair.builder()
                .accessToken(jwtTokenProvider.generateAccessToken(user.getId(), role))
                .refreshToken(jwtTokenProvider.generateRefreshToken(user.getId()))
                .userId(user.getId())
                .nickname(user.getNickname())
                .avatarUrl(user.getAvatarUrl())
                .role(role)
                .build();
    }

    private User resolveByLoginIdentifier(String identifier) {
        List<User> candidates = userMapper.selectList(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, identifier)
                .or().eq(User::getPhone, identifier)
                .or().eq(User::getEmail, identifier));
        if (candidates.isEmpty()) {
            return null;
        }
        return candidates.stream()
                .filter(candidate -> identifier.equals(candidate.getUsername()))
                .findFirst()
                .orElseGet(() -> candidates.stream()
                        .filter(candidate -> identifier.equals(candidate.getPhone()))
                        .findFirst()
                        .orElse(candidates.get(0)));
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
