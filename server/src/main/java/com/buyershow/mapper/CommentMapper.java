package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.dto.response.CommentDTO;
import com.buyershow.entity.Comment;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface CommentMapper extends BaseMapper<Comment> {

    @Select("SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.parent_id AS parentId, "
            + "c.content, c.reply_count AS replyCount, c.like_count AS likeCount, "
            + "c.moderation_status AS moderationStatus, c.created_at AS createdAt, "
            + "u.nickname AS userNickname, u.avatar_url AS userAvatarUrl "
            + "FROM comments c JOIN users u ON u.id = c.user_id AND u.status = 0 "
            + "WHERE c.post_id = #{postId} AND c.parent_id IS NULL "
            + "AND c.status = 0 AND c.moderation_status = 0 "
            + "ORDER BY c.created_at, c.id LIMIT #{limit}")
    List<CommentDTO> selectVisibleRoots(@Param("postId") Long postId, @Param("limit") int limit);

    @Select({
            "<script>",
            "SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.parent_id AS parentId,",
            "       c.content, c.reply_count AS replyCount, c.like_count AS likeCount,",
            "       c.moderation_status AS moderationStatus, c.created_at AS createdAt,",
            "       u.nickname AS userNickname, u.avatar_url AS userAvatarUrl",
            "FROM comments c JOIN users u ON u.id = c.user_id AND u.status = 0",
            "WHERE c.parent_id IN",
            "<foreach collection='parentIds' item='parentId' open='(' separator=',' close=')'>",
            "  #{parentId}",
            "</foreach>",
            "AND c.status = 0 AND c.moderation_status = 0",
            "ORDER BY c.parent_id, c.created_at, c.id",
            "</script>"
    })
    List<CommentDTO> selectVisibleReplies(@Param("parentIds") List<Long> parentIds);

    @Update("UPDATE posts SET comment_count = GREATEST(comment_count + #{delta}, 0) "
            + "WHERE id = #{postId} AND status = 0 AND moderation_status = 0")
    int adjustPostCommentCount(@Param("postId") Long postId, @Param("delta") int delta);

    @Update("UPDATE comments SET reply_count = GREATEST(reply_count + #{delta}, 0) "
            + "WHERE id = #{parentId} AND status = 0 AND moderation_status = 0")
    int adjustReplyCount(@Param("parentId") Long parentId, @Param("delta") int delta);

    @Update("UPDATE comments SET status = 1 WHERE id = #{commentId} AND status = 0")
    int softDeleteActive(@Param("commentId") Long commentId);

    @Select("SELECT COUNT(*) FROM comments WHERE (id = #{rootId} OR parent_id = #{rootId}) "
            + "AND status = 0 AND moderation_status = 0")
    int countApprovedThread(@Param("rootId") Long rootId);

    @Update("UPDATE comments SET status = 1 WHERE (id = #{rootId} OR parent_id = #{rootId}) AND status = 0")
    int softDeleteThread(@Param("rootId") Long rootId);

    @Update("UPDATE comments SET moderation_status = 2, moderation_reason = #{reason}, "
            + "moderated_by = #{adminId}, moderated_at = #{moderatedAt} "
            + "WHERE (id = #{rootId} OR parent_id = #{rootId}) AND status = 0 AND moderation_status = 0")
    int rejectApprovedThread(
            @Param("rootId") Long rootId,
            @Param("reason") String reason,
            @Param("adminId") Long adminId,
            @Param("moderatedAt") LocalDateTime moderatedAt);

    @Update("UPDATE comments SET moderation_status = #{newStatus}, moderation_reason = #{reason}, "
            + "moderated_by = #{adminId}, moderated_at = #{moderatedAt} "
            + "WHERE id = #{commentId} AND status = 0 AND moderation_status = 1")
    int moderatePending(
            @Param("commentId") Long commentId,
            @Param("newStatus") int newStatus,
            @Param("reason") String reason,
            @Param("adminId") Long adminId,
            @Param("moderatedAt") LocalDateTime moderatedAt);
}
