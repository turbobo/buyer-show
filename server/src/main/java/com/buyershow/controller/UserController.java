package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.UpdateProfileRequest;
import com.buyershow.dto.response.UserDTO;
import com.buyershow.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** 获取指定用户公开资料。 */
    @GetMapping("/{userId}")
    public R<UserDTO> getUserProfile(@PathVariable Long userId) {
        return R.ok(userService.getUserProfile(userId));
    }

    /** 获取当前登录用户资料。 */
    @GetMapping("/me")
    public R<UserDTO> getCurrentUserProfile() {
        return R.ok(userService.getCurrentUserProfile());
    }

    /** 更新当前用户资料。 */
    @PutMapping("/me")
    public R<UserDTO> updateCurrentUserProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return R.ok(userService.updateCurrentUserProfile(request));
    }
}
