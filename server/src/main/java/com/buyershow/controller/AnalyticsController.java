package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.RecordEventsRequest;
import com.buyershow.entity.AnalyticsEvent;
import com.buyershow.service.AnalyticsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final ObjectMapper objectMapper;

    /**
     * 批量记录事件（前端调用）
     */
    @PostMapping("/events")
    public R<Void> recordEvents(
            @RequestBody RecordEventsRequest request,
            HttpServletRequest httpRequest) {
        
        String ipAddress = getClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        List<AnalyticsEvent> events = request.getEvents().stream()
                .map(dto -> {
                    AnalyticsEvent event = new AnalyticsEvent();
                    event.setEventType(dto.getType());
                    event.setUserId(dto.getUserId());
                    event.setPostId(dto.getPostId());
                    event.setCommentId(dto.getCommentId());
                    event.setTargetUserId(dto.getTargetUserId());
                    event.setSessionId(dto.getSessionId());
                    event.setIpAddress(ipAddress);
                    event.setUserAgent(userAgent);
                    event.setReferrer(dto.getReferrer());
                    
                    if (dto.getMetadata() != null) {
                        try {
                            event.setMetadata(objectMapper.writeValueAsString(dto.getMetadata()));
                        } catch (Exception e) {
                            log.warn("Failed to serialize metadata: {}", e.getMessage());
                        }
                    }
                    
                    return event;
                })
                .toList();

        analyticsService.recordEvents(events);
        return R.ok();
    }

    /**
     * 接收前端性能指标（web-vitals，未登录也可上报）。
     */
    @PostMapping("/performance")
    public R<Void> recordPerformance(@RequestBody Map<String, Object> metrics) {
        analyticsService.recordPerformance(metrics);
        return R.ok();
    }

    /**
     * 获取概览数据（管理员）
     */
    @GetMapping("/overview")
    public R<Map<String, Object>> getOverview() {
        return R.ok(analyticsService.getOverview());
    }

    /**
     * 获取事件统计（管理员）
     */
    @GetMapping("/stats")
    public R<List<Map<String, Object>>> getStats(
            @RequestParam(defaultValue = "7") int days) {
        
        LocalDate endDate = LocalDate.now().plusDays(1);
        LocalDate startDate = endDate.minusDays(days);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        String startTime = startDate.atStartOfDay().format(formatter);
        String endTime = endDate.atStartOfDay().format(formatter);

        return R.ok(analyticsService.getEventStats(startTime, endTime));
    }

    /**
     * 获取热门帖子（管理员）
     */
    @GetMapping("/top-posts")
    public R<List<Map<String, Object>>> getTopPosts(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "10") int limit) {
        
        LocalDate endDate = LocalDate.now().plusDays(1);
        LocalDate startDate = endDate.minusDays(days);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        String startTime = startDate.atStartOfDay().format(formatter);
        String endTime = endDate.atStartOfDay().format(formatter);

        return R.ok(analyticsService.getTopViewedPosts(startTime, endTime, limit));
    }

    /**
     * 获取事件趋势（管理员）
     */
    @GetMapping("/trend")
    public R<List<Map<String, Object>>> getTrend(
            @RequestParam String eventType,
            @RequestParam(defaultValue = "30") int days) {
        
        LocalDate endDate = LocalDate.now().plusDays(1);
        LocalDate startDate = endDate.minusDays(days);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        String startTime = startDate.atStartOfDay().format(formatter);
        String endTime = endDate.atStartOfDay().format(formatter);

        return R.ok(analyticsService.getEventTrend(eventType, startTime, endTime));
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
