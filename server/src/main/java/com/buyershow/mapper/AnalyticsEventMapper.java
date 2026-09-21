package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.AnalyticsEvent;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface AnalyticsEventMapper extends BaseMapper<AnalyticsEvent> {
    
    @Select("SELECT event_type, COUNT(*) as count FROM analytics_events " +
            "WHERE created_at >= #{startTime} AND created_at < #{endTime} " +
            "GROUP BY event_type ORDER BY count DESC")
    List<Map<String, Object>> countByEventType(
            @Param("startTime") String startTime,
            @Param("endTime") String endTime);

    @Select("SELECT COUNT(DISTINCT user_id) as count FROM analytics_events " +
            "WHERE created_at >= #{startTime} AND created_at < #{endTime} AND user_id IS NOT NULL")
    int countDistinctUsers(
            @Param("startTime") String startTime,
            @Param("endTime") String endTime);

    @Select("SELECT post_id, COUNT(*) as view_count FROM analytics_events " +
            "WHERE event_type = 'post_view' AND created_at >= #{startTime} AND created_at < #{endTime} " +
            "GROUP BY post_id ORDER BY view_count DESC LIMIT #{limit}")
    List<Map<String, Object>> getTopViewedPosts(
            @Param("startTime") String startTime,
            @Param("endTime") String endTime,
            @Param("limit") int limit);

    @Select("SELECT DATE(created_at) as date, COUNT(*) as count FROM analytics_events " +
            "WHERE event_type = #{eventType} AND created_at >= #{startTime} AND created_at < #{endTime} " +
            "GROUP BY DATE(created_at) ORDER BY date")
    List<Map<String, Object>> getEventTrend(
            @Param("eventType") String eventType,
            @Param("startTime") String startTime,
            @Param("endTime") String endTime);

    /**
     * 创作者互动趋势（G9）：本人帖子近 N 天按日聚合浏览/点赞/收藏/评论。
     * 点赞与收藏仅统计正向事件（metadata liked/favorited = true），取消事件不计。
     */
    @Select("SELECT DATE(ae.created_at) AS date, " +
            "SUM(CASE WHEN ae.event_type = 'post_view' THEN 1 ELSE 0 END) AS views, " +
            "SUM(CASE WHEN ae.event_type = 'post_like' " +
            "AND JSON_UNQUOTE(JSON_EXTRACT(ae.metadata, '$.liked')) = 'true' THEN 1 ELSE 0 END) AS likes, " +
            "SUM(CASE WHEN ae.event_type = 'post_favorite' " +
            "AND JSON_UNQUOTE(JSON_EXTRACT(ae.metadata, '$.favorited')) = 'true' THEN 1 ELSE 0 END) AS favorites, " +
            "SUM(CASE WHEN ae.event_type = 'comment_create' THEN 1 ELSE 0 END) AS comments " +
            "FROM analytics_events ae " +
            "JOIN posts p ON p.id = ae.post_id AND p.user_id = #{userId} " +
            "WHERE ae.created_at >= #{startTime} AND ae.created_at < #{endTime} " +
            "AND ae.event_type IN ('post_view', 'post_like', 'post_favorite', 'comment_create') " +
            "GROUP BY DATE(ae.created_at) ORDER BY date")
    List<Map<String, Object>> getCreatorTrend(
            @Param("userId") Long userId,
            @Param("startTime") String startTime,
            @Param("endTime") String endTime);

    /**
     * 创作者 Top 帖（G9）：本人帖子近 N 天浏览 Top N，附累计点赞/收藏数。
     */
    @Select("SELECT p.id AS postId, p.title AS title, " +
            "IFNULL(v.viewCount, 0) AS views, " +
            "p.like_count AS likeCount, p.favorite_count AS favoriteCount " +
            "FROM posts p " +
            "LEFT JOIN (" +
            "SELECT post_id, COUNT(*) AS viewCount FROM analytics_events " +
            "WHERE event_type = 'post_view' AND created_at >= #{startTime} AND created_at < #{endTime} " +
            "GROUP BY post_id" +
            ") v ON v.post_id = p.id " +
            "WHERE p.user_id = #{userId} AND p.status = 0 " +
            "ORDER BY views DESC, p.id DESC LIMIT #{limit}")
    List<Map<String, Object>> getCreatorTopPosts(
            @Param("userId") Long userId,
            @Param("startTime") String startTime,
            @Param("endTime") String endTime,
            @Param("limit") int limit);
}
