-- G10 运营位与话题运营：Banner 位、精选流、运营话题

CREATE TABLE site_banners (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL COMMENT 'Banner 标题',
    image_url VARCHAR(500) NOT NULL COMMENT 'Banner 图片地址（MinIO objectName 或完整 URL）',
    link_type VARCHAR(20) NOT NULL DEFAULT 'url' COMMENT '跳转类型: post=帖子详情/topic=话题页/url=外链',
    link_value VARCHAR(500) NOT NULL DEFAULT '' COMMENT '跳转目标（帖子ID/话题ID/外链 URL）',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序（越小越靠前）',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0=启用 1=停用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='站点 Banner 运营位';

CREATE TABLE topics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL COMMENT '话题名称（与帖子标签同名关联）',
    cover_url VARCHAR(500) NULL COMMENT '封面图地址',
    description VARCHAR(200) NULL COMMENT '话题描述',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序（越小越靠前）',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0=启用 1=停用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_name (name),
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='运营话题表';

ALTER TABLE posts
    ADD COLUMN is_featured TINYINT NOT NULL DEFAULT 0 COMMENT '是否精选: 0=否 1=是',
    ADD INDEX idx_featured (is_featured, id);
