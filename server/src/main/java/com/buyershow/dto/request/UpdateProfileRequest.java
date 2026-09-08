package com.buyershow.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(min = 2, max = 50, message = "昵称长度2-50字符")
    private String nickname;

    @Size(max = 500, message = "简介最多500字符")
    private String bio;

    private String avatarUrl;
}
