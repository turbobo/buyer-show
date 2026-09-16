package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserMapper extends BaseMapper<User> {

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
}
