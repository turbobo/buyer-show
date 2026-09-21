package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.Announcement;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 系统公告 Mapper（G11）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Mapper
public interface AnnouncementMapper extends BaseMapper<Announcement> {

    /** 最近一条已发布公告（首页横幅用）。 */
    @Select("SELECT id, title, content, status, created_at AS createdAt, updated_at AS updatedAt " +
            "FROM announcements WHERE status = 1 ORDER BY id DESC LIMIT 1")
    Announcement selectLatestPublished();

    /** 全部公告（管理端，新在前）。 */
    @Select("SELECT id, title, content, status, created_at AS createdAt, updated_at AS updatedAt " +
            "FROM announcements ORDER BY id DESC")
    List<Announcement> selectAll();
}
