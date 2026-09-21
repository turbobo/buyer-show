package com.buyershow.service;

import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.response.CreatorStatsDTO;
import com.buyershow.mapper.AnalyticsEventMapper;
import com.buyershow.mapper.PostMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 创作数据服务（G9）：为创作者提供本人帖子的阅读/点赞/收藏/评论反馈。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CreatorStatsService {

    /** 趋势窗口支持的天数：7 或 30。 */
    private static final int[] SUPPORTED_WINDOWS = {7, 30};

    /** Top 帖返回条数。 */
    private static final int TOP_POST_LIMIT = 5;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AnalyticsEventMapper analyticsEventMapper;
    private final PostMapper postMapper;

    /**
     * 获取当前用户创作数据总览。
     *
     * @param days 趋势窗口天数，仅支持 7 或 30，其他值归一化为 7
     * @return 创作数据（summary/trend/topPosts）
     */
    public CreatorStatsDTO getCreatorStats(int days) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new IllegalStateException("creator-stats requires authenticated user");
        }

        int windowDays = normalizeWindow(days);
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(windowDays - 1L);
        String startTime = startDate.atStartOfDay().format(TIME_FORMATTER);
        String endTime = today.plusDays(1).atStartOfDay().format(TIME_FORMATTER);

        // 1) 累计口径汇总（帖子数/获赞/被收藏/评论）
        Map<String, Object> summaryRow = postMapper.selectCreatorSummary(userId);
        CreatorStatsDTO.Summary summary = new CreatorStatsDTO.Summary();
        summary.setPostCount(toLong(summaryRow.get("postCount")));
        summary.setTotalLikes(toLong(summaryRow.get("totalLikes")));
        summary.setTotalFavorites(toLong(summaryRow.get("totalFavorites")));
        summary.setTotalComments(toLong(summaryRow.get("totalComments")));

        // 2) 近 N 天逐日趋势（埋点聚合 + 补零）
        List<Map<String, Object>> trendRows = analyticsEventMapper.getCreatorTrend(userId, startTime, endTime);
        List<CreatorStatsDTO.TrendPoint> trend = buildTrend(startDate, today, trendRows);

        // 3) 近 N 天阅读量（汇总自趋势）
        summary.setTotalViews(trend.stream().mapToLong(CreatorStatsDTO.TrendPoint::getViews).sum());

        // 4) Top 帖
        List<Map<String, Object>> topRows =
                analyticsEventMapper.getCreatorTopPosts(userId, startTime, endTime, TOP_POST_LIMIT);
        List<CreatorStatsDTO.TopPost> topPosts = topRows.stream().map(this::toTopPost).toList();

        CreatorStatsDTO result = new CreatorStatsDTO();
        result.setSummary(summary);
        result.setTrend(trend);
        result.setTopPosts(topPosts);
        return result;
    }

    /** 仅支持 7/30 天窗口，其他值归一化为 7。 */
    private int normalizeWindow(int days) {
        for (int supported : SUPPORTED_WINDOWS) {
            if (days == supported) {
                return supported;
            }
        }
        return SUPPORTED_WINDOWS[0];
    }

    /** 逐日补零：窗口内每一天都返回一个趋势点，缺失日期各指标为 0。 */
    private List<CreatorStatsDTO.TrendPoint> buildTrend(
            LocalDate startDate, LocalDate today, List<Map<String, Object>> rows) {
        Map<String, Map<String, Object>> byDate = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Object dateValue = row.get("date");
            byDate.put(String.valueOf(dateValue), row);
        }

        List<CreatorStatsDTO.TrendPoint> trend = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(today); date = date.plusDays(1)) {
            String dateKey = date.format(DATE_FORMATTER);
            Map<String, Object> row = byDate.get(dateKey);
            CreatorStatsDTO.TrendPoint point = new CreatorStatsDTO.TrendPoint();
            point.setDate(dateKey);
            if (row != null) {
                point.setViews(toLong(row.get("views")));
                point.setLikes(toLong(row.get("likes")));
                point.setFavorites(toLong(row.get("favorites")));
                point.setComments(toLong(row.get("comments")));
            }
            trend.add(point);
        }
        return trend;
    }

    private CreatorStatsDTO.TopPost toTopPost(Map<String, Object> row) {
        CreatorStatsDTO.TopPost post = new CreatorStatsDTO.TopPost();
        post.setPostId(toLongOrNull(row.get("postId")));
        post.setTitle(row.get("title") == null ? null : String.valueOf(row.get("title")));
        post.setViews(toLong(row.get("views")));
        post.setLikeCount(toLong(row.get("likeCount")));
        post.setFavoriteCount(toLong(row.get("favoriteCount")));
        return post;
    }

    private long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private Long toLongOrNull(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }
}
