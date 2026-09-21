package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("favorites")
public class Favorite {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long postId;

    /** 所属收藏夹（G7）：null 表示默认收藏夹。 */
    private Long folderId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
