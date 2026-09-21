package com.buyershow.realtime;

import com.buyershow.common.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * STOMP 握手鉴权拦截器测试（G11）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class WebSocketAuthChannelInterceptorTest {

    private final JwtTokenProvider jwtTokenProvider = mock(JwtTokenProvider.class);
    private final WebSocketAuthChannelInterceptor interceptor = new WebSocketAuthChannelInterceptor(jwtTokenProvider);

    @Test
    void testConnectWithValidTokenSetsPrincipal() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer valid-token");
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        when(jwtTokenProvider.validateToken("valid-token")).thenReturn(true);
        when(jwtTokenProvider.getUserIdFromToken("valid-token")).thenReturn(42L);

        Message<?> result = interceptor.preSend(message, mock(org.springframework.messaging.MessageChannel.class));

        StompHeaderAccessor resultAccessor = MessageHeaderAccessor.getAccessor(result, StompHeaderAccessor.class);
        assertEquals("42", resultAccessor.getUser().getName());
    }

    @Test
    void testConnectWithoutTokenRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(MessagingException.class,
                () -> interceptor.preSend(message, mock(org.springframework.messaging.MessageChannel.class)));
    }

    @Test
    void testConnectWithInvalidTokenRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer bad-token");
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        when(jwtTokenProvider.validateToken("bad-token")).thenReturn(false);

        assertThrows(MessagingException.class,
                () -> interceptor.preSend(message, mock(org.springframework.messaging.MessageChannel.class)));
    }

    @Test
    void testNonConnectFramePassesThrough() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, mock(org.springframework.messaging.MessageChannel.class));

        assertEquals(message, result);
    }
}
