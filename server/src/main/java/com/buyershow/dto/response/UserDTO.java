package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDTO {
    private Long id;
    private String username;
    private String nickname;
    private String avatarUrl;
    private String bio;
    private Integer postCount;
    private Integer followerCount;
    private Integer followingCount;
    private Boolean isFollowing;
    /** G6：当前登录用户是否已拉黑该用户（游客/非本人视角可能为 null）。 */
    private Boolean blockedByMe;
}
