package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.CreateCommentRequest;
import com.buyershow.dto.request.UpdateCommentRequest;
import com.buyershow.dto.response.CommentDTO;
import com.buyershow.dto.response.CommentFavoriteResult;
import com.buyershow.dto.response.CommentLikeResult;
import com.buyershow.service.CommentService;
import com.buyershow.common.security.RateLimit;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 帖子评论 REST 接口。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /**
     * 获取帖子的公开评论树（最新排序支持游标分页）。
     *
     * @param postId 帖子ID
     * @param sort 排序方式（latest 最新 / hot 最热）
     * @param cursor 分页游标（可空）
     * @return 评论树
     */
    @GetMapping("/posts/{postId}/comments")
    public R<List<CommentDTO>> listComments(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(required = false) String cursor) {
        return R.ok(commentService.listComments(postId, limit, sort, cursor));
    }

    /**
     * 发布帖子评论或一级回复。
     *
     * @param postId  帖子ID
     * @param request 评论请求
     * @return 已创建评论
     */
    @PostMapping("/posts/{postId}/comments")
    public R<CommentDTO> createComment(
            @PathVariable Long postId,
            @Valid @RequestBody CreateCommentRequest request) {
        return R.ok(commentService.createComment(postId, request));
    }

    /**
     * 删除评论。
     *
     * @param commentId 评论ID
     * @return 空响应
     */
    @DeleteMapping("/comments/{commentId}")
    public R<Void> deleteComment(@PathVariable Long commentId) {
        commentService.deleteComment(commentId);
        return R.ok();
    }

    /**
     * 点赞/取消点赞评论（幂等切换）。
     *
     * @param commentId 评论ID
     * @return 最新点赞状态与计数
     */
    @PostMapping("/comments/{commentId}/like")
    public R<CommentLikeResult> toggleCommentLike(@PathVariable Long commentId) {
        return R.ok(commentService.toggleCommentLike(commentId));
    }

    /**
     * 收藏/取消收藏评论（幂等切换）。
     *
     * @param commentId 评论ID
     * @return 最新收藏状态
     */
    @PostMapping("/comments/{commentId}/favorite")
    public R<CommentFavoriteResult> toggleCommentFavorite(@PathVariable Long commentId) {
        return R.ok(commentService.toggleCommentFavorite(commentId));
    }

    /**
     * 编辑评论（仅作者、发布后 5 分钟内，内容重新过审）。
     *
     * @param commentId 评论ID
     * @param request 新内容
     * @return 空响应
     */
    @PutMapping("/comments/{commentId}")
    public R<Void> updateComment(
            @PathVariable Long commentId,
            @Valid @RequestBody UpdateCommentRequest request) {
        commentService.updateComment(commentId, request);
        return R.ok();
    }
}
