package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.UpdateProfileRequest;
import com.buyershow.dto.response.BlockedUserDTO;
import com.buyershow.dto.response.CreatorStatsDTO;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.PostDTO;
import com.buyershow.dto.response.UserCommentRow;
import com.buyershow.dto.response.UserDTO;
import com.buyershow.service.CommentService;
import com.buyershow.service.CreatorStatsService;
import com.buyershow.service.PostService;
import com.buyershow.service.UserBlockService;
import com.buyershow.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PostService postService;
    private final CommentService commentService;
    private final UserBlockService userBlockService;
    private final CreatorStatsService creatorStatsService;

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

    /** 获取指定用户收藏的公开帖子（游标分页；folderId 收藏夹筛选，G7）。 */
    @GetMapping("/{userId}/favorites")
    public R<CursorPage<PostDTO>> getUserFavorites(
            @PathVariable Long userId,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Long folderId,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(postService.listUserFavorites(userId, cursor, size, folderId));
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

    /** 获取当前用户收藏的评论（仅本人可见）。 */
    @GetMapping("/me/favorite-comments")
    public R<CursorPage<UserCommentRow>> getMyFavoriteComments(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size) {
        return R.ok(commentService.listMyFavoriteComments(cursor, size));
    }

    /** 创作数据总览（G9）：本人帖子的阅读/点赞/收藏/评论反馈，仅本人可见。 */
    @GetMapping("/me/creator-stats")
    public R<CreatorStatsDTO> getCreatorStats(@RequestParam(defaultValue = "7") int days) {
        return R.ok(creatorStatsService.getCreatorStats(days));
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

    /** 拉黑用户（G6）：内容互不可见 + 禁私信 + 自动双向取关。 */
    @PostMapping("/{userId}/block")
    public R<Boolean> blockUser(@PathVariable Long userId) {
        return R.ok(userBlockService.block(userId));
    }

    /** 解除拉黑。 */
    @DeleteMapping("/{userId}/block")
    public R<Boolean> unblockUser(@PathVariable Long userId) {
        return R.ok(userBlockService.unblock(userId));
    }

    /** 我的拉黑列表（按拉黑时间倒序）。 */
    @GetMapping("/me/blocks")
    public R<List<BlockedUserDTO>> getMyBlocks() {
        return R.ok(userBlockService.listBlockedUsers());
    }
}
