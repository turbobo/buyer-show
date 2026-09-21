package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 运营话题（G10）：运营创建话题聚合页，与帖子标签同名关联。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
@TableName("topics")
public class Topic {
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 话题名称（与帖子标签同名关联）。 */
    private String name;

    private String coverUrl;

    private String description;

    private Integer sortOrder;

    /** 状态: 0=启用 1=停用。 */
    private Integer status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
