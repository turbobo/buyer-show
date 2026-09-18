package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理端用户列表视图。
 */
@Data
@Builder
public class AdminUserDTO {
    private Long id;
    private String username;
    private String nickname;
    private String avatarUrl;
    private String email;
    private String phone;
    /** 角色：0 普通用户 / 1 管理员 */
    private Integer role;
    /** 状态：0 正常 / 1 封禁 / 2 注销 */
    private Integer status;
    private Integer postCount;
    private LocalDateTime createdAt;
    /** 最后登录时间（从未登录为 null，前端展示「从未」） */
    private LocalDateTime lastLoginAt;
}
