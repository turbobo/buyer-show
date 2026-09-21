package com.buyershow.service;

import com.buyershow.mapper.NotificationMapper;
import com.buyershow.realtime.RealtimeEventPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * NotificationService 单测：已读标记的委托与幂等语义。
 *
 * @author qinghang
 * @date 2026/09/21
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationMapper notificationMapper;

    @Mock
    private RealtimeEventPublisher realtimeEventPublisher;

    @InjectMocks
    private NotificationService notificationService;

    private static final Long USER_ID = 1L;
    private static final Long NOTIFICATION_ID = 100L;

    @Test
    void testMarkRead_delegatesToMapperWithOwnerScopedParams() {
        notificationService.markRead(USER_ID, NOTIFICATION_ID);

        // 归属校验由 SQL 的 user_id 条件承担，service 仅负责参数传递
        verify(notificationMapper).markRead(NOTIFICATION_ID, USER_ID);
    }

    @Test
    void testMarkRead_returnsWithoutErrorWhenAlreadyRead() {
        // 幂等：SQL 仅更新 is_read=0 的行，已读行受影响数为 0，不抛异常
        when(notificationMapper.markRead(NOTIFICATION_ID, USER_ID)).thenReturn(0);
        notificationService.markRead(USER_ID, NOTIFICATION_ID);

        verify(notificationMapper).markRead(NOTIFICATION_ID, USER_ID);
    }

    @Test
    void testMarkAllAsRead_delegatesToMapper() {
        notificationService.markAllAsRead(USER_ID);

        verify(notificationMapper).markAllAsRead(USER_ID);
        verify(notificationMapper, never()).markRead(NOTIFICATION_ID, USER_ID);
    }
}
