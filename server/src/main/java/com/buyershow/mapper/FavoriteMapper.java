package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.Favorite;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface FavoriteMapper extends BaseMapper<Favorite> {

    @Delete("DELETE FROM favorites WHERE user_id = #{userId} AND post_id = #{postId}")
    int deleteRelation(@Param("userId") Long userId, @Param("postId") Long postId);

    /** 收藏到指定收藏夹（G7）：folderId 为 null 表示默认收藏夹。 */
    @Insert("INSERT IGNORE INTO favorites(user_id, post_id, folder_id, created_at) "
            + "VALUES(#{userId}, #{postId}, #{folderId}, CURRENT_TIMESTAMP)")
    int insertIgnore(@Param("userId") Long userId, @Param("postId") Long postId, @Param("folderId") Long folderId);

    /** 移动收藏到指定收藏夹（G7）：folderId 为 null 表示移回默认夹。 */
    @Update("UPDATE favorites SET folder_id = #{folderId} WHERE user_id = #{userId} AND post_id = #{postId}")
    int updateFolder(@Param("userId") Long userId, @Param("postId") Long postId, @Param("folderId") Long folderId);

    /** 清空收藏夹（G7）：删除收藏夹时夹内收藏移回默认夹。 */
    @Update("UPDATE favorites SET folder_id = NULL WHERE user_id = #{userId} AND folder_id = #{folderId}")
    int clearFolder(@Param("userId") Long userId, @Param("folderId") Long folderId);
}
