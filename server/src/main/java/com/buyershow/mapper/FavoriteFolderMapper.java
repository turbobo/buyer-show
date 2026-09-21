package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.dto.response.FavoriteFolderDTO;
import com.buyershow.entity.FavoriteFolder;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 收藏夹数据访问。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Mapper
public interface FavoriteFolderMapper extends BaseMapper<FavoriteFolder> {

    /** 我的收藏夹列表（含收藏数，按创建顺序）。 */
    @Select("SELECT f.id, f.name, COUNT(fav.id) AS postCount "
            + "FROM favorite_folders f "
            + "LEFT JOIN favorites fav ON fav.user_id = f.user_id AND fav.folder_id = f.id "
            + "WHERE f.user_id = #{userId} "
            + "GROUP BY f.id, f.name "
            + "ORDER BY f.id")
    List<FavoriteFolderDTO> selectFoldersWithCount(@Param("userId") Long userId);
}
