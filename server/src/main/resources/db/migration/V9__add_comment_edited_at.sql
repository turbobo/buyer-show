-- V9: 评论编辑时间（用于「已编辑」标记；发布后 5 分钟内可编辑）
ALTER TABLE comments
    ADD COLUMN edited_at DATETIME NULL COMMENT '最后编辑时间（NULL=未编辑）' AFTER moderation_reason;
