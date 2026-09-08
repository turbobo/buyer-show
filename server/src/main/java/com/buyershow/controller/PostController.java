package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.CreatePostRequest;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.PostDTO;
import com.buyershow.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public R<CursorPage<PostDTO>> getFeed(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit) {
        return R.ok(postService.getFeed(cursor, limit));
    }

    @GetMapping("/{id}")
    public R<PostDTO> getPostDetail(@PathVariable Long id) {
        return R.ok(postService.getPostDetail(id));
    }

    @PostMapping
    public R<PostDTO> createPost(@Valid @RequestBody CreatePostRequest request) {
        return R.ok(postService.createPost(request));
    }

    @DeleteMapping("/{id}")
    public R<Void> deletePost(@PathVariable Long id) {
        postService.deletePost(id);
        return R.ok();
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
}
