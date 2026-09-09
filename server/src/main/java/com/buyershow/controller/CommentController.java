package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.CreateCommentRequest;
import com.buyershow.dto.response.CommentDTO;
import com.buyershow.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
     * 获取帖子的公开评论树。
     *
     * @param postId 帖子ID
     * @return 评论树
     */
    @GetMapping("/posts/{postId}/comments")
    public R<List<CommentDTO>> listComments(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "50") int limit) {
        return R.ok(commentService.listComments(postId, limit));
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
}
