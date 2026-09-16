package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.UpdateProfileRequest;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.PostDTO;
import com.buyershow.dto.response.UserCommentRow;
import com.buyershow.dto.response.UserDTO;
import com.buyershow.service.CommentService;
import com.buyershow.service.PostService;
import com.buyershow.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PostService postService;
    private final CommentService commentService;

    /** 获取指定用户公开资料。 */
    @GetMapping("/{userId}")
    public R<UserDTO> getUserProfile(@PathVariable Long userId) {
        return R.ok(userService.getUserProfile(userId));
    }

    /** 获取指定用户的公开帖子（游标分页）。 */
    @GetMapping("/{userId}/posts")
    public R<CursorPage<PostDTO>> getUserPosts(
            @PathVariable Long userId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(postService.listUserPosts(userId, cursor, size));
    }

    /** 获取指定用户收藏的公开帖子（游标分页）。 */
    @GetMapping("/{userId}/favorites")
    public R<CursorPage<PostDTO>> getUserFavorites(
            @PathVariable Long userId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(postService.listUserFavorites(userId, cursor, size));
    }

    /** 获取指定用户点赞过的公开帖子（游标分页）。 */
    @GetMapping("/{userId}/likes")
    public R<CursorPage<PostDTO>> getUserLikes(
            @PathVariable Long userId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(postService.listUserLikedPosts(userId, cursor, size));
    }

    /** 获取当前用户自己的全部帖子（含待审/未通过）。 */
    @GetMapping("/me/posts")
    public R<CursorPage<PostDTO>> getMyPosts(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(postService.listOwnPosts(cursor, size));
    }

    /** 获取当前用户的评论（含待审/未通过，仅本人可见）。 */
    @GetMapping("/me/comments")
    public R<CursorPage<UserCommentRow>> getMyComments(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(commentService.listMyComments(cursor, size));
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
