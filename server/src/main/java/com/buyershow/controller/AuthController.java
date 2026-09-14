package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.LoginRequest;
import com.buyershow.dto.request.RegisterRequest;
import com.buyershow.dto.response.TokenPair;
import com.buyershow.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public R<TokenPair> register(@Valid @RequestBody RegisterRequest request) {
        return R.ok(authService.register(request));
    }

    @PostMapping("/login")
    public R<TokenPair> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        return R.ok(authService.login(request, clientIp));
    }

    @PostMapping("/refresh")
    public R<TokenPair> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        return R.ok(authService.refresh(refreshToken));
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 多个代理时取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
