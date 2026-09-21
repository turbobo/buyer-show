package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.buyershow.dto.response.PostIndexRow;
import com.buyershow.dto.response.PostQueryRow;
import com.buyershow.dto.response.TagStatDTO;
import com.buyershow.entity.Post;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Result;
import org.apache.ibatis.annotations.Results;
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

    /**
     * 关注流（G1）：当前用户关注对象的公开帖，按发帖时间倒序游标分页；
     * follows 子查询走 idx_follow_follower_feed 索引，主表走 idx_post_feed。
     */
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
            "       EXISTS(SELECT 1 FROM likes l WHERE l.user_id = #{viewerId} AND l.post_id = p.id) AS liked,",
            "       EXISTS(SELECT 1 FROM favorites f WHERE f.user_id = #{viewerId} AND f.post_id = p.id) AS favorited",
            "FROM posts p FORCE INDEX (idx_post_feed)",
            "JOIN users u ON u.id = p.user_id AND u.status = 0",
            "WHERE p.status = 0 AND p.moderation_status = 0",
            "  AND p.user_id IN (SELECT following_id FROM follows WHERE follower_id = #{viewerId})",
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
    List<PostQueryRow> selectFollowingFeedRows(
            @Param("viewerId") Long viewerId,
            @Param("cursorId") Long cursorId,
            @Param("tag") String tag,
            @Param("limit") int limit);

    /**
     * 相关推荐（G3）：与指定帖子共享至少一个标签的公开帖（排除自身），按发帖时间倒序；
     * JSON_OVERLAPS 命中任一标签，主表走 idx_post_feed。
     */
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
            "  AND p.id &lt;&gt; #{postId}",
            "  AND JSON_OVERLAPS(p.tags, CAST(#{tagsJson} AS JSON))",
            "ORDER BY p.id DESC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<PostQueryRow> selectRelatedRows(
            @Param("postId") Long postId,
            @Param("tagsJson") String tagsJson,
            @Param("limit") int limit,
            @Param("currentUserId") Long currentUserId);

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
            "WHERE p.user_id = #{userId} AND p.status = 0 AND p.moderation_status = 0",
            "<if test='cursorId != null'>",
            "  AND p.id &lt; #{cursorId}",
            "</if>",
            "ORDER BY p.id DESC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<PostQueryRow> selectUserFeedRows(
            @Param("userId") Long userId,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit,
            @Param("currentUserId") Long currentUserId);

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
            "       EXISTS(SELECT 1 FROM favorites f WHERE f.user_id = #{currentUserId} AND f.post_id = p.id) AS favorited,",
            "       (SELECT a.status FROM post_appeals a WHERE a.post_id = p.id ORDER BY a.id DESC LIMIT 1) AS appealStatus",
            "FROM posts p",
            "JOIN users u ON u.id = p.user_id AND u.status = 0",
            "WHERE p.user_id = #{userId} AND p.status = 0",
            "<if test='cursorId != null'>",
            "  AND p.id &lt; #{cursorId}",
            "</if>",
            "ORDER BY p.id DESC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<PostQueryRow> selectOwnFeedRows(
            @Param("userId") Long userId,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit,
            @Param("currentUserId") Long currentUserId);

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
            "       EXISTS(SELECT 1 FROM favorites f WHERE f.user_id = #{currentUserId} AND f.post_id = p.id) AS favorited,",
            "       fav.id AS cursorKey",
            "FROM favorites fav",
            "JOIN posts p ON p.id = fav.post_id",
            "JOIN users u ON u.id = p.user_id AND u.status = 0",
            "WHERE fav.user_id = #{userId} AND p.status = 0 AND p.moderation_status = 0",
            "<if test='cursorId != null'>",
            "  AND fav.id &lt; #{cursorId}",
            "</if>",
            "ORDER BY fav.id DESC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<PostQueryRow> selectUserFavoriteRows(
            @Param("userId") Long userId,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit,
            @Param("currentUserId") Long currentUserId);

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
            "       EXISTS(SELECT 1 FROM favorites f WHERE f.user_id = #{currentUserId} AND f.post_id = p.id) AS favorited,",
            "       lk.id AS cursorKey",
            "FROM likes lk",
            "JOIN posts p ON p.id = lk.post_id",
            "JOIN users u ON u.id = p.user_id AND u.status = 0",
            "WHERE lk.user_id = #{userId} AND p.status = 0 AND p.moderation_status = 0",
            "<if test='cursorId != null'>",
            "  AND lk.id &lt; #{cursorId}",
            "</if>",
            "ORDER BY lk.id DESC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<PostQueryRow> selectUserLikeRows(
            @Param("userId") Long userId,
            @Param("cursorId") Long cursorId,
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
            "       IF(f.id IS NULL, 0, 1) AS favorited,",
            "       (SELECT a.status FROM post_appeals a WHERE a.post_id = p.id ORDER BY a.id DESC LIMIT 1) AS appealStatus",
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

    @Update("UPDATE posts SET moderated_by = NULL, moderated_at = NULL WHERE id = #{postId}")
    int clearModerationAudit(@Param("postId") Long postId);

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

    @Update("UPDATE posts SET moderation_status = 0, moderation_reason = NULL, "
            + "moderated_by = #{adminId}, moderated_at = #{moderatedAt} "
            + "WHERE id = #{postId} AND status = 0 AND moderation_status = 2")
    int approveRejected(
            @Param("postId") Long postId,
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

    @Update("UPDATE posts SET tags = #{tagsJson} WHERE id = #{id}")
    int updatePostTags(@Param("id") Long id, @Param("tagsJson") String tagsJson);

    /** 含指定标签的未删除帖子（仅 id 与 tags 字段）。 */
    @Select("SELECT id, tags FROM posts WHERE status = 0 AND JSON_CONTAINS(tags, JSON_QUOTE(#{tag}))")
    @Results({
            @Result(column = "id", property = "id"),
            @Result(column = "tags", property = "tags", typeHandler = JacksonTypeHandler.class)
    })
    List<Post> selectPostsWithTag(@Param("tag") String tag);

    /** 标签聚合统计（公开帖口径：未删除且审核通过，与管理端操作影响面互补）。 */
    @Select({
            "<script>",
            "SELECT jt.tag AS tag, COUNT(*) AS postCount",
            "FROM posts p",
            "JOIN JSON_TABLE(p.tags, '$[*]' COLUMNS (tag VARCHAR(50) PATH '$')) jt",
            "WHERE p.status = 0 AND p.moderation_status = 0",
            "<if test='keyword != null'> AND jt.tag LIKE CONCAT('%', #{keyword}, '%') </if>",
            "GROUP BY jt.tag",
            "ORDER BY postCount DESC, jt.tag",
            "LIMIT #{limit}",
            "</script>"
    })
    List<TagStatDTO> selectTagStats(@Param("keyword") String keyword, @Param("limit") int limit);


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

    // ─── G5 ES 搜索索引同步 ───

    /** 单帖索引行（仅公开且审核通过口径）。 */
    @Select("SELECT p.id, p.title, p.content, CAST(p.tags AS CHAR) AS tagsJson," +
            "       p.product_name AS productName, p.user_id AS userId, u.nickname AS userNickname," +
            "       u.status AS userStatus, p.like_count AS likeCount, p.created_at AS createdAt " +
            "FROM posts p JOIN users u ON u.id = p.user_id " +
            "WHERE p.id = #{postId} AND p.status = 0 AND p.moderation_status = 0")
    PostIndexRow selectIndexRow(@Param("postId") Long postId);

    /** 索引行列表：userId 为空时全量（rebuildAll），否则按用户（解封重建）。 */
    @Select("<script>" +
            "SELECT p.id, p.title, p.content, CAST(p.tags AS CHAR) AS tagsJson," +
            "       p.product_name AS productName, p.user_id AS userId, u.nickname AS userNickname," +
            "       u.status AS userStatus, p.like_count AS likeCount, p.created_at AS createdAt " +
            "FROM posts p JOIN users u ON u.id = p.user_id " +
            "WHERE p.status = 0 AND p.moderation_status = 0 " +
            "<if test='userId != null'>AND p.user_id = #{userId}</if> ORDER BY p.id" +
            "</script>")
    List<PostIndexRow> selectIndexRows(@Param("userId") Long userId);

    /** ES 命中后按 id 回查公开帖（保持调用方传入顺序由服务层组装；含 isLiked/isFavorited）。 */
    @Select("<script>" +
            "SELECT p.id, p.user_id AS userId, p.title, p.content, CAST(p.images AS CHAR) AS imagesJson," +
            "       CAST(p.tags AS CHAR) AS tagsJson," +
            "       p.product_name AS productName, p.product_price AS productPrice," +
            "       p.product_source AS productSource, p.product_rating AS productRating," +
            "       p.like_count AS likeCount, p.comment_count AS commentCount," +
            "       p.favorite_count AS favoriteCount, p.moderation_status AS moderationStatus, p.created_at AS createdAt," +
            "       u.nickname AS userNickname, u.avatar_url AS userAvatarUrl," +
            "       EXISTS(SELECT 1 FROM likes l WHERE l.user_id = #{currentUserId} AND l.post_id = p.id) AS liked," +
            "       EXISTS(SELECT 1 FROM favorites f WHERE f.user_id = #{currentUserId} AND f.post_id = p.id) AS favorited " +
            "FROM posts p JOIN users u ON u.id = p.user_id AND u.status = 0 " +
            "WHERE p.status = 0 AND p.moderation_status = 0 AND p.id IN " +
            "<foreach collection='ids' item='id' open='(' separator=',' close=')'>#{id}</foreach>" +
            "</script>")
    List<PostQueryRow> selectPublicRowsByIds(
            @Param("ids") List<Long> ids,
            @Param("currentUserId") Long currentUserId);

}