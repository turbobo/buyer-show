package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.dto.response.NotificationDTO;
import com.buyershow.entity.Notification;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface NotificationMapper extends BaseMapper<Notification> {

    @Select("""
        SELECT n.id, n.type, n.content, n.is_read, n.created_at,
               n.target_type, n.target_id,
               u.id AS actor_id, u.nickname AS actor_nickname, u.avatar_url AS actor_avatar_url
        FROM notifications n
        LEFT JOIN users u ON n.actor_id = u.id
        WHERE n.user_id = #{userId}
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT #{limit}
    """)
    List<NotificationDTO> selectNotifications(@Param("userId") Long userId, @Param("limit") int limit);

    @Update("UPDATE notifications SET is_read = 1 WHERE user_id = #{userId} AND is_read = 0")
    int markAllAsRead(@Param("userId") Long userId);

    @Update("UPDATE notifications SET is_read = 1 WHERE id = #{id} AND user_id = #{userId} AND is_read = 0")
    int markRead(@Param("id") Long id, @Param("userId") Long userId);

    @Select("SELECT COUNT(*) FROM notifications WHERE user_id = #{userId} AND is_read = 0")
    int countUnread(@Param("userId") Long userId);
}
