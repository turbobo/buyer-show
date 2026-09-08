-- V2: 优化表结构、索引与社区核心数据模型
-- 目标：稳定游标分页、消除重复索引、支持标签检索与私信、去除数据库外键耦合

-- 1. users：昵称唯一性由数据库兜底；移除重复及低价值单列索引
ALTER TABLE users
  DROP INDEX idx_username,
  DROP INDEX idx_status,
  DROP INDEX idx_created_at,
  ADD UNIQUE KEY uk_user_nickname (nickname),
  ADD CONSTRAINT chk_user_role CHECK (role IN (0, 1)),
  ADD CONSTRAINT chk_user_status CHECK (status IN (0, 1, 2)),
  ADD CONSTRAINT chk_user_counter CHECK (
    post_count >= 0 AND follower_count >= 0 AND following_count >= 0
  );

-- 2. posts：保证 JSON 数组非空/合法；游标分页加入 id 作为稳定排序键
UPDATE posts SET tags = JSON_ARRAY() WHERE tags IS NULL;

ALTER TABLE posts
  DROP FOREIGN KEY posts_ibfk_1,
  DROP INDEX idx_user_created,
  DROP INDEX idx_status_created,
  DROP INDEX idx_status_like,
  MODIFY tags JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '标签名称数组（展示缓存，检索以 post_tag_rela 为准）',
  ADD KEY idx_post_feed (status, created_at DESC, id DESC),
  ADD KEY idx_post_hot (status, like_count DESC, id DESC),
  ADD KEY idx_post_user_feed (user_id, status, created_at DESC, id DESC),
  ADD CONSTRAINT chk_post_status CHECK (status IN (0, 1, 2)),
  ADD CONSTRAINT chk_post_rating CHECK (product_rating IS NULL OR product_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT chk_post_price CHECK (product_price IS NULL OR product_price >= 0),
  ADD CONSTRAINT chk_post_counter CHECK (
    like_count >= 0 AND comment_count >= 0 AND favorite_count >= 0
  ),
  ADD CONSTRAINT chk_post_images CHECK (
    JSON_TYPE(images) = 'ARRAY' AND JSON_LENGTH(images) BETWEEN 1 AND 9
  ),
  ADD CONSTRAINT chk_post_tags CHECK (JSON_TYPE(tags) = 'ARRAY');

-- 3. comments：按顶级评论/回复分别支持状态过滤与稳定排序
ALTER TABLE comments
  DROP FOREIGN KEY comments_ibfk_1,
  DROP FOREIGN KEY comments_ibfk_2,
  DROP FOREIGN KEY comments_ibfk_3,
  DROP INDEX idx_post_created,
  DROP INDEX idx_parent,
  DROP INDEX idx_user_created,
  ADD updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  ADD KEY idx_comment_post_feed (post_id, status, parent_id, created_at, id),
  ADD KEY idx_comment_parent_feed (parent_id, status, created_at, id),
  ADD KEY idx_comment_user_feed (user_id, status, created_at DESC, id DESC),
  ADD CONSTRAINT chk_comment_status CHECK (status IN (0, 1)),
  ADD CONSTRAINT chk_comment_counter CHECK (reply_count >= 0 AND like_count >= 0),
  ADD CONSTRAINT chk_comment_content CHECK (CHAR_LENGTH(TRIM(content)) > 0);

-- 4. likes / favorites：保留关系唯一性，补齐反向查询与按时间列表索引
ALTER TABLE likes
  DROP FOREIGN KEY likes_ibfk_1,
  DROP FOREIGN KEY likes_ibfk_2,
  RENAME INDEX post_id TO idx_like_post,
  ADD KEY idx_like_user_feed (user_id, created_at DESC, id DESC);

ALTER TABLE favorites
  DROP FOREIGN KEY favorites_ibfk_1,
  DROP FOREIGN KEY favorites_ibfk_2,
  RENAME INDEX post_id TO idx_favorite_post,
  DROP INDEX idx_user_created,
  ADD KEY idx_favorite_user_feed (user_id, created_at DESC, id DESC);

-- 5. follows：移除数据库外键，应用层维护关系一致性，禁止自关注
ALTER TABLE follows
  DROP FOREIGN KEY follows_ibfk_1,
  DROP FOREIGN KEY follows_ibfk_2,
  DROP INDEX idx_follower,
  DROP INDEX idx_following,
  ADD KEY idx_follow_follower_feed (follower_id, created_at DESC, id DESC),
  ADD KEY idx_follow_following_feed (following_id, created_at DESC, id DESC),
  ADD CONSTRAINT chk_follow_self CHECK (follower_id <> following_id);

-- 6. tags：补更新时间与合法状态约束
ALTER TABLE tags
  ADD updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  ADD CONSTRAINT chk_tag_status CHECK (status IN (0, 1)),
  ADD CONSTRAINT chk_tag_count CHECK (post_count >= 0);

-- 7. 帖子-标签关系表：JSON 仅作展示缓存，关系表负责高效筛选和统计
CREATE TABLE post_tag_rela (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  post_id BIGINT UNSIGNED NOT NULL COMMENT '帖子ID',
  tag_id BIGINT UNSIGNED NOT NULL COMMENT '标签ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_post_tag (post_id, tag_id),
  KEY idx_tag_post (tag_id, post_id),
  KEY idx_tag_time_post (tag_id, create_time DESC, post_id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帖子标签关联表';

-- 8. 评论收藏：补用户时间线索引，移除外键耦合
ALTER TABLE favorite_comments
  DROP FOREIGN KEY favorite_comments_ibfk_1,
  DROP FOREIGN KEY favorite_comments_ibfk_2,
  RENAME INDEX comment_id TO idx_favorite_comment,
  ADD KEY idx_favorite_comment_user_feed (user_id, created_at DESC, id DESC);

-- 9. 标签收藏 / 搜索历史：稳定时间线排序
ALTER TABLE favorite_tags
  DROP INDEX idx_user_created,
  ADD KEY idx_favorite_tag_user_feed (user_id, created_at DESC, id DESC);

ALTER TABLE search_history
  DROP INDEX idx_user_created,
  ADD KEY idx_search_user_feed (user_id, created_at DESC, id DESC);

-- 10. notifications：支持全部通知时间线与未读列表两种查询
ALTER TABLE notifications
  ADD updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  ADD KEY idx_notification_user_feed (user_id, created_at DESC, id DESC),
  ADD CONSTRAINT chk_notification_read CHECK (is_read IN (0, 1));

-- 11. 私信会话主表
CREATE TABLE chat_conversation (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  conversation_type TINYINT NOT NULL DEFAULT 1 COMMENT '会话类型(1-单聊 2-群聊)',
  conversation_key VARCHAR(64) NOT NULL COMMENT '会话唯一键（单聊双方用户ID排序拼接；群聊使用业务UUID）',
  conversation_name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '群聊名称',
  last_message_id BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '最后消息ID',
  last_message_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后消息时间',
  conversation_status TINYINT NOT NULL DEFAULT 0 COMMENT '状态(0-正常 1-关闭)',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标识(0-未删除 1-已删除)',
  PRIMARY KEY (id),
  UNIQUE KEY uk_conversation_key (conversation_key),
  KEY idx_conversation_last_time (conversation_status, last_message_time DESC, id DESC),
  CONSTRAINT chk_conversation_type CHECK (conversation_type IN (1, 2)),
  CONSTRAINT chk_conversation_status CHECK (conversation_status IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私信会话主表';

-- 12. 会话成员关联表
CREATE TABLE chat_conversation_member_rela (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  conversation_id BIGINT UNSIGNED NOT NULL COMMENT '会话ID',
  user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  last_read_message_id BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '最后已读消息ID',
  unread_count INT NOT NULL DEFAULT 0 COMMENT '未读消息数',
  member_status TINYINT NOT NULL DEFAULT 0 COMMENT '成员状态(0-正常 1-退出)',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_conversation_user (conversation_id, user_id),
  KEY idx_user_conversation (user_id, member_status, conversation_id),
  CONSTRAINT chk_member_status CHECK (member_status IN (0, 1)),
  CONSTRAINT chk_member_unread CHECK (unread_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话成员关联表';

-- 13. 私信消息表
CREATE TABLE chat_message (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  conversation_id BIGINT UNSIGNED NOT NULL COMMENT '会话ID',
  sender_id BIGINT UNSIGNED NOT NULL COMMENT '发送者ID',
  message_type TINYINT NOT NULL DEFAULT 1 COMMENT '消息类型(1-文本 2-图片 3-商品卡片 4-系统)',
  message_content TEXT NOT NULL COMMENT '消息文本',
  message_payload JSON NOT NULL DEFAULT (JSON_OBJECT()) COMMENT '图片或商品卡片扩展数据',
  message_status TINYINT NOT NULL DEFAULT 0 COMMENT '状态(0-正常 1-撤回 2-删除)',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_message_conversation (conversation_id, message_status, id DESC),
  KEY idx_message_sender (sender_id, create_time DESC, id DESC),
  CONSTRAINT chk_message_type CHECK (message_type IN (1, 2, 3, 4)),
  CONSTRAINT chk_message_status CHECK (message_status IN (0, 1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私信消息表';
