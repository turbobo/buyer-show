package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.dto.response.ConversationDTO;
import com.buyershow.entity.Conversation;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 私信会话访问。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Mapper
public interface ConversationMapper extends BaseMapper<Conversation> {

    /**
     * 当前用户的会话列表（含对方信息、最后消息摘要与我的未读数，按最后消息时间倒序）。
     */
    @Select("SELECT c.id, "
            + "  CASE WHEN c.user_a_id = #{userId} THEN c.user_b_id ELSE c.user_a_id END AS peerId, "
            + "  u.nickname AS peerNickname, u.avatar_url AS peerAvatarUrl, "
            + "  m.content AS lastMessage, c.last_message_at AS lastMessageAt, "
            + "  CASE WHEN c.user_a_id = #{userId} THEN c.a_unread ELSE c.b_unread END AS unreadCount "
            + "FROM conversations c "
            + "JOIN users u ON u.id = CASE WHEN c.user_a_id = #{userId} THEN c.user_b_id ELSE c.user_a_id END "
            + "LEFT JOIN messages m ON m.id = c.last_message_id "
            + "WHERE (c.user_a_id = #{userId} OR c.user_b_id = #{userId}) AND c.last_message_at IS NOT NULL "
            + "ORDER BY c.last_message_at DESC LIMIT #{limit}")
    List<ConversationDTO> selectConversations(@Param("userId") Long userId, @Param("limit") int limit);
}
