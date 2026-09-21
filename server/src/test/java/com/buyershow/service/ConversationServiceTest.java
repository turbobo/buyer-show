package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.request.SendMessageRequest;
import com.buyershow.dto.response.ConversationDTO;
import com.buyershow.dto.response.MessageDTO;
import com.buyershow.entity.Conversation;
import com.buyershow.entity.Message;
import com.buyershow.entity.User;
import com.buyershow.mapper.ConversationMapper;
import com.buyershow.mapper.FollowMapper;
import com.buyershow.mapper.MessageMapper;
import com.buyershow.mapper.UserBlockMapper;
import com.buyershow.mapper.UserMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 私信服务测试。
 *
 * @author Qoder
 * @since 2026/09/16
 */
class ConversationServiceTest {

    private final ConversationMapper conversationMapper = mock(ConversationMapper.class);
    private final MessageMapper messageMapper = mock(MessageMapper.class);
    private final UserMapper userMapper = mock(UserMapper.class);
    private final FollowMapper followMapper = mock(FollowMapper.class);
    private final UserBlockMapper userBlockMapper = mock(UserBlockMapper.class);
    private final ContentModerationService moderationService = mock(ContentModerationService.class);
    private final ActivityService activityService = mock(ActivityService.class);
    private final ConversationService service = new ConversationService(
            conversationMapper, messageMapper, userMapper, followMapper, userBlockMapper,
            moderationService, activityService);

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @BeforeEach
    void setUpActivity() {
        when(activityService.onlineAmong(anyList())).thenReturn(Set.of());
    }

    @Test
    void testStartConversationRequiresTargetFollow() {
        authenticate(1L);
        User target = new User();
        target.setId(2L);
        target.setStatus(0);
        target.setNickname("对方");
        when(userMapper.selectById(2L)).thenReturn(target);
        when(followMapper.countFollow(2L, 1L)).thenReturn(0);

        BusinessException exception = assertThrows(BusinessException.class, () -> service.startConversation(2L));

        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
        verify(conversationMapper, never()).insert(any(Conversation.class));
    }

    @Test
    void testStartConversationReusesExisting() {
        authenticate(1L);
        User target = new User();
        target.setId(5L);
        target.setStatus(0);
        target.setNickname("对方");
        when(userMapper.selectById(5L)).thenReturn(target);
        when(followMapper.countFollow(5L, 1L)).thenReturn(1);
        Conversation existing = new Conversation();
        existing.setId(9L);
        existing.setUserAId(1L);
        existing.setUserBId(5L);
        existing.setAUnread(2);
        existing.setBUnread(0);
        when(conversationMapper.selectOne(any())).thenReturn(existing);

        ConversationDTO dto = service.startConversation(5L);

        assertEquals(9L, dto.getId());
        assertEquals(2, dto.getUnreadCount());
        verify(conversationMapper, never()).insert(any(Conversation.class));
    }

    @Test
    void testSendMessageRejectsSensitiveContent() {
        authenticate(1L);
        when(conversationMapper.selectById(9L)).thenReturn(conversation());
        when(moderationService.evaluate(any()))
                .thenReturn(new ModerationDecision(ModerationStatus.REJECTED, "含敏感词"));

        SendMessageRequest request = new SendMessageRequest();
        request.setContent("违规内容测试");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.sendMessage(9L, request));

        assertEquals(ErrorCode.CONTENT_REJECTED.getCode(), exception.getCode());
        verify(messageMapper, never()).insert(any(Message.class));
    }

    @Test
    void testSendMessageUpdatesConversationUnread() {
        authenticate(1L);
        when(conversationMapper.selectById(9L)).thenReturn(conversation());
        when(moderationService.evaluate(any()))
                .thenReturn(new ModerationDecision(ModerationStatus.APPROVED, null));
        when(messageMapper.insert(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId(100L);
            message.setCreatedAt(LocalDateTime.now());
            return 1;
        });

        SendMessageRequest request = new SendMessageRequest();
        request.setContent("你好，很高兴认识你");
        MessageDTO dto = service.sendMessage(9L, request);

        assertEquals(100L, dto.getId());
        verify(conversationMapper).updateById(org.mockito.ArgumentMatchers.argThat(
                (Conversation update) -> update.getId().equals(9L) && update.getBUnread() == 1));
    }

    @Test
    void testStartConversationRejectsWhenBlocked() {
        authenticate(1L);
        User target = new User();
        target.setId(5L);
        target.setStatus(0);
        target.setNickname("对方");
        when(userMapper.selectById(5L)).thenReturn(target);
        when(followMapper.countFollow(5L, 1L)).thenReturn(1);
        when(userBlockMapper.countBlockBetween(1L, 5L)).thenReturn(1);

        BusinessException exception = assertThrows(BusinessException.class, () -> service.startConversation(5L));

        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
        verify(conversationMapper, never()).insert(any(Conversation.class));
    }

    @Test
    void testSendMessageRejectsWhenBlocked() {
        authenticate(1L);
        when(conversationMapper.selectById(9L)).thenReturn(conversation());
        when(moderationService.evaluate(any()))
                .thenReturn(new ModerationDecision(ModerationStatus.APPROVED, null));
        when(userBlockMapper.countBlockBetween(1L, 5L)).thenReturn(1);

        SendMessageRequest request = new SendMessageRequest();
        request.setContent("你好");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.sendMessage(9L, request));

        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
        verify(messageMapper, never()).insert(any(Message.class));
    }

    private Conversation conversation() {
        Conversation conversation = new Conversation();
        conversation.setId(9L);
        conversation.setUserAId(1L);
        conversation.setUserBId(5L);
        conversation.setAUnread(0);
        conversation.setBUnread(0);
        return conversation;
    }

    private void authenticate(Long userId) {
        User user = new User();
        user.setId(userId);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
    }
}
