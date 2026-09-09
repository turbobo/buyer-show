-- V4: 内容审核与举报基线
-- 审核状态：0=通过，1=待人工审核，2=驳回；既有公开内容默认通过。

ALTER TABLE posts
  ADD COLUMN moderation_status TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态：0=通过 1=待审 2=驳回' AFTER status,
  ADD COLUMN moderation_reason VARCHAR(500) DEFAULT NULL COMMENT '审核原因' AFTER moderation_status,
  ADD COLUMN moderated_by BIGINT UNSIGNED DEFAULT NULL COMMENT '审核人ID' AFTER moderation_reason,
  ADD COLUMN moderated_at DATETIME DEFAULT NULL COMMENT '审核时间' AFTER moderated_by,
  ADD KEY idx_post_moderation_feed (moderation_status, id DESC),
  ADD CONSTRAINT chk_post_moderation_status CHECK (moderation_status IN (0, 1, 2));

ALTER TABLE comments
  ADD COLUMN moderation_status TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态：0=通过 1=待审 2=驳回' AFTER status,
  ADD COLUMN moderation_reason VARCHAR(500) DEFAULT NULL COMMENT '审核原因' AFTER moderation_status,
  ADD COLUMN moderated_by BIGINT UNSIGNED DEFAULT NULL COMMENT '审核人ID' AFTER moderation_reason,
  ADD COLUMN moderated_at DATETIME DEFAULT NULL COMMENT '审核时间' AFTER moderated_by,
  ADD KEY idx_comment_moderation_feed (moderation_status, created_at DESC, id DESC),
  ADD CONSTRAINT chk_comment_moderation_status CHECK (moderation_status IN (0, 1, 2));

CREATE TABLE sensitive_words (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  word VARCHAR(100) NOT NULL COMMENT '匹配词',
  action TINYINT NOT NULL DEFAULT 0 COMMENT '命中动作：0=待人工审核 1=拒绝',
  enabled TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用：0=否 1=是',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sensitive_word (word),
  KEY idx_sensitive_word_enabled (enabled, action),
  CONSTRAINT chk_sensitive_word_action CHECK (action IN (0, 1)),
  CONSTRAINT chk_sensitive_word_enabled CHECK (enabled IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='本地敏感词规则';

CREATE TABLE content_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  reporter_id BIGINT UNSIGNED NOT NULL COMMENT '举报人ID',
  content_type TINYINT NOT NULL COMMENT '内容类型：1=帖子 2=评论',
  content_id BIGINT UNSIGNED NOT NULL COMMENT '内容ID',
  reason VARCHAR(50) NOT NULL COMMENT '举报原因',
  description VARCHAR(500) DEFAULT NULL COMMENT '补充描述',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '处理状态：0=待处理 1=已采纳 2=已驳回',
  handled_by BIGINT UNSIGNED DEFAULT NULL COMMENT '处理人ID',
  handled_at DATETIME DEFAULT NULL COMMENT '处理时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_reporter_content_reason (reporter_id, content_type, content_id, reason),
  KEY idx_report_status_created (status, created_at DESC, id DESC),
  KEY idx_report_content (content_type, content_id),
  CONSTRAINT chk_report_content_type CHECK (content_type IN (1, 2)),
  CONSTRAINT chk_report_status CHECK (status IN (0, 1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户内容举报';

INSERT INTO sensitive_words (word, action, enabled) VALUES
  ('加微信', 0, 1),
  ('刷单', 1, 1);
