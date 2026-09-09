package com.buyershow.common;

import lombok.Getter;

@Getter
public enum ErrorCode {
    // 成功
    SUCCESS(0, "success"),

    // 认证 1000-1999
    AUTH_FAILED(1001, "用户名或密码错误"),
    TOKEN_EXPIRED(1002, "登录已过期，请重新登录"),
    TOKEN_INVALID(1003, "无效的认证信息"),
    NO_PERMISSION(1004, "无权限执行此操作"),
    ACCOUNT_BANNED(1005, "账号已被封禁"),
    ACCOUNT_DELETED(1006, "账号已注销"),
    REFRESH_TOKEN_INVALID(1007, "刷新令牌无效"),
    WECHAT_AUTH_FAILED(1008, "微信登录失败"),

    // 用户 2000-2999
    USER_NOT_FOUND(2001, "用户不存在"),
    USERNAME_EXISTS(2002, "用户名已被注册"),
    NICKNAME_EXISTS(2003, "昵称已被使用"),
    EMAIL_EXISTS(2004, "邮箱已被注册"),
    PHONE_EXISTS(2005, "手机号已被注册"),
    PROFILE_UPDATE_FAILED(2006, "资料更新失败"),

    // 帖子 3000-3999
    POST_NOT_FOUND(3001, "帖子不存在或已删除"),
    POST_NO_EDIT(3002, "只能编辑自己的帖子"),
    POST_NO_DELETE(3003, "只能删除自己的帖子"),
    POST_IMAGE_EMPTY(3004, "至少需要一张图片"),
    POST_TITLE_EMPTY(3005, "标题不能为空"),
    POST_CONTENT_TOO_SHORT(3006, "正文内容太短"),

    // 评论 4000-4999
    COMMENT_NOT_FOUND(4001, "评论不存在"),
    COMMENT_NO_DELETE(4002, "只能删除自己的评论"),
    COMMENT_CONTENT_EMPTY(4003, "评论内容不能为空"),
    COMMENT_REPLY_DEPTH(4004, "仅支持一级嵌套回复"),

    // 内容安全 7000-7999
    CONTENT_REJECTED(7001, "内容未通过安全校验"),
    REPORT_DUPLICATED(7002, "请勿重复举报相同内容"),
    REPORT_NOT_FOUND(7003, "举报记录不存在"),
    REPORT_ALREADY_HANDLED(7004, "举报记录已处理"),
    CONTENT_NOT_PENDING(7005, "内容不在待审核状态"),

    // 上传 5000-5999
    FILE_TOO_LARGE(5001, "文件大小不能超过10MB"),
    FILE_TYPE_INVALID(5002, "仅支持 jpg/png/webp 格式"),
    FILE_UPLOAD_FAILED(5003, "文件上传失败"),

    // 校验 6000-6999
    PARAM_INVALID(6001, "参数校验失败"),
    PARAM_MISSING(6002, "缺少必要参数"),

    // 系统 9000-9999
    SYSTEM_ERROR(9001, "服务暂时不可用，请稍后重试"),
    RATE_LIMITED(9002, "请求过于频繁，请稍后再试"),
    DB_ERROR(9003, "数据库操作失败");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
