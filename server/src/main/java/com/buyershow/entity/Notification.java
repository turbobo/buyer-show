package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("notifications")
public class Notification {
    @TableId(type = IdType.AUTO)
    private Long id;

    /** 接收者 */
    private Long userId;

    /** like/comment/follow/system */
    private String type;

    /** 触发者 */
    private Long actorId;

    private String targetType;
    private Long targetId;
    private String content;

    /** 0=未读 1=已读 */
    private Integer isRead;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
