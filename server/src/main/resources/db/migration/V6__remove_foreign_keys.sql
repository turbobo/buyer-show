-- V6: 移除所有外键约束
-- AGENTS.md 规范：禁止数据库外键，Service 事务 + 唯一索引维护数据一致性

-- posts
ALTER TABLE posts DROP FOREIGN KEY posts_ibfk_1;

-- comments
ALTER TABLE comments DROP FOREIGN KEY comments_ibfk_1;
ALTER TABLE comments DROP FOREIGN KEY comments_ibfk_2;
ALTER TABLE comments DROP FOREIGN KEY comments_ibfk_3;

-- likes
ALTER TABLE likes DROP FOREIGN KEY likes_ibfk_1;
ALTER TABLE likes DROP FOREIGN KEY likes_ibfk_2;

-- favorites
ALTER TABLE favorites DROP FOREIGN KEY favorites_ibfk_1;
ALTER TABLE favorites DROP FOREIGN KEY favorites_ibfk_2;

-- follows
ALTER TABLE follows DROP FOREIGN KEY follows_ibfk_1;
ALTER TABLE follows DROP FOREIGN KEY follows_ibfk_2;

-- favorite_comments
ALTER TABLE favorite_comments DROP FOREIGN KEY favorite_comments_ibfk_1;
ALTER TABLE favorite_comments DROP FOREIGN KEY favorite_comments_ibfk_2;
