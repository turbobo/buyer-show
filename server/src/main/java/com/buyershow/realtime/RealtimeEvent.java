package com.buyershow.realtime;

import com.buyershow.dto.response.AnnouncementDTO;
import com.buyershow.dto.response.MessageDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 实时事件（G11）：经 RabbitMQ fanout 广播到各实例，再由 STOMP 推送到目标用户。
 * 单一事件类承载三类事件，消费端按 type 分发。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RealtimeEvent {

    /** 事件类型：通知创建。 */
    public static final String TYPE_NOTIFICATION = "notification.created";
    /** 事件类型：私信发送。 */
    public static final String TYPE_MESSAGE = "message.sent";
    /** 事件类型：公告发布。 */
    public static final String TYPE_ANNOUNCEMENT = "announcement.published";

    private String type;

    /** 目标用户（通知/私信事件的接收者）。 */
    private Long userId;

    /** 通知事件：通知 ID（前端据此刷新未读与列表）。 */
    private Long notificationId;

    /** 私信事件：完整消息（前端直接插入会话）。 */
    private MessageDTO message;

    /** 公告事件：完整公告（广播给所有在线用户）。 */
    private AnnouncementDTO announcement;
}
