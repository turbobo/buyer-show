package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("users")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String username;
    private String email;
    private String phone;
    private String passwordHash;
    private String nickname;
    private String avatarUrl;
    private String bio;

    private Integer postCount;
    private Integer followerCount;
    private Integer followingCount;

    /** 0=用户 1=管理员 */
    private Integer role;

    /** 0=正常 1=封禁 2=注销 */
    private Integer status;

    private String openid;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
