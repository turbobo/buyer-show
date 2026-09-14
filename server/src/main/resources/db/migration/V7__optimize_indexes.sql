-- V7: 优化索引，移除冗余索引以符合 AGENTS.md 规范（单表 ≤ 5 个索引）

-- posts 表：移除 idx_user_created（被 idx_post_feed 覆盖）
ALTER TABLE posts DROP INDEX idx_user_created;

-- comments 表：移除冗余索引
-- idx_comment_post_feed 与 idx_post_created 功能重叠，保留 idx_post_created
ALTER TABLE comments DROP INDEX idx_comment_post_feed;
-- idx_comment_parent_feed 与 idx_parent 功能重叠，保留 idx_parent  
ALTER TABLE comments DROP INDEX idx_comment_parent_feed;
-- idx_comment_user_feed 与 idx_user_created 功能重叠，保留 idx_user_created
ALTER TABLE comments DROP INDEX idx_comment_user_feed;

-- users 表：移除冗余的 idx_username（UNIQUE 约束已创建唯一索引）
ALTER TABLE users DROP INDEX idx_username;
