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
}
