package com.buyershow.common;

import lombok.Getter;

/**
 * 帖子状态枚举。
 */
@Getter
public enum PostStatus {

    PUBLIC(0, "公开"),
    HIDDEN(1, "隐藏"),
    DELETED(2, "删除");

    private final int value;
    private final String description;

    PostStatus(int value, String description) {
        this.value = value;
        this.description = description;
    }
}
