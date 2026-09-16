package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

/**
 * 关注/粉丝列表用户视图。
 */
@Data
@Builder
public class FollowUserDTO {
    private Long id;
    private String nickname;
    private String avatarUrl;
    private String bio;
    /** 当前登录用户是否已关注对方 */
    private Boolean isFollowing;
    /** 对方是否也关注了当前登录用户（互相关注） */
    private Boolean mutual;
}
