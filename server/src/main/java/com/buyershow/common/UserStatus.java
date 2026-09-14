package com.buyershow.common;

import lombok.Getter;

/**
 * 用户状态枚举。
 */
@Getter
public enum UserStatus {

    ACTIVE(0, "正常"),
    BANNED(1, "封禁"),
    DELETED(2, "注销");

    private final int value;
    private final String description;

    UserStatus(int value, String description) {
        this.value = value;
        this.description = description;
    }
}
