package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户拉黑关系：blocker 拉黑 blocked 后，双方内容互不可见、禁止私信。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
@TableName("user_blocks")
public class UserBlock {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long blockerId;

    private Long blockedId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
