package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.dto.response.MessageDTO;
import com.buyershow.entity.Message;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * 私信消息访问。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Mapper
public interface MessageMapper extends BaseMapper<Message> {

    /** 历史消息（beforeId 之前，倒序返回，由服务层反转为正序展示）。 */
    @Select({
            "<script>",
            "SELECT id, conversation_id AS conversationId, sender_id AS senderId,",
            "       receiver_id AS receiverId, content, is_read AS isRead, created_at AS createdAt",
            "FROM messages WHERE conversation_id = #{conversationId}",
            "<if test='beforeId != null'> AND id &lt; #{beforeId} </if>",
            "ORDER BY id DESC LIMIT #{limit}",
            "</script>"
    })
    List<MessageDTO> selectMessages(@Param("conversationId") Long conversationId,
            @Param("beforeId") Long beforeId,
            @Param("limit") int limit);

    /** 增量消息（afterId 之后，正序，用于轮询拉新）。 */
    @Select("SELECT id, conversation_id AS conversationId, sender_id AS senderId, "
            + "receiver_id AS receiverId, content, is_read AS isRead, created_at AS createdAt "
            + "FROM messages WHERE conversation_id = #{conversationId} AND id > #{afterId} "
            + "ORDER BY id ASC LIMIT 200")
    List<MessageDTO> selectMessagesAfter(@Param("conversationId") Long conversationId,
            @Param("afterId") Long afterId);

    /** 将会话内对方发给我的消息标记为已读。 */
    @Update("UPDATE messages SET is_read = 1 "
            + "WHERE conversation_id = #{conversationId} AND receiver_id = #{userId} AND is_read = 0")
    int markReadInConversation(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}
