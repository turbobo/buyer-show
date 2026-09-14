package com.buyershow.service;

import com.buyershow.common.ModerationStatus;

/**
 * 本地规则审核结果。
 */
public final class ModerationDecision {

    private final ModerationStatus status;
    private final String reason;

    public ModerationDecision(ModerationStatus status, String reason) {
        this.status = status;
        this.reason = reason;
    }

    public ModerationStatus getStatus() {
        return status;
    }

    public String getReason() {
        return reason;
    }
}
