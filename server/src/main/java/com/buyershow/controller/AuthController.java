package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.LoginRequest;
import com.buyershow.dto.request.RegisterRequest;
import com.buyershow.dto.response.TokenPair;
import com.buyershow.service.AuthService;
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
    public R<TokenPair> login(@Valid @RequestBody LoginRequest request) {
        return R.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public R<TokenPair> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        return R.ok(authService.refresh(refreshToken));
    }
}
