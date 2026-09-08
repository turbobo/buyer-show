-- V3: Feed 改用自增主键稳定游标
-- 原 created_at + id OR 条件在 MySQL 8.0 可能触发 filesort；自增 id 与发帖顺序一致，可直接范围扫描。

ALTER TABLE posts
  DROP INDEX idx_post_feed,
  ADD KEY idx_post_feed (status, id DESC);
