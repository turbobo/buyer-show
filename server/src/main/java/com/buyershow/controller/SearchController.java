package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.response.PostDTO;
import com.buyershow.mapper.PostMapper;
import com.buyershow.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class SearchController {
    
    private final PostService postService;
    private final PostMapper postMapper;
    
    @GetMapping("/search")
    public R<List<PostDTO>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "20") int limit) {
        return R.ok(postService.searchPosts(keyword, limit));
    }
    
    @GetMapping("/search/hot-tags")
    public R<List<String>> getHotTags() {
        return R.ok(postMapper.selectHotTags(10));
    }
    
    @GetMapping("/search/suggest")
    public R<List<String>> suggestTags(@RequestParam String prefix) {
        return R.ok(postMapper.suggestTags(prefix, 5));
    }
}
