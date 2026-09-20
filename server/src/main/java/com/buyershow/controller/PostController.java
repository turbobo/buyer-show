package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.AppealRequest;
import com.buyershow.dto.request.CreatePostRequest;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.PostDTO;
import com.buyershow.service.PostAppealService;
import com.buyershow.service.PostService;
import com.buyershow.common.security.RateLimit;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final PostAppealService postAppealService;

    @GetMapping
    public R<CursorPage<PostDTO>> getFeed(
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "new") String sort,
            @RequestParam(defaultValue = "all") String scope) {
        return R.ok(postService.getFeed(cursor, tag, limit, sort, scope));
    }

    @GetMapping("/{id}")
    public R<PostDTO> getPostDetail(@PathVariable Long id) {
        return R.ok(postService.getPostDetail(id));
    }

    @PostMapping
    @RateLimit(key = "post:create", limit = 10, windowSeconds = 60)
    public R<PostDTO> createPost(@Valid @RequestBody CreatePostRequest request) {
        return R.ok(postService.createPost(request));
    }

    @DeleteMapping("/{id}")
    public R<Void> deletePost(@PathVariable Long id) {
        postService.deletePost(id);
        return R.ok();
    }

    @PutMapping("/{id}")
    @RateLimit(key = "post:edit", limit = 10, windowSeconds = 60)
    public R<PostDTO> updatePost(@PathVariable Long id, @Valid @RequestBody CreatePostRequest request) {
        return R.ok(postService.updatePost(id, request));
    }

    @PostMapping("/{id}/like")
    public R<Map<String, Boolean>> toggleLike(@PathVariable Long id) {
        boolean liked = postService.toggleLike(id);
        return R.ok(Map.of("liked", liked));
    }

    @PostMapping("/{id}/favorite")
    public R<Map<String, Boolean>> toggleFavorite(@PathVariable Long id) {
        boolean favorited = postService.toggleFavorite(id);
        return R.ok(Map.of("favorited", favorited));
    }

    /** 发起申诉（仅已下架帖子的作者）。 */
    @PostMapping("/{id}/appeal")
    public R<Void> createAppeal(@PathVariable Long id, @Valid @RequestBody AppealRequest request) {
        postAppealService.createAppeal(id, request.getReason());
        return R.ok();
    }
}
