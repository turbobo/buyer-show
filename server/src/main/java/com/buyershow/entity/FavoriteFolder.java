package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 收藏夹（G7）：用户自建收藏分类；「默认收藏夹」不落库（favorites.folder_id 为 NULL）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
@TableName("favorite_folders")
public class FavoriteFolder {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String name;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
