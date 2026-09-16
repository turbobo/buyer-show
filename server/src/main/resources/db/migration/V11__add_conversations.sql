-- V11: 私信会话与消息
CREATE TABLE conversations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_a_id BIGINT UNSIGNED NOT NULL COMMENT '较小用户ID',
    user_b_id BIGINT UNSIGNED NOT NULL COMMENT '较大用户ID',
    last_message_id BIGINT UNSIGNED DEFAULT NULL,
    last_message_at DATETIME DEFAULT NULL,
    a_unread INT NOT NULL DEFAULT 0 COMMENT 'user_a 未读数',
    b_unread INT NOT NULL DEFAULT 0 COMMENT 'user_b 未读数',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_pair (user_a_id, user_b_id),
    INDEX idx_a_last (user_a_id, last_message_at DESC),
    INDEX idx_b_last (user_b_id, last_message_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT UNSIGNED NOT NULL,
    sender_id BIGINT UNSIGNED NOT NULL,
    receiver_id BIGINT UNSIGNED NOT NULL,
    content VARCHAR(500) NOT NULL,
    is_read TINYINT NOT NULL DEFAULT 0 COMMENT '0=未读 1=已读',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conv_id (conversation_id, id),
    INDEX idx_receiver_read (receiver_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
