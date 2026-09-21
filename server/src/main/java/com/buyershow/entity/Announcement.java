package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 系统公告（G11）：运营发布公告，发布即实时广播给在线用户。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
@TableName("announcements")
public class Announcement {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;

    private String content;

    /** 状态: 0=草稿 1=已发布 2=已下线。 */
    private Integer status;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
