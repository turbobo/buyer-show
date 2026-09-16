package com.buyershow.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.buyershow.common.R;
import com.buyershow.dto.request.HandleAppealRequest;
import com.buyershow.dto.response.AppealDTO;
import com.buyershow.service.PostAppealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理端申诉处理接口。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminAppealController {

    private final PostAppealService postAppealService;

    /** 申诉列表（待处理优先）。 */
    @GetMapping("/appeals")
    public R<IPage<AppealDTO>> listAppeals(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) Integer status) {
        return R.ok(postAppealService.listAppeals(page, size, status));
    }

    /** 处理申诉（APPROVE 通过并解封 / REJECT 驳回）。 */
    @PostMapping("/appeals/{appealId}")
    public R<Void> handleAppeal(
            @PathVariable Long appealId,
            @Valid @RequestBody HandleAppealRequest request) {
        postAppealService.handleAppeal(appealId, request.getAction(), request.getReason());
        return R.ok();
    }
}
