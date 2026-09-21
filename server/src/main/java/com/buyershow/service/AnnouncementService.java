package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.response.AnnouncementDTO;
import com.buyershow.entity.Announcement;
import com.buyershow.mapper.AnnouncementMapper;
import com.buyershow.realtime.RealtimeEvent;
import com.buyershow.realtime.RealtimeEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 系统公告服务（G11）：管理端 CRUD + 公开端最近一条已发布公告。
 * 公告发布（草稿→已发布）时经 RabbitMQ 广播 STOMP 推送。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnnouncementService {

    /** 状态：草稿。 */
    public static final int STATUS_DRAFT = 0;
    /** 状态：已发布。 */
    public static final int STATUS_PUBLISHED = 1;
    /** 状态：已下线。 */
    public static final int STATUS_OFFLINE = 2;

    private static final int TITLE_MAX = 100;
    private static final int CONTENT_MAX = 2000;

    private final AnnouncementMapper announcementMapper;
    private final RealtimeEventPublisher realtimeEventPublisher;

    /** 公开端：最近一条已发布公告（无则返回 null）。 */
    public AnnouncementDTO latest() {
        Announcement announcement = announcementMapper.selectLatestPublished();
        return announcement == null ? null : toDTO(announcement);
    }

    /** 管理端：全部公告（新在前）。 */
    public List<Announcement> listAll() {
        return announcementMapper.selectAll();
    }

    /** 创建公告（草稿不推送；直接发布则广播）。 */
    public Announcement create(String title, String content, Integer status) {
        Announcement announcement = new Announcement();
        announcement.setTitle(requireText(title, TITLE_MAX));
        announcement.setContent(requireText(content, CONTENT_MAX));
        int normalizedStatus = normalizeCreateStatus(status);
        announcement.setStatus(normalizedStatus);
        announcementMapper.insert(announcement);
        log.info("Admin created announcement: id={}, status={}", announcement.getId(), normalizedStatus);
        if (normalizedStatus == STATUS_PUBLISHED) {
            publishRealtime(announcement);
        }
        return announcement;
    }

    /** 更新公告（状态迁移到已发布时广播；已发布→已发布不重复推送）。 */
    public Announcement update(Long id, String title, String content, Integer status) {
        Announcement announcement = requireAnnouncement(id);
        if (title != null && !title.isBlank()) {
            announcement.setTitle(requireText(title, TITLE_MAX));
        }
        if (content != null && !content.isBlank()) {
            announcement.setContent(requireText(content, CONTENT_MAX));
        }
        boolean publishNow = false;
        if (status != null) {
            int normalizedStatus = normalizeStatus(status);
            publishNow = normalizedStatus == STATUS_PUBLISHED && announcement.getStatus() != STATUS_PUBLISHED;
            announcement.setStatus(normalizedStatus);
        }
        announcementMapper.updateById(announcement);
        log.info("Admin updated announcement: id={}, status={}", announcement.getId(), announcement.getStatus());
        if (publishNow) {
            publishRealtime(announcement);
        }
        return announcement;
    }

    /** 下线公告（状态置 2，公开端不再展示）。 */
    public void offline(Long id) {
        Announcement announcement = requireAnnouncement(id);
        announcement.setStatus(STATUS_OFFLINE);
        announcementMapper.updateById(announcement);
        log.info("Admin offlined announcement: id={}", id);
    }

    /** 删除公告（物理删除，公告无关联数据）。 */
    public void delete(Long id) {
        requireAnnouncement(id);
        announcementMapper.deleteById(id);
        log.info("Admin deleted announcement: id={}", id);
    }

    private void publishRealtime(Announcement announcement) {
        realtimeEventPublisher.publish(RealtimeEvent.builder()
                .type(RealtimeEvent.TYPE_ANNOUNCEMENT)
                .announcement(toDTO(announcement))
                .build());
    }

    private Announcement requireAnnouncement(Long id) {
        Announcement announcement = announcementMapper.selectById(id);
        if (announcement == null) {
            throw new BusinessException(ErrorCode.ANNOUNCEMENT_NOT_FOUND);
        }
        return announcement;
    }

    /** 创建仅允许草稿/已发布。 */
    private int normalizeCreateStatus(Integer status) {
        int value = normalizeStatus(status);
        if (value == STATUS_OFFLINE) {
            throw new BusinessException(ErrorCode.ANNOUNCEMENT_STATUS_INVALID, "新建公告仅支持草稿或直接发布");
        }
        return value;
    }

    private int normalizeStatus(Integer status) {
        if (status == null || (status != STATUS_DRAFT && status != STATUS_PUBLISHED && status != STATUS_OFFLINE)) {
            throw new BusinessException(ErrorCode.ANNOUNCEMENT_STATUS_INVALID);
        }
        return status;
    }

    private String requireText(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_MISSING);
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new BusinessException(ErrorCode.PARAM_INVALID);
        }
        return normalized;
    }

    private AnnouncementDTO toDTO(Announcement announcement) {
        AnnouncementDTO dto = new AnnouncementDTO();
        dto.setId(announcement.getId());
        dto.setTitle(announcement.getTitle());
        dto.setContent(announcement.getContent());
        dto.setStatus(announcement.getStatus());
        dto.setCreatedAt(announcement.getCreatedAt());
        dto.setUpdatedAt(announcement.getUpdatedAt());
        return dto;
    }
}
