package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.dto.response.PostQueryRow;
import com.buyershow.entity.Post;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface PostMapper extends BaseMapper<Post> {

    @Select({
            "<script>",
            "SELECT STRAIGHT_JOIN p.id, p.user_id AS userId, p.title,",
            "       CAST(p.images AS CHAR) AS imagesJson,",
            "       CAST(p.tags AS CHAR) AS tagsJson,",
            "       p.product_name AS productName, p.product_price AS productPrice,",
            "       p.product_source AS productSource, p.product_rating AS productRating,",
            "       p.like_count AS likeCount, p.comment_count AS commentCount,",
            "       p.favorite_count AS favoriteCount, p.moderation_status AS moderationStatus, p.created_at AS createdAt,",
            "       u.nickname AS userNickname, u.avatar_url AS userAvatarUrl,",
            "       EXISTS(SELECT 1 FROM likes l WHERE l.user_id = #{currentUserId} AND l.post_id = p.id) AS liked,",
            "       EXISTS(SELECT 1 FROM favorites f WHERE f.user_id = #{currentUserId} AND f.post_id = p.id) AS favorited",
            "FROM posts p FORCE INDEX (idx_post_feed)",
            "JOIN users u ON u.id = p.user_id AND u.status = 0",
            "WHERE p.status = 0 AND p.moderation_status = 0",
            "<if test='tag != null and tag != \"\"'>",
            "  AND JSON_CONTAINS(p.tags, JSON_QUOTE(#{tag}))",
            "</if>",
            "<if test='cursorId != null'>",
            "  AND p.id &lt; #{cursorId}",
            "</if>",
            "ORDER BY p.id DESC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<PostQueryRow> selectFeedRows(
            @Param("cursorId") Long cursorId,
            @Param("tag") String tag,
            @Param("limit") int limit,
            @Param("currentUserId") Long currentUserId);

    @Select({
            "SELECT p.id, p.user_id AS userId, p.title, p.content,",
            "       CAST(p.images AS CHAR) AS imagesJson,",
            "       CAST(p.tags AS CHAR) AS tagsJson,",
            "       p.product_name AS productName, p.product_price AS productPrice,",
            "       p.product_source AS productSource, p.product_rating AS productRating,",
            "       p.like_count AS likeCount, p.comment_count AS commentCount,",
            "       p.favorite_count AS favoriteCount, p.moderation_status AS moderationStatus, p.created_at AS createdAt,",
            "       u.nickname AS userNickname, u.avatar_url AS userAvatarUrl,",
            "       IF(l.id IS NULL, 0, 1) AS liked,",
            "       IF(f.id IS NULL, 0, 1) AS favorited",
            "FROM posts p",
            "JOIN users u ON u.id = p.user_id AND u.status = 0",
            "LEFT JOIN likes l ON l.user_id = #{currentUserId} AND l.post_id = p.id",
            "LEFT JOIN favorites f ON f.user_id = #{currentUserId} AND f.post_id = p.id",
            "WHERE p.id = #{postId} AND p.status = 0",
            "  AND (p.moderation_status = 0 OR p.user_id = #{currentUserId})",
            "LIMIT 1"
    })
    PostQueryRow selectPostDetailRow(
            @Param("postId") Long postId,
            @Param("currentUserId") Long currentUserId);

    @Update("UPDATE posts SET status = 2 WHERE id = #{postId} AND user_id = #{userId} AND status <> 2")
    int softDeleteOwned(@Param("postId") Long postId, @Param("userId") Long userId);

    @Update("UPDATE posts SET status = 2 WHERE id = #{postId} AND status <> 2")
    int softDeleteAsAdmin(@Param("postId") Long postId);

    @Update("UPDATE posts SET like_count = GREATEST(like_count + #{delta}, 0) "
            + "WHERE id = #{postId} AND status = 0 AND moderation_status = 0")
    int adjustLikeCount(@Param("postId") Long postId, @Param("delta") int delta);

    @Update("UPDATE posts SET favorite_count = GREATEST(favorite_count + #{delta}, 0) "
            + "WHERE id = #{postId} AND status = 0 AND moderation_status = 0")
    int adjustFavoriteCount(@Param("postId") Long postId, @Param("delta") int delta);

    @Update("UPDATE posts SET moderation_status = #{newStatus}, moderation_reason = #{reason}, "
            + "moderated_by = #{adminId}, moderated_at = #{moderatedAt} "
            + "WHERE id = #{postId} AND status = 0 AND moderation_status = 1")
    int moderatePending(
            @Param("postId") Long postId,
            @Param("newStatus") int newStatus,
            @Param("reason") String reason,
            @Param("adminId") Long adminId,
            @Param("moderatedAt") java.time.LocalDateTime moderatedAt);

    @Update("UPDATE posts SET moderation_status = 2, moderation_reason = #{reason}, "
            + "moderated_by = #{adminId}, moderated_at = #{moderatedAt} "
            + "WHERE id = #{postId} AND status = 0 AND moderation_status = 0")
    int rejectApproved(
            @Param("postId") Long postId,
            @Param("reason") String reason,
            @Param("adminId") Long adminId,
            @Param("moderatedAt") java.time.LocalDateTime moderatedAt);


    @Select({
            "<script>",
            "SELECT STRAIGHT_JOIN p.id, p.user_id AS userId, p.title,",
            "       CAST(p.images AS CHAR) AS imagesJson,",
            "       CAST(p.tags AS CHAR) AS tagsJson,",
            "       p.product_name AS productName, p.product_price AS productPrice,",
            "       p.product_source AS productSource, p.product_rating AS productRating,",
            "       p.like_count AS likeCount, p.comment_count AS commentCount,",
            "       p.favorite_count AS favoriteCount, p.moderation_status AS moderationStatus, p.created_at AS createdAt,",
            "       u.nickname AS userNickname, u.avatar_url AS userAvatarUrl,",
            "       EXISTS(SELECT 1 FROM likes l WHERE l.user_id = #{currentUserId} AND l.post_id = p.id) AS liked,",
            "       EXISTS(SELECT 1 FROM favorites f WHERE f.user_id = #{currentUserId} AND f.post_id = p.id) AS favorited",
            "FROM posts p",
            "JOIN users u ON u.id = p.user_id AND u.status = 0",
            "WHERE p.status = 0 AND p.moderation_status = 0",
            "  AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
            "<if test=\"tag != null and tag != ''\">",
            "  AND JSON_CONTAINS(p.tags, JSON_QUOTE(#{tag}))",
            "</if>",
            "ORDER BY (p.like_count * 3 + p.comment_count * 5 + p.favorite_count * 2) DESC, p.id DESC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<PostQueryRow> selectHotFeedRows(
            @Param("tag") String tag,
            @Param("limit") int limit,
            @Param("currentUserId") Long currentUserId);


    @Select("SELECT id, created_at FROM posts WHERE status = 0 AND moderation_status = 0 ORDER BY id DESC LIMIT 1000")
    List<Post> selectPublicPosts();


    @Select({
            "<script>",
            "SELECT STRAIGHT_JOIN p.id, p.user_id AS userId, p.title, p.content,",
            "       CAST(p.images AS CHAR) AS imagesJson,",
            "       CAST(p.tags AS CHAR) AS tagsJson,",
            "       p.product_name AS productName, p.product_price AS productPrice,",
            "       p.product_source AS productSource, p.product_rating AS productRating,",
            "       p.like_count AS likeCount, p.comment_count AS commentCount,",
            "       p.favorite_count AS favoriteCount, p.moderation_status AS moderationStatus, p.created_at AS createdAt,",
            "       u.nickname AS userNickname, u.avatar_url AS userAvatarUrl,",
            "       EXISTS(SELECT 1 FROM likes l WHERE l.user_id = #{currentUserId} AND l.post_id = p.id) AS liked,",
            "       EXISTS(SELECT 1 FROM favorites f WHERE f.user_id = #{currentUserId} AND f.post_id = p.id) AS favorited",
            "FROM posts p",
            "JOIN users u ON u.id = p.user_id AND u.status = 0",
            "WHERE p.status = 0 AND p.moderation_status = 0",
            "  AND (p.title LIKE CONCAT('%', #{keyword}, '%')",
            "       OR p.content LIKE CONCAT('%', #{keyword}, '%')",
            "       OR CAST(p.tags AS CHAR) LIKE CONCAT('%', #{keyword}, '%'))",
            "ORDER BY p.like_count DESC, p.id DESC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<PostQueryRow> searchPosts(
            @Param("keyword") String keyword,
            @Param("limit") int limit,
            @Param("currentUserId") Long currentUserId);

    @Select("SELECT jt.tag AS tag " +
            "FROM posts, JSON_TABLE(tags, '$[*]' COLUMNS(tag VARCHAR(100) PATH '$')) AS jt " +
            "WHERE posts.status = 0 AND posts.moderation_status = 0 " +
            "GROUP BY jt.tag ORDER BY COUNT(*) DESC LIMIT #{limit}")
    List<String> selectHotTags(@Param("limit") int limit);

    @Select("SELECT jt.tag AS tag " +
            "FROM posts, JSON_TABLE(tags, '$[*]' COLUMNS(tag VARCHAR(100) PATH '$')) AS jt " +
            "WHERE posts.status = 0 AND posts.moderation_status = 0 AND jt.tag LIKE CONCAT(#{prefix}, '%') " +
            "GROUP BY jt.tag LIMIT #{limit}")
    List<String> suggestTags(@Param("prefix") String prefix, @Param("limit") int limit);


    @Select("SELECT COUNT(*) FROM posts WHERE user_id = #{userId} AND status = 0 " +
            "AND title = #{title} AND content = #{content} " +
            "AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)")
    int countRecentDuplicates(
            @Param("userId") Long userId,
            @Param("title") String title,
            @Param("content") String content);

}