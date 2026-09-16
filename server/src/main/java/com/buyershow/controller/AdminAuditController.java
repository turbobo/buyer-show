package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.response.AuditLogDTO;
import com.buyershow.service.AdminAuditService;
import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理端审计日志接口。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminAuditController {

    private final AdminAuditService adminAuditService;

    /** 审计日志分页查询（可按动作集合筛选，逗号分隔）。 */
    @GetMapping("/audit-logs")
    public R<IPage<AuditLogDTO>> listAuditLogs(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) String actions) {
        return R.ok(adminAuditService.listLogs(page, size, actions));
    }
}
