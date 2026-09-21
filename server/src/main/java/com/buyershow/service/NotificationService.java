package com.buyershow.service;

import com.buyershow.dto.response.NotificationDTO;
import com.buyershow.entity.Notification;
import com.buyershow.mapper.NotificationMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationMapper notificationMapper;

    public List<NotificationDTO> getNotifications(Long userId, int limit) {
        return notificationMapper.selectNotifications(userId, Math.min(limit, 50));
    }

    public int getUnreadCount(Long userId) {
        return notificationMapper.countUnread(userId);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationMapper.markAllAsRead(userId);
    }

    /**
     * 创建点赞通知（异步）。
     */
    @Async
    public void notifyLike(Long postOwnerId, Long actorId, Long postId, String postTitle) {
        if (postOwnerId.equals(actorId)) return; // 不通知自己
        try {
            Notification notification = new Notification();
            notification.setUserId(postOwnerId);
            notification.setType("like");
            notification.setActorId(actorId);
            notification.setTargetType("post");
            notification.setTargetId(postId);
            notification.setContent(postTitle != null ? postTitle.substring(0, Math.min(50, postTitle.length())) : "");
            notificationMapper.insert(notification);
        } catch (Exception e) {
            log.warn("Failed to create like notification: {}", e.getMessage());
        }
    }

    /**
     * 创建评论通知（异步）。
     */
    @Async
    public void notifyComment(Long postOwnerId, Long actorId, Long postId, String commentContent) {
        if (postOwnerId.equals(actorId)) return;
        try {
            Notification notification = new Notification();
            notification.setUserId(postOwnerId);
            notification.setType("comment");
            notification.setActorId(actorId);
            notification.setTargetType("post");
            notification.setTargetId(postId);
            notification.setContent(commentContent != null ? commentContent.substring(0, Math.min(100, commentContent.length())) : "");
            notificationMapper.insert(notification);
        } catch (Exception e) {
            log.warn("Failed to create comment notification: {}", e.getMessage());
        }
    }

    /**
     * 创建关注通知（异步）。
     */
    @Async
    public void notifyFollow(Long followeeId, Long followerId) {
        if (followeeId.equals(followerId)) return;
        try {
            Notification notification = new Notification();
            notification.setUserId(followeeId);
            notification.setType("follow");
            notification.setActorId(followerId);
            notificationMapper.insert(notification);
        } catch (Exception e) {
            log.warn("Failed to create follow notification: {}", e.getMessage());
        }
    }

    /**
     * 创建提及通知（G4：帖子正文 @提及，异步）。
     */
    @Async
    public void notifyMention(Long mentionedUserId, Long actorId, Long postId, String postTitle) {
        if (mentionedUserId.equals(actorId)) {
            return; // 不通知自己
        }
        try {
            Notification notification = new Notification();
            notification.setUserId(mentionedUserId);
            notification.setType("mention");
            notification.setActorId(actorId);
            notification.setTargetType("post");
            notification.setTargetId(postId);
            notification.setContent(postTitle != null ? postTitle.substring(0, Math.min(50, postTitle.length())) : "");
            notificationMapper.insert(notification);
        } catch (Exception e) {
            log.warn("Failed to create mention notification: {}", e.getMessage());
        }
    }

    /**
     * 创建系统通知（异步）：审批结果、系统提示等。
     * 一般由管理员操作触发；content 直接展示给用户。
     *
     * @param userId 接收者
     * @param content 通知内容（≤500 字）
     * @param targetType 跳转目标类型（post / 空）
     * @param targetId 跳转目标ID（可空）
     */
    @Async
    public void notifySystem(Long userId, String content, String targetType, Long targetId) {
        try {
            Notification notification = new Notification();
            notification.setUserId(userId);
            notification.setType("system");
            notification.setTargetType(targetType);
            notification.setTargetId(targetId);
            notification.setContent(content != null ? content.substring(0, Math.min(500, content.length())) : "");
            notificationMapper.insert(notification);
        } catch (Exception e) {
            log.warn("Failed to create system notification: {}", e.getMessage());
        }
    }
}
