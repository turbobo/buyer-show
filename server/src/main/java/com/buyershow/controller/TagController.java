package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.response.TagStatDTO;
import com.buyershow.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 公开标签接口（Feed 筛选与发布页选择）。
 *
 * @author Qoder
 * @since 2026/09/17
 */
@RestController
@RequestMapping("/api/v1/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    /** 热门标签聚合（按使用量倒序，公开）。 */
    @GetMapping
    public R<List<TagStatDTO>> listHotTags(@RequestParam(defaultValue = "20") int limit) {
        return R.ok(tagService.listHotTags(limit));
    }
}
