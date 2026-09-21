package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Update("UPDATE users SET last_login_at = #{loginAt} WHERE id = #{userId}")
    int updateLastLogin(@Param("userId") Long userId, @Param("loginAt") LocalDateTime loginAt);
    @Update("UPDATE users SET post_count = GREATEST(post_count + #{delta}, 0) WHERE id = #{userId} AND status = 0")
    int adjustPostCount(@Param("userId") Long userId, @Param("delta") int delta);

    @Update("UPDATE users SET follower_count = GREATEST(follower_count + #{delta}, 0) WHERE id = #{userId} AND status = 0")
    int adjustFollowerCount(@Param("userId") Long userId, @Param("delta") int delta);

    @Update("UPDATE users SET following_count = GREATEST(following_count + #{delta}, 0) WHERE id = #{userId} AND status = 0")
    int adjustFollowingCount(@Param("userId") Long userId, @Param("delta") int delta);

    @Update("UPDATE users SET status = 1 WHERE id = #{userId} AND status = 0")
    int banUser(@Param("userId") Long userId);

    @Update("UPDATE users SET status = 0 WHERE id = #{userId} AND status = 1")
    int unbanUser(@Param("userId") Long userId);

    /**
     * 按昵称批量查活跃用户（G4 @提及：昵称存在性校验与通知映射）。
     *
     * @param nicknames 去重后的昵称列表
     * @return 存在的活跃用户（仅 id/nickname 用于通知与前端跳转）
     */
    @Select("<script>" +
            "SELECT id, nickname FROM users WHERE status = 0 AND nickname IN " +
            "<foreach collection='nicknames' item='nickname' open='(' separator=',' close=')'>#{nickname}</foreach>" +
            "</script>")
    List<User> selectActiveUsersByNicknames(@Param("nicknames") List<String> nicknames);
}
