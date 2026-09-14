package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.response.NotificationDTO;
import com.buyershow.service.NotificationService;
import com.buyershow.common.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "通知管理")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "获取通知列表")
    @GetMapping
    public R<List<NotificationDTO>> getNotifications(
            @RequestParam(defaultValue = "20") int limit) {
        Long userId = SecurityUtils.getCurrentUserId();
        List<NotificationDTO> notifications = notificationService.getNotifications(userId, limit);
        return R.ok(notifications);
    }

    @Operation(summary = "获取未读通知数量")
    @GetMapping("/unread-count")
    public R<Map<String, Integer>> getUnreadCount() {
        Long userId = SecurityUtils.getCurrentUserId();
        int count = notificationService.getUnreadCount(userId);
        return R.ok(Map.of("count", count));
    }

    @Operation(summary = "标记所有通知为已读")
    @PostMapping("/mark-all-read")
    public R<Void> markAllAsRead() {
        Long userId = SecurityUtils.getCurrentUserId();
        notificationService.markAllAsRead(userId);
        return R.ok();
    }
}
