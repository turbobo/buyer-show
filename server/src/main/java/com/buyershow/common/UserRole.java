package com.buyershow.common;

import lombok.Getter;

/**
 * 用户角色枚举。
 */
@Getter
public enum UserRole {

    USER(0, "普通用户"),
    ADMIN(1, "管理员");

    private final int value;
    private final String description;

    UserRole(int value, String description) {
        this.value = value;
        this.description = description;
    }
}
