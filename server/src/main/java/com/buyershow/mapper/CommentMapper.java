package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.dto.response.CommentDTO;
import com.buyershow.dto.response.UserCommentRow;
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
            + "u.nickname AS userNickname, u.avatar_url AS userAvatarUrl, "
            + "CASE WHEN #{viewerId} IS NOT NULL AND EXISTS ("
            + "  SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = #{viewerId}"
            + ") THEN 1 ELSE 0 END AS isLiked "
            + "FROM comments c JOIN users u ON u.id = c.user_id AND u.status = 0 "
            + "WHERE c.post_id = #{postId} AND c.parent_id IS NULL "
            + "AND c.status = 0 AND c.moderation_status = 0 "
            + "ORDER BY c.created_at, c.id LIMIT #{limit}")
    List<CommentDTO> selectVisibleRoots(@Param("postId") Long postId,
            @Param("viewerId") Long viewerId,
            @Param("limit") int limit);

    /** 热门排序（按点赞数倒序）的顶级评论。 */
    @Select("SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.parent_id AS parentId, "
            + "c.content, c.reply_count AS replyCount, c.like_count AS likeCount, "
            + "c.moderation_status AS moderationStatus, c.created_at AS createdAt, "
            + "u.nickname AS userNickname, u.avatar_url AS userAvatarUrl, "
            + "CASE WHEN #{viewerId} IS NOT NULL AND EXISTS ("
            + "  SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = #{viewerId}"
            + ") THEN 1 ELSE 0 END AS isLiked "
            + "FROM comments c JOIN users u ON u.id = c.user_id AND u.status = 0 "
            + "WHERE c.post_id = #{postId} AND c.parent_id IS NULL "
            + "AND c.status = 0 AND c.moderation_status = 0 "
            + "ORDER BY c.like_count DESC, c.created_at DESC, c.id DESC LIMIT #{limit}")
    List<CommentDTO> selectHotVisibleRoots(@Param("postId") Long postId,
            @Param("viewerId") Long viewerId,
            @Param("limit") int limit);

    @Select({
            "<script>",
            "SELECT c.id, c.post_id AS postId, c.user_id AS userId, c.parent_id AS parentId,",
            "       c.content, c.reply_count AS replyCount, c.like_count AS likeCount,",
            "       c.moderation_status AS moderationStatus, c.created_at AS createdAt,",
            "       u.nickname AS userNickname, u.avatar_url AS userAvatarUrl,",
            "       CASE WHEN #{viewerId} IS NOT NULL AND EXISTS (",
            "           SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = #{viewerId}",
            "       ) THEN 1 ELSE 0 END AS isLiked",
            "FROM comments c JOIN users u ON u.id = c.user_id AND u.status = 0",
            "WHERE c.parent_id IN",
            "<foreach collection='parentIds' item='parentId' open='(' separator=',' close=')'>",
            "  #{parentId}",
            "</foreach>",
            "AND c.status = 0 AND c.moderation_status = 0",
            "ORDER BY c.parent_id, c.created_at, c.id",
            "</script>"
    })
    List<CommentDTO> selectVisibleReplies(@Param("parentIds") List<Long> parentIds,
            @Param("viewerId") Long viewerId);

    /**
     * 当前用户的评论（含待审/未通过状态，仅本人可见，ID 游标倒序）。
     */
    @Select({
            "<script>",
            "SELECT c.id, c.post_id AS postId, p.title AS postTitle, c.content,",
            "       c.moderation_status AS moderationStatus, c.created_at AS createdAt",
            "FROM comments c JOIN posts p ON p.id = c.post_id AND p.status = 0",
            "WHERE c.user_id = #{userId} AND c.status = 0",
            "<if test='cursorId != null'>",
            "AND c.id &lt; #{cursorId}",
            "</if>",
            "ORDER BY c.id DESC LIMIT #{limit}",
            "</script>"
    })
    List<UserCommentRow> selectUserComments(@Param("userId") Long userId,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit);

    @Update("UPDATE posts SET comment_count = GREATEST(comment_count + #{delta}, 0) "
            + "WHERE id = #{postId} AND status = 0 AND moderation_status = 0")
    int adjustPostCommentCount(@Param("postId") Long postId, @Param("delta") int delta);

    @Update("UPDATE comments SET reply_count = GREATEST(reply_count + #{delta}, 0) "
            + "WHERE id = #{parentId} AND status = 0 AND moderation_status = 0")
    int adjustReplyCount(@Param("parentId") Long parentId, @Param("delta") int delta);

    @Update("UPDATE comments SET like_count = GREATEST(like_count + #{delta}, 0) "
            + "WHERE id = #{commentId} AND status = 0")
    int adjustCommentLikeCount(@Param("commentId") Long commentId, @Param("delta") int delta);

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
