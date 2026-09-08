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
}
