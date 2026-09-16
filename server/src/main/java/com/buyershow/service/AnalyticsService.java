package com.buyershow.service;

import com.buyershow.entity.AnalyticsEvent;
import com.buyershow.mapper.AnalyticsEventMapper;
import com.buyershow.common.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final AnalyticsEventMapper analyticsEventMapper;
    private final ObjectMapper objectMapper;

    /**
     * 批量记录事件（异步）
     */
    @Async
    public void recordEvents(List<AnalyticsEvent> events) {
        for (AnalyticsEvent event : events) {
            try {
                analyticsEventMapper.insert(event);
            } catch (Exception e) {
                log.warn("Failed to record analytics event: {}", e.getMessage());
            }
        }
    }

    /**
     * 记录前端性能指标（web-vitals），作为 performance 事件落库（未登录也可上报）。
     *
     * @param metrics 性能指标（cls/fid/lcp/inp/ttfb 等）
     */
    public void recordPerformance(Map<String, Object> metrics) {
        if (metrics == null || metrics.isEmpty()) {
            return;
        }
        try {
            AnalyticsEvent event = new AnalyticsEvent();
            event.setEventType("performance");
            event.setUserId(SecurityUtils.getCurrentUserId());
            event.setMetadata(objectMapper.writeValueAsString(metrics));
            analyticsEventMapper.insert(event);
        } catch (Exception e) {
            log.warn("Failed to record performance metrics: {}", e.getMessage());
        }
    }

    /**
     * 获取事件统计（按类型）
     */
    public List<Map<String, Object>> getEventStats(String startTime, String endTime) {
        return analyticsEventMapper.countByEventType(startTime, endTime);
    }

    /**
     * 获取活跃用户数
     */
    public int getActiveUsers(String startTime, String endTime) {
        return analyticsEventMapper.countDistinctUsers(startTime, endTime);
    }

    /**
     * 获取热门帖子
     */
    public List<Map<String, Object>> getTopViewedPosts(String startTime, String endTime, int limit) {
        return analyticsEventMapper.getTopViewedPosts(startTime, endTime, limit);
    }

    /**
     * 获取事件趋势
     */
    public List<Map<String, Object>> getEventTrend(String eventType, String startTime, String endTime) {
        return analyticsEventMapper.getEventTrend(eventType, startTime, endTime);
    }

    /**
     * 获取概览数据
     */
    public Map<String, Object> getOverview() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDate last7Days = today.minusDays(7);
        LocalDate last30Days = today.minusDays(30);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        Map<String, Object> overview = new HashMap<>();

        // 今日数据
        String todayStart = today.atStartOfDay().format(formatter);
        String todayEnd = today.plusDays(1).atStartOfDay().format(formatter);
        overview.put("todayActiveUsers", analyticsEventMapper.countDistinctUsers(todayStart, todayEnd));
        overview.put("todayEvents", analyticsEventMapper.countByEventType(todayStart, todayEnd));

        // 昨日数据
        String yesterdayStart = yesterday.atStartOfDay().format(formatter);
        String yesterdayEnd = today.atStartOfDay().format(formatter);
        overview.put("yesterdayActiveUsers", analyticsEventMapper.countDistinctUsers(yesterdayStart, yesterdayEnd));

        // 近7天数据
        String last7DaysStart = last7Days.atStartOfDay().format(formatter);
        overview.put("last7DaysActiveUsers", analyticsEventMapper.countDistinctUsers(last7DaysStart, todayEnd));

        // 近30天数据
        String last30DaysStart = last30Days.atStartOfDay().format(formatter);
        overview.put("last30DaysActiveUsers", analyticsEventMapper.countDistinctUsers(last30DaysStart, todayEnd));

        return overview;
    }
}
