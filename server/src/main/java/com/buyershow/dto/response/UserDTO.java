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
}
