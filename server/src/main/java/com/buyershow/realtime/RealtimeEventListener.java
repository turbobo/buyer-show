package com.buyershow.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * 实时事件消费者（G11）：消费本实例匿名队列中的广播事件，经 STOMP 推送到目标用户。
 * - 通知 → /user/{userId}/queue/notifications（轻量事件，前端刷未读与列表）
 * - 私信 → /user/{userId}/queue/messages（完整消息，前端直接插入会话）
 * - 公告 → /topic/announcements（广播给所有在线用户）
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimeEventListener {

    private final SimpMessagingTemplate messagingTemplate;

    @RabbitListener(queues = "#{eventQueue.name}")
    public void onEvent(RealtimeEvent event) {
        switch (event.getType()) {
            case RealtimeEvent.TYPE_NOTIFICATION -> messagingTemplate.convertAndSendToUser(
                    String.valueOf(event.getUserId()), "/queue/notifications", event);
            case RealtimeEvent.TYPE_MESSAGE -> messagingTemplate.convertAndSendToUser(
                    String.valueOf(event.getUserId()), "/queue/messages", event.getMessage());
            case RealtimeEvent.TYPE_ANNOUNCEMENT -> messagingTemplate.convertAndSend(
                    "/topic/announcements", event.getAnnouncement());
            default -> log.warn("Unknown realtime event type: {}", event.getType());
        }
    }
}
