-- V10: 管理员审计日志（管理员操作全记录，只读查询）
CREATE TABLE admin_audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT UNSIGNED NOT NULL COMMENT '操作管理员ID',
    action VARCHAR(50) NOT NULL COMMENT '动作：MODERATE_POST/MODERATE_COMMENT/BAN_USER/UNBAN_USER/BAN_POST/UNBAN_POST/HANDLE_REPORT/HANDLE_APPEAL',
    target_type VARCHAR(20) NOT NULL COMMENT '目标类型：POST/COMMENT/USER/REPORT/APPEAL',
    target_id BIGINT UNSIGNED NOT NULL COMMENT '目标ID',
    detail VARCHAR(500) DEFAULT NULL COMMENT '操作说明/原因',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_created (admin_id, created_at DESC),
    INDEX idx_action_created (action, created_at DESC),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
