package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.response.AnnouncementDTO;
import com.buyershow.entity.Announcement;
import com.buyershow.mapper.AnnouncementMapper;
import com.buyershow.realtime.RealtimeEvent;
import com.buyershow.realtime.RealtimeEventPublisher;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 系统公告服务测试（G11）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class AnnouncementServiceTest {

    private final AnnouncementMapper announcementMapper = mock(AnnouncementMapper.class);
    private final RealtimeEventPublisher realtimeEventPublisher = mock(RealtimeEventPublisher.class);
    private final AnnouncementService service = new AnnouncementService(announcementMapper, realtimeEventPublisher);

    @Test
    void testCreateDraftDoesNotPublish() {
        Announcement result = service.create("标题", "正文", 0);

        assertEquals(0, result.getStatus());
        verify(announcementMapper).insert(any(Announcement.class));
        verify(realtimeEventPublisher, never()).publish(any(RealtimeEvent.class));
    }

    @Test
    void testCreatePublishedBroadcasts() {
        when(announcementMapper.insert(any(Announcement.class))).thenAnswer(invocation -> {
            invocation.<Announcement>getArgument(0).setId(9L);
            return 1;
        });

        Announcement result = service.create("新公告", "内容", 1);

        assertEquals(1, result.getStatus());
        ArgumentCaptor<RealtimeEvent> captor = ArgumentCaptor.forClass(RealtimeEvent.class);
        verify(realtimeEventPublisher).publish(captor.capture());
        RealtimeEvent event = captor.getValue();
        assertEquals(RealtimeEvent.TYPE_ANNOUNCEMENT, event.getType());
        assertEquals("新公告", event.getAnnouncement().getTitle());
        assertEquals("内容", event.getAnnouncement().getContent());
    }

    @Test
    void testCreateRejectsOfflineStatus() {
        BusinessException exception = assertThrows(
                BusinessException.class, () -> service.create("标题", "正文", 2));

        assertEquals(ErrorCode.ANNOUNCEMENT_STATUS_INVALID.getCode(), exception.getCode());
        verify(announcementMapper, never()).insert(any(Announcement.class));
    }

    @Test
    void testCreateRejectsInvalidStatus() {
        BusinessException exception = assertThrows(
                BusinessException.class, () -> service.create("标题", "正文", 9));

        assertEquals(ErrorCode.ANNOUNCEMENT_STATUS_INVALID.getCode(), exception.getCode());
    }

    @Test
    void testCreateRejectsBlankTitle() {
        BusinessException exception = assertThrows(
                BusinessException.class, () -> service.create("  ", "正文", 0));

        assertEquals(ErrorCode.PARAM_MISSING.getCode(), exception.getCode());
    }

    @Test
    void testUpdateDraftToPublishedBroadcasts() {
        Announcement existing = new Announcement();
        existing.setId(5L);
        existing.setTitle("旧标题");
        existing.setContent("旧正文");
        existing.setStatus(0);
        when(announcementMapper.selectById(5L)).thenReturn(existing);

        Announcement result = service.update(5L, "新标题", null, 1);

        assertEquals(1, result.getStatus());
        assertEquals("新标题", result.getTitle());
        verify(realtimeEventPublisher).publish(any(RealtimeEvent.class));
    }

    @Test
    void testUpdatePublishedToPublishedDoesNotRepublish() {
        Announcement existing = new Announcement();
        existing.setId(5L);
        existing.setTitle("标题");
        existing.setContent("正文");
        existing.setStatus(1);
        when(announcementMapper.selectById(5L)).thenReturn(existing);

        service.update(5L, null, null, 1);

        verify(announcementMapper).updateById(any(Announcement.class));
        verify(realtimeEventPublisher, never()).publish(any(RealtimeEvent.class));
    }

    @Test
    void testOfflineSetsStatus() {
        Announcement existing = new Announcement();
        existing.setId(5L);
        existing.setStatus(1);
        when(announcementMapper.selectById(5L)).thenReturn(existing);

        service.offline(5L);

        assertEquals(2, existing.getStatus());
        verify(announcementMapper).updateById(existing);
        verify(realtimeEventPublisher, never()).publish(any(RealtimeEvent.class));
    }

    @Test
    void testDeleteMissingAnnouncement() {
        when(announcementMapper.selectById(99L)).thenReturn(null);

        BusinessException exception = assertThrows(BusinessException.class, () -> service.delete(99L));

        assertEquals(ErrorCode.ANNOUNCEMENT_NOT_FOUND.getCode(), exception.getCode());
    }

    @Test
    void testLatestReturnsNullWhenNoPublished() {
        when(announcementMapper.selectLatestPublished()).thenReturn(null);

        assertNull(service.latest());
    }

    @Test
    void testLatestReturnsPublishedDto() {
        Announcement published = new Announcement();
        published.setId(3L);
        published.setTitle("公告");
        published.setContent("内容");
        published.setStatus(1);
        when(announcementMapper.selectLatestPublished()).thenReturn(published);

        AnnouncementDTO dto = service.latest();

        assertEquals(3L, dto.getId());
        assertEquals("公告", dto.getTitle());
        assertEquals(1, dto.getStatus());
    }
}
