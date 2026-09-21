package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.response.TopicDTO;
import com.buyershow.service.TopicService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 公开话题接口（G10）：话题发现页与话题聚合页。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@RestController
@RequestMapping("/api/v1/topics")
@RequiredArgsConstructor
public class TopicController {

    private final TopicService topicService;

    /** 启用中的话题列表（含帖子数），无需登录。 */
    @GetMapping
    public R<List<TopicDTO>> listActive() {
        return R.ok(topicService.listActive());
    }

    /** 话题详情（含帖子数）。 */
    @GetMapping("/{id}")
    public R<TopicDTO> getTopic(@PathVariable Long id) {
        return R.ok(topicService.getTopic(id));
    }
}
