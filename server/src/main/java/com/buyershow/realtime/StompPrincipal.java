package com.buyershow.realtime;

import java.security.Principal;

/**
 * STOMP 会话主体（G11）：承载握手鉴权通过的 userId，
 * user destination（/user/{id}/queue/**）按 name 路由。
 *
 * @author Qoder
 * @since 2026/09/21
 */
public record StompPrincipal(Long userId) implements Principal {

    @Override
    public String getName() {
        return String.valueOf(userId);
    }
}
