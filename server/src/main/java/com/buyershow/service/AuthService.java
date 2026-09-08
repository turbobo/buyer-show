package com.buyershow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.JwtTokenProvider;
import com.buyershow.dto.request.LoginRequest;
import com.buyershow.dto.request.RegisterRequest;
import com.buyershow.dto.response.TokenPair;
import com.buyershow.entity.User;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public TokenPair register(RegisterRequest request) {
        // Check username uniqueness
        Long count = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getUsername, request.getUsername()));
        if (count > 0) {
            throw new BusinessException(ErrorCode.USERNAME_EXISTS);
        }

        // Check nickname uniqueness
        Long nicknameCount = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getNickname, request.getNickname()));
        if (nicknameCount > 0) {
            throw new BusinessException(ErrorCode.NICKNAME_EXISTS);
        }

        // Create user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname());
        user.setRole(0);   // USER
        user.setStatus(0); // ACTIVE
        user.setPostCount(0);
        user.setFollowerCount(0);
        user.setFollowingCount(0);
        userMapper.insert(user);

        return buildTokenPair(user);
    }

    public TokenPair login(LoginRequest request) {
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, request.getUsername()));
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.AUTH_FAILED);
        }

        if (user.getStatus() == 1) {
            throw new BusinessException(ErrorCode.ACCOUNT_BANNED);
        }
        if (user.getStatus() == 2) {
            throw new BusinessException(ErrorCode.ACCOUNT_DELETED);
        }

        return buildTokenPair(user);
    }

    public TokenPair refresh(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() != 0) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        return buildTokenPair(user);
    }

    private TokenPair buildTokenPair(User user) {
        String role = user.getRole() == 1 ? "ADMIN" : "USER";
        return TokenPair.builder()
                .accessToken(jwtTokenProvider.generateAccessToken(user.getId(), role))
                .refreshToken(jwtTokenProvider.generateRefreshToken(user.getId()))
                .userId(user.getId())
                .nickname(user.getNickname())
                .avatarUrl(user.getAvatarUrl())
                .role(role)
                .build();
    }
}
