-- V15: 评论盖楼（G8）：comments 增加 reply_to_id（被回复评论，NULL=直接回复楼主）
ALTER TABLE comments
    ADD COLUMN reply_to_id BIGINT UNSIGNED NULL COMMENT '被回复评论ID（NULL=直接回复楼主）' AFTER parent_id;
