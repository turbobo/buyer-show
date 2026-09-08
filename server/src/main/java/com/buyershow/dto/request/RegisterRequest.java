package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 50, message = "用户名长度3-50字符")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 128, message = "密码长度至少6位")
    private String password;

    @NotBlank(message = "昵称不能为空")
    @Size(min = 2, max = 50, message = "昵称长度2-50字符")
    private String nickname;
}
