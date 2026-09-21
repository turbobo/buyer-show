package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 站点 Banner 运营位（G10）：管理端维护，公开端按启用+排序展示。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
@TableName("site_banners")
public class SiteBanner {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;

    private String imageUrl;

    /** 跳转类型: post=帖子详情 / topic=话题页 / url=外链。 */
    private String linkType;

    /** 跳转目标：帖子ID / 话题ID / 外链 URL。 */
    private String linkValue;

    private Integer sortOrder;

    /** 状态: 0=启用 1=停用。 */
    private Integer status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
