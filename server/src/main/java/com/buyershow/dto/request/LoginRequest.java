package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 登录请求：账号标识支持用户名、手机号或邮箱。
 *
 * @author Qoder
 * @since 2026/09/14
 */
@Data
public class LoginRequest {
    @NotBlank(message = "请输入用户名、手机号或邮箱")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;
}
