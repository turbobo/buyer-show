package com.buyershow.dto.response;

import lombok.Data;

import java.util.List;

/**
 * 创作数据总览（G9）：本人帖子近 N 天的互动统计，仅本人可见。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class CreatorStatsDTO {

    /** 汇总卡片：帖子数/近 N 天阅读为窗口口径，获赞/被收藏/评论为累计口径。 */
    private Summary summary;

    /** 近 N 天逐日趋势（含补零）。 */
    private List<TrendPoint> trend;

    /** 近 N 天浏览 Top5 帖子。 */
    private List<TopPost> topPosts;

    /** 汇总指标。 */
    @Data
    public static class Summary {
        /** 全部未删除帖子数（含待审，本人视角）。 */
        private long postCount;
        /** 近 N 天阅读量（post_view 埋点求和）。 */
        private long totalViews;
        /** 累计获赞（Σ like_count）。 */
        private long totalLikes;
        /** 累计被收藏（Σ favorite_count）。 */
        private long totalFavorites;
        /** 累计收到评论（Σ comment_count）。 */
        private long totalComments;
    }

    /** 单日趋势点。 */
    @Data
    public static class TrendPoint {
        /** 日期 yyyy-MM-dd。 */
        private String date;
        private long views;
        private long likes;
        private long favorites;
        private long comments;
    }

    /** Top 帖子条目。 */
    @Data
    public static class TopPost {
        private Long postId;
        private String title;
        /** 近 N 天阅读量。 */
        private long views;
        /** 累计点赞数。 */
        private long likeCount;
        /** 累计收藏数。 */
        private long favoriteCount;
    }
}
