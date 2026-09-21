-- V14: 收藏夹分类（G7）：收藏夹表 + favorites 增加 folder_id（NULL=默认收藏夹，不落库）
CREATE TABLE favorite_folders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '所属用户',
    name VARCHAR(30) NOT NULL COMMENT '收藏夹名称',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_name (user_id, name),
    INDEX idx_user_folder (user_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE favorites
    ADD COLUMN folder_id BIGINT UNSIGNED NULL COMMENT '所属收藏夹（NULL=默认收藏夹）' AFTER post_id,
    ADD INDEX idx_user_folder_feed (user_id, folder_id, created_at DESC, id DESC);
