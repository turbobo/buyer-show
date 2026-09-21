package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.SiteBanner;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface SiteBannerMapper extends BaseMapper<SiteBanner> {

    /** 启用中的 Banner（按排序升序）。 */
    @Select("SELECT id, title, image_url AS imageUrl, link_type AS linkType, link_value AS linkValue, " +
            "sort_order AS sortOrder, status, created_at AS createdAt, updated_at AS updatedAt " +
            "FROM site_banners WHERE status = 0 ORDER BY sort_order ASC, id ASC")
    List<SiteBanner> selectActiveBanners();

    /** 全部 Banner（管理端，按排序升序）。 */
    @Select("SELECT id, title, image_url AS imageUrl, link_type AS linkType, link_value AS linkValue, " +
            "sort_order AS sortOrder, status, created_at AS createdAt, updated_at AS updatedAt " +
            "FROM site_banners ORDER BY sort_order ASC, id ASC")
    List<SiteBanner> selectAllBanners();

    /** 同名计数（用于创建时查重）。 */
    @Select("SELECT COUNT(*) FROM site_banners WHERE title = #{title}")
    int countByTitle(@Param("title") String title);
}
