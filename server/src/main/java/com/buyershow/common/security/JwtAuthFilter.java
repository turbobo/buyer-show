package com.buyershow.common.security;

import com.buyershow.entity.User;
import com.buyershow.mapper.UserMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.buyershow.common.R;
import com.buyershow.common.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserMapper userMapper;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractToken(request);

        if (!StringUtils.hasText(token)) {
            filterChain.doFilter(request, response);
            return;
        }
        if (!jwtTokenProvider.validateToken(token)) {
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED, ErrorCode.TOKEN_EXPIRED);
            return;
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() == 2) {
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED, ErrorCode.TOKEN_INVALID);
            return;
        }
        if (user.getStatus() == 1) {
            writeError(response, HttpServletResponse.SC_FORBIDDEN, ErrorCode.ACCOUNT_BANNED);
            return;
        }

        String role = user.getRole() == 1 ? "ADMIN" : "USER";
        var authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role));
        var authentication = new UsernamePasswordAuthenticationToken(user, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }

    private void writeError(HttpServletResponse response, int status, ErrorCode errorCode) throws IOException {
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(status);
        response.getWriter().write(objectMapper.writeValueAsString(R.fail(errorCode)));
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
