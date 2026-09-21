package com.buyershow.realtime;

import com.buyershow.common.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * STOMP 握手鉴权拦截器（G11）：CONNECT 帧校验 Authorization: Bearer <accessToken>，
 * 通过后将会话 principal 设为用户 ID（user destination 路由依据）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        // getMutableAccessor：headers 可变时原位修改，不可变时复制新 accessor（官方推荐写法）
        MessageHeaderAccessor headerAccessor = MessageHeaderAccessor.getMutableAccessor(message);
        if (headerAccessor instanceof StompHeaderAccessor accessor
                && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
                String token = authHeader.substring(BEARER_PREFIX.length());
                if (jwtTokenProvider.validateToken(token)) {
                    accessor.setUser(new StompPrincipal(jwtTokenProvider.getUserIdFromToken(token)));
                    return MessageBuilder.createMessage(message.getPayload(), accessor.getMessageHeaders());
                }
            }
            throw new MessagingException("Unauthorized: invalid or missing access token");
        }
        return message;
    }
}
