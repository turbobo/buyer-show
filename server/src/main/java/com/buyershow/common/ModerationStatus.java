package com.buyershow.common;

import lombok.Getter;

/**
 * 内容审核状态枚举。
 */
@Getter
public enum ModerationStatus {

    APPROVED(0, "审核通过"),
    PENDING(1, "待人工审核"),
    REJECTED(2, "审核驳回");

    private final int value;
    private final String description;

    ModerationStatus(int value, String description) {
        this.value = value;
        this.description = description;
    }
}
