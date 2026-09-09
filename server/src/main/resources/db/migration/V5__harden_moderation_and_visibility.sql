-- V5: 审核安全、公开内容索引与举报去重加固
-- 保留 V4 历史校验和，通过增量迁移修正默认值和索引设计。

-- 未显式传审核状态的新内容默认待审，避免滚动发布期间旧节点直接公开内容。
ALTER TABLE posts
  DROP INDEX idx_post_feed,
  DROP INDEX idx_post_moderation_feed,
  MODIFY moderation_status TINYINT NOT NULL DEFAULT 1 COMMENT '审核状态：0=通过 1=待审 2=驳回',
  ADD KEY idx_post_feed (status, moderation_status, id DESC),
  ADD KEY idx_post_moderation_queue (status, moderation_status, created_at, id);

ALTER TABLE comments
  DROP INDEX idx_comment_post_feed,
  DROP INDEX idx_comment_parent_feed,
  DROP INDEX idx_comment_user_feed,
  DROP INDEX idx_comment_moderation_feed,
  MODIFY moderation_status TINYINT NOT NULL DEFAULT 1 COMMENT '审核状态：0=通过 1=待审 2=驳回',
  ADD KEY idx_comment_post_feed (post_id, status, moderation_status, parent_id, created_at, id),
  ADD KEY idx_comment_parent_feed (parent_id, status, moderation_status, created_at, id),
  ADD KEY idx_comment_user_feed (user_id, status, moderation_status, created_at DESC, id DESC),
  ADD KEY idx_comment_moderation_queue (status, moderation_status, created_at, id);

-- 敏感词必须非空；规则量较小时全量加载进应用缓存，不保留低区分度 enabled/action 索引。
ALTER TABLE sensitive_words
  DROP INDEX idx_sensitive_word_enabled,
  ADD CONSTRAINT chk_sensitive_word_nonempty CHECK (CHAR_LENGTH(TRIM(word)) > 0);

-- 同一用户对同一内容只允许一条举报，不能通过改变原因绕过去重。
ALTER TABLE content_reports
  DROP INDEX uk_reporter_content_reason,
  ADD UNIQUE KEY uk_reporter_content (reporter_id, content_type, content_id);
