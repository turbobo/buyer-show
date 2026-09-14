package com.buyershow.common;

import lombok.Getter;

/**
 * 评论状态枚举。
 */
@Getter
public enum CommentStatus {

    ACTIVE(0, "正常"),
    DELETED(1, "删除");

    private final int value;
    private final String description;

    CommentStatus(int value, String description) {
        this.value = value;
        this.description = description;
    }
}
