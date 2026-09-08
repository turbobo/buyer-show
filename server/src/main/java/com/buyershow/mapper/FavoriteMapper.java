package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.Favorite;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface FavoriteMapper extends BaseMapper<Favorite> {

    @Delete("DELETE FROM favorites WHERE user_id = #{userId} AND post_id = #{postId}")
    int deleteRelation(@Param("userId") Long userId, @Param("postId") Long postId);

    @Insert("INSERT IGNORE INTO favorites(user_id, post_id, created_at) VALUES(#{userId}, #{postId}, CURRENT_TIMESTAMP)")
    int insertIgnore(@Param("userId") Long userId, @Param("postId") Long postId);
}
