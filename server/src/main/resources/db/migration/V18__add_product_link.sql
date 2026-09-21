-- G12 电商闭环：商品购买链接（白名单域名校验，详情页「去购买」跳转）

ALTER TABLE posts ADD COLUMN product_link VARCHAR(500) NULL
    COMMENT '商品购买链接（http/https，白名单域名）' AFTER product_rating;
