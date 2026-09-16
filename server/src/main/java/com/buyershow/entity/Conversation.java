package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 私信会话（user_a_id < user_b_id 规范化存储）。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
@TableName("conversations")
public class Conversation {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userAId;
    private Long userBId;
    private Long lastMessageId;
    private LocalDateTime lastMessageAt;
    private Integer aUnread;
    private Integer bUnread;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
