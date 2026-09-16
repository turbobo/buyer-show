-- 帖子申诉表：帖子被封禁/驳回后，作者可发起申诉，由管理员审批
CREATE TABLE post_appeals
(
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
    post_id       BIGINT UNSIGNED NOT NULL COMMENT '帖子ID',
    user_id       BIGINT UNSIGNED NOT NULL COMMENT '申诉人（帖子作者）',
    reason        VARCHAR(500)    NOT NULL COMMENT '申诉理由',
    status        TINYINT         NOT NULL DEFAULT 0 COMMENT '状态：0 待处理 / 1 已通过 / 2 已驳回',
    handle_reason VARCHAR(500)             DEFAULT NULL COMMENT '处理说明',
    handled_by    BIGINT UNSIGNED          DEFAULT NULL COMMENT '处理人（管理员ID）',
    handled_at    DATETIME                 DEFAULT NULL COMMENT '处理时间',
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_appeal_status (status, created_at),
    KEY idx_appeal_post (post_id, user_id, status)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4 COMMENT = '帖子申诉';
