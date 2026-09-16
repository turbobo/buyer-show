package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理端用户帖子视图（用于用户维度管理其帖子）。
 */
@Data
@Builder
public class AdminUserPostDTO {
    private Long id;
    private String title;
    /** 封面图（取 images 第一张） */
    private String coverImage;
    /** 审核状态：0 公开 / 1 待审 / 2 已封禁（驳回） */
    private Integer moderationStatus;
    /** 帖子状态：0 正常 / 2 已删除 */
    private Integer status;
    private LocalDateTime createdAt;
}
