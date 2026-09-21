package com.buyershow.realtime;

import com.buyershow.dto.response.AnnouncementDTO;
import com.buyershow.dto.response.MessageDTO;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * 实时事件消费者测试（G11）：三类事件按 type 分发到对应 STOMP 目的地。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class RealtimeEventListenerTest {

    private final SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
    private final RealtimeEventListener listener = new RealtimeEventListener(messagingTemplate);

    @Test
    void testNotificationEventPushedToUserQueue() {
        RealtimeEvent event = RealtimeEvent.builder()
                .type(RealtimeEvent.TYPE_NOTIFICATION)
                .userId(42L)
                .notificationId(7L)
                .build();

        listener.onEvent(event);

        verify(messagingTemplate).convertAndSendToUser("42", "/queue/notifications", event);
    }

    @Test
    void testMessageEventPushedToUserQueue() {
        MessageDTO message = new MessageDTO();
        message.setId(11L);
        message.setConversationId(3L);
        RealtimeEvent event = RealtimeEvent.builder()
                .type(RealtimeEvent.TYPE_MESSAGE)
                .userId(42L)
                .message(message)
                .build();

        listener.onEvent(event);

        verify(messagingTemplate).convertAndSendToUser("42", "/queue/messages", message);
    }

    @Test
    void testAnnouncementEventBroadcastToTopic() {
        AnnouncementDTO announcement = new AnnouncementDTO();
        announcement.setId(5L);
        announcement.setTitle("公告");
        RealtimeEvent event = RealtimeEvent.builder()
                .type(RealtimeEvent.TYPE_ANNOUNCEMENT)
                .announcement(announcement)
                .build();

        listener.onEvent(event);

        verify(messagingTemplate).convertAndSend("/topic/announcements", announcement);
    }

    @Test
    void testUnknownTypeIgnored() {
        RealtimeEvent event = RealtimeEvent.builder().type("unknown.type").build();

        listener.onEvent(event);

        verifyNoInteractions(messagingTemplate);
    }
}
