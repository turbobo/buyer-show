package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.CreateContentReportRequest;
import com.buyershow.service.ContentReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 用户内容举报 REST 接口。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ContentReportController {

    private final ContentReportService contentReportService;

    /**
     * 提交帖子或评论举报。
     *
     * @param request 举报请求
     * @return 举报记录ID
     */
    @PostMapping
    public R<Map<String, Long>> createReport(@Valid @RequestBody CreateContentReportRequest request) {
        return R.ok(Map.of("reportId", contentReportService.createReport(request)));
    }
}
