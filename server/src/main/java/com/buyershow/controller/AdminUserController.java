package com.buyershow.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.buyershow.common.R;
import com.buyershow.dto.request.BanRequest;
import com.buyershow.dto.response.AdminUserDTO;
import com.buyershow.dto.response.AdminUserPostDTO;
import com.buyershow.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理端用户与内容管理接口：用户封禁/解封、用户帖子封禁/解封。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    /** 用户列表（搜索/状态筛选/分页）。 */
    @GetMapping("/users")
    public R<IPage<AdminUserDTO>> listUsers(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer status) {
        return R.ok(adminUserService.listUsers(page, size, search, status));
    }

    /** 封禁用户。 */
    @PostMapping("/users/{userId}/ban")
    public R<Void> banUser(@PathVariable Long userId, @Valid @RequestBody BanRequest request) {
        adminUserService.banUser(userId, request.getReason());
        return R.ok();
    }

    /** 解封用户。 */
    @PostMapping("/users/{userId}/unban")
    public R<Void> unbanUser(@PathVariable Long userId) {
        adminUserService.unbanUser(userId);
        return R.ok();
    }

    /** 用户帖子列表（含封禁/待审状态，用于用户维度管理）。 */
    @GetMapping("/users/{userId}/posts")
    public R<IPage<AdminUserPostDTO>> listUserPosts(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return R.ok(adminUserService.listUserPosts(userId, page, size));
    }

    /** 封禁帖子。 */
    @PostMapping("/posts/{postId}/ban")
    public R<Void> banPost(@PathVariable Long postId, @Valid @RequestBody BanRequest request) {
        adminUserService.banPost(postId, request.getReason());
        return R.ok();
    }

    /** 解封帖子。 */
    @PostMapping("/posts/{postId}/unban")
    public R<Void> unbanPost(@PathVariable Long postId) {
        adminUserService.unbanPost(postId);
        return R.ok();
    }
}
