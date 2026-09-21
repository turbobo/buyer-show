package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.dto.response.FollowQueryRow;
import com.buyershow.entity.Follow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface FollowMapper extends BaseMapper<Follow> {

    /** 单对关注关系判断（follower 是否关注 following）。 */
    @Select("SELECT COUNT(*) FROM follows WHERE follower_id = #{followerId} AND following_id = #{followingId}")
    int countFollow(@Param("followerId") Long followerId, @Param("followingId") Long followingId);


    @Select({
            "<script>",
            "SELECT u.id, u.nickname, u.avatar_url AS avatarUrl, u.bio,",
            "       EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = #{currentUserId} AND f2.following_id = u.id) AS isFollowing,",
            "       EXISTS(SELECT 1 FROM follows f3 WHERE f3.follower_id = u.id AND f3.following_id = #{currentUserId}) AS mutual,",
            "       rel.id AS cursorId",
            "FROM follows rel",
            "JOIN users u ON u.id = rel.follower_id",
            "WHERE rel.following_id = #{userId} AND u.status = 0",
            "  AND NOT EXISTS (SELECT 1 FROM user_blocks ub WHERE ub.blocker_id = u.id AND ub.blocked_id = #{currentUserId})",
            "  AND NOT EXISTS (SELECT 1 FROM user_blocks ub2 WHERE ub2.blocker_id = #{currentUserId} AND ub2.blocked_id = u.id)",
            "<if test='cursorId != null'>",
            "  AND rel.id &lt; #{cursorId}",
            "</if>",
            "ORDER BY rel.id DESC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<FollowQueryRow> selectFollowerRows(
            @Param("userId") Long userId,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit,
            @Param("currentUserId") Long currentUserId);

    @Select({
            "<script>",
            "SELECT u.id, u.nickname, u.avatar_url AS avatarUrl, u.bio,",
            "       EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = #{currentUserId} AND f2.following_id = u.id) AS isFollowing,",
            "       EXISTS(SELECT 1 FROM follows f3 WHERE f3.follower_id = u.id AND f3.following_id = #{currentUserId}) AS mutual,",
            "       rel.id AS cursorId",
            "FROM follows rel",
            "JOIN users u ON u.id = rel.following_id",
            "WHERE rel.follower_id = #{userId} AND u.status = 0",
            "  AND NOT EXISTS (SELECT 1 FROM user_blocks ub WHERE ub.blocker_id = u.id AND ub.blocked_id = #{currentUserId})",
            "  AND NOT EXISTS (SELECT 1 FROM user_blocks ub2 WHERE ub2.blocker_id = #{currentUserId} AND ub2.blocked_id = u.id)",
            "<if test='cursorId != null'>",
            "  AND rel.id &lt; #{cursorId}",
            "</if>",
            "ORDER BY rel.id DESC",
            "LIMIT #{limit}",
            "</script>"
    })
    List<FollowQueryRow> selectFollowingRows(
            @Param("userId") Long userId,
            @Param("cursorId") Long cursorId,
            @Param("limit") int limit,
            @Param("currentUserId") Long currentUserId);
}
