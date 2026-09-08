package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TokenPair {
    private String accessToken;
    private String refreshToken;
    private Long userId;
    private String nickname;
    private String avatarUrl;
    private String role;
}
