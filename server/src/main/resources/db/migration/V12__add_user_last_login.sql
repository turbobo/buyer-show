-- V12: 用户表扩展冗余字段（1.5）——最后登录时间
-- 用途：管理后台用户列表展示账号活跃度（风控/运营视角）
-- 写入点：AuthService.login 登录成功后更新（失败不影响登录主流程）

ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL COMMENT '最后登录时间';
