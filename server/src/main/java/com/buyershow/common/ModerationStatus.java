package com.buyershow.common;

/**
 * 内容审核状态常量。
 *
 * @author Qoder
 * @since 2026/09/08
 */
public final class ModerationStatus {

    /** 审核通过，可公开展示。 */
    public static final int APPROVED = 0;

    /** 需要人工审核，不公开展示。 */
    public static final int PENDING = 1;

    /** 审核驳回，不公开展示。 */
    public static final int REJECTED = 2;

    private ModerationStatus() {
    }
}
