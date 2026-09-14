-- V6: 数据分析能力
-- 用户行为事件表

CREATE TABLE analytics_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL COMMENT '事件类型: page_view/post_view/post_create/post_like/post_favorite/comment_create/user_follow/search/login/register',
    user_id BIGINT UNSIGNED NULL COMMENT '用户ID（未登录为NULL）',
    post_id BIGINT UNSIGNED NULL COMMENT '帖子ID',
    comment_id BIGINT UNSIGNED NULL COMMENT '评论ID',
    target_user_id BIGINT UNSIGNED NULL COMMENT '目标用户ID（如关注场景）',
    session_id VARCHAR(100) NULL COMMENT '会话ID',
    ip_address VARCHAR(45) NULL COMMENT 'IP地址',
    user_agent VARCHAR(500) NULL COMMENT 'User-Agent',
    referrer VARCHAR(500) NULL COMMENT '来源页面',
    metadata JSON NULL COMMENT '扩展元数据',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '事件时间',
    INDEX idx_event_type (event_type, created_at),
    INDEX idx_user_id (user_id, created_at),
    INDEX idx_post_id (post_id, created_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='用户行为事件表';

-- 每日统计汇总表（可选，用于快速查询）
CREATE TABLE analytics_daily_stats (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL COMMENT '统计日期',
    stat_type VARCHAR(50) NOT NULL COMMENT '统计类型: daily_active_users/daily_posts/daily_comments/daily_likes',
    stat_value INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '统计值',
    metadata JSON NULL COMMENT '扩展元数据',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_date_type (stat_date, stat_type),
    INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='每日统计汇总表';
