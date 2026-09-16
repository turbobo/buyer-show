package com.buyershow.dto.response;

import lombok.Data;

/**
 * 关注关系查询内部行模型（含关系表游标键）。
 */
@Data
public class FollowQueryRow {
    private Long id;
    private String nickname;
    private String avatarUrl;
    private String bio;
    private Integer isFollowing;
    private Integer mutual;
    private Long cursorId;
}
