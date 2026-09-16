package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.TagOperationRequest;
import com.buyershow.dto.response.TagStatDTO;
import com.buyershow.service.TagAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理端标签管理接口。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class TagAdminController {

    private final TagAdminService tagAdminService;

    /** 标签聚合统计（按使用量倒序，可按关键词过滤）。 */
    @GetMapping("/tags")
    public R<List<TagStatDTO>> listTags(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "100") int limit) {
        return R.ok(tagAdminService.listTags(keyword, limit));
    }

    /** 重命名标签。 */
    @PostMapping("/tags/rename")
    public R<Map<String, Integer>> renameTag(@Valid @RequestBody TagOperationRequest request) {
        return R.ok(Map.of("affected", tagAdminService.renameTag(request)));
    }

    /** 合并标签到目标标签。 */
    @PostMapping("/tags/merge")
    public R<Map<String, Integer>> mergeTag(@Valid @RequestBody TagOperationRequest request) {
        return R.ok(Map.of("affected", tagAdminService.mergeTag(request)));
    }

    /** 删除标签。 */
    @PostMapping("/tags/delete")
    public R<Map<String, Integer>> deleteTag(@Valid @RequestBody TagOperationRequest request) {
        Map<String, Integer> result = new HashMap<>();
        result.put("affected", tagAdminService.deleteTag(request));
        return R.ok(result);
    }
}
