package com.buyershow.service;

import com.buyershow.dto.response.CreatorStatsDTO;
import com.buyershow.entity.User;
import com.buyershow.mapper.AnalyticsEventMapper;
import com.buyershow.mapper.PostMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 创作数据服务测试（G9）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class CreatorStatsServiceTest {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final AnalyticsEventMapper analyticsEventMapper = mock(AnalyticsEventMapper.class);
    private final PostMapper postMapper = mock(PostMapper.class);
    private final CreatorStatsService service = new CreatorStatsService(analyticsEventMapper, postMapper);

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testGetCreatorStatsBuildsPaddedTrendAndSummary() {
        authenticate(1L);
        when(postMapper.selectCreatorSummary(1L))
                .thenReturn(Map.of("postCount", 2L, "totalLikes", 10L, "totalFavorites", 5L, "totalComments", 8L));
        String today = LocalDate.now().format(DATE_FORMATTER);
        String yesterday = LocalDate.now().minusDays(1).format(DATE_FORMATTER);
        when(analyticsEventMapper.getCreatorTrend(eq(1L), anyString(), anyString())).thenReturn(List.of(
                Map.of("date", today, "views", 3L, "likes", 1L, "favorites", 0L, "comments", 2L),
                Map.of("date", yesterday, "views", 2L, "likes", 0L, "favorites", 1L, "comments", 0L)));
        when(analyticsEventMapper.getCreatorTopPosts(eq(1L), anyString(), anyString(), eq(5))).thenReturn(List.of(
                Map.of("postId", 10L, "title", "好物帖", "views", 3L, "likeCount", 1L, "favoriteCount", 0L)));

        CreatorStatsDTO stats = service.getCreatorStats(7);

        // 累计口径
        assertEquals(2L, stats.getSummary().getPostCount());
        assertEquals(10L, stats.getSummary().getTotalLikes());
        assertEquals(5L, stats.getSummary().getTotalFavorites());
        assertEquals(8L, stats.getSummary().getTotalComments());
        // 近 7 天阅读量 = 3 + 2
        assertEquals(5L, stats.getSummary().getTotalViews());

        // 趋势补零：7 个点，首日全 0，末日为今天
        assertEquals(7, stats.getTrend().size());
        CreatorStatsDTO.TrendPoint first = stats.getTrend().get(0);
        assertEquals(0L, first.getViews());
        assertEquals(0L, first.getLikes());
        CreatorStatsDTO.TrendPoint last = stats.getTrend().get(6);
        assertEquals(today, last.getDate());
        assertEquals(3L, last.getViews());
        assertEquals(2L, last.getComments());

        // Top 帖透传
        assertEquals(1, stats.getTopPosts().size());
        CreatorStatsDTO.TopPost top = stats.getTopPosts().get(0);
        assertEquals(10L, top.getPostId());
        assertEquals("好物帖", top.getTitle());
        assertEquals(3L, top.getViews());
        assertEquals(1L, top.getLikeCount());
    }

    @Test
    void testGetCreatorStatsSupports30DayWindow() {
        authenticate(1L);
        when(postMapper.selectCreatorSummary(1L))
                .thenReturn(Map.of("postCount", 0L, "totalLikes", 0L, "totalFavorites", 0L, "totalComments", 0L));
        when(analyticsEventMapper.getCreatorTrend(eq(1L), anyString(), anyString())).thenReturn(List.of());
        when(analyticsEventMapper.getCreatorTopPosts(eq(1L), anyString(), anyString(), eq(5))).thenReturn(List.of());

        CreatorStatsDTO stats = service.getCreatorStats(30);

        assertEquals(30, stats.getTrend().size());
    }

    @Test
    void testGetCreatorStatsNormalizesUnsupportedDaysTo7() {
        authenticate(1L);
        when(postMapper.selectCreatorSummary(1L))
                .thenReturn(Map.of("postCount", 0L, "totalLikes", 0L, "totalFavorites", 0L, "totalComments", 0L));
        when(analyticsEventMapper.getCreatorTrend(eq(1L), anyString(), anyString())).thenReturn(List.of());
        when(analyticsEventMapper.getCreatorTopPosts(eq(1L), anyString(), anyString(), eq(5))).thenReturn(List.of());

        CreatorStatsDTO stats = service.getCreatorStats(99);

        assertEquals(7, stats.getTrend().size());
    }

    @Test
    void testGetCreatorStatsEmptyDataReturnsZeros() {
        authenticate(1L);
        when(postMapper.selectCreatorSummary(1L)).thenReturn(Map.of());
        when(analyticsEventMapper.getCreatorTrend(eq(1L), anyString(), anyString())).thenReturn(List.of());
        when(analyticsEventMapper.getCreatorTopPosts(eq(1L), anyString(), anyString(), eq(5))).thenReturn(List.of());

        CreatorStatsDTO stats = service.getCreatorStats(7);

        assertEquals(0L, stats.getSummary().getPostCount());
        assertEquals(0L, stats.getSummary().getTotalViews());
        assertTrue(stats.getTopPosts().isEmpty());
        assertTrue(stats.getTrend().stream().allMatch(p -> p.getViews() == 0L && p.getLikes() == 0L));
    }

    @Test
    void testGetCreatorStatsRejectsNullTitleTopPost() {
        authenticate(1L);
        when(postMapper.selectCreatorSummary(1L))
                .thenReturn(Map.of("postCount", 1L, "totalLikes", 0L, "totalFavorites", 0L, "totalComments", 0L));
        when(analyticsEventMapper.getCreatorTrend(eq(1L), anyString(), anyString())).thenReturn(List.of());
        when(analyticsEventMapper.getCreatorTopPosts(eq(1L), anyString(), anyString(), eq(5))).thenReturn(List.of(
                Map.of("postId", 10L, "views", 1L, "likeCount", 0L, "favoriteCount", 0L)));

        CreatorStatsDTO stats = service.getCreatorStats(7);

        assertNull(stats.getTopPosts().get(0).getTitle());
    }

    @Test
    void testGetCreatorStatsThrowsWhenUnauthenticated() {
        assertThrows(IllegalStateException.class, () -> service.getCreatorStats(7));
    }

    private void authenticate(Long userId) {
        User user = new User();
        user.setId(userId);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
    }
}
