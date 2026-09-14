package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("analytics_events")
public class AnalyticsEvent {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String eventType;
    private Long userId;
    private Long postId;
    private Long commentId;
    private Long targetUserId;
    private String sessionId;
    private String ipAddress;
    private String userAgent;
    private String referrer;
    private String metadata;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
