package com.buyershow.service;

/**
 * 本地规则审核结果。
 *
 * @param status 审核状态，使用 ModerationStatus 常量
 * @param reason 命中规则说明
 * @author Qoder
 * @since 2026/09/08
 */
public final class ModerationDecision {

    private final int status;
    private final String reason;

    public ModerationDecision(int status, String reason) {
        this.status = status;
        this.reason = reason;
    }

    public int getStatus() {
        return status;
    }

    public String getReason() {
        return reason;
    }
}
