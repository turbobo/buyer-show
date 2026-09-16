package com.buyershow.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.response.AuditLogDTO;
import com.buyershow.entity.AdminAuditLog;
import com.buyershow.mapper.AdminAuditLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

/**
 * 管理员审计日志：记录与查询管理员操作。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private static final int MAX_DETAIL_LENGTH = 500;
    private static final long MAX_PAGE_SIZE = 100;

    private final AdminAuditLogMapper adminAuditLogMapper;

    /**
     * 记录管理员操作（与业务同事务，失败向上抛出）。
     *
     * @param adminId 操作管理员ID
     * @param action 动作（如 BAN_USER）
     * @param targetType 目标类型（如 USER）
     * @param targetId 目标ID
     * @param detail 操作说明/原因（可空，超长截断）
     */
    public void log(Long adminId, String action, String targetType, Long targetId, String detail) {
        AdminAuditLog entry = new AdminAuditLog();
        entry.setAdminId(adminId);
        entry.setAction(action);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        entry.setDetail(detail == null || detail.isBlank()
                ? null
                : detail.length() > MAX_DETAIL_LENGTH ? detail.substring(0, MAX_DETAIL_LENGTH) : detail);
        adminAuditLogMapper.insert(entry);
    }

    /**
     * 分页查询审计日志（仅管理员）。
     *
     * @param page 页码
     * @param size 每页数量
     * @param actions 动作筛选（逗号分隔，可空）
     * @return 审计日志分页
     */
    public IPage<AuditLogDTO> listLogs(long page, long size, String actions) {
        requireAdmin();
        long safePage = Math.max(page, 1);
        long safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        List<String> actionList = actions == null || actions.isBlank()
                ? List.of()
                : Arrays.stream(actions.split(",")).map(String::trim).filter(item -> !item.isEmpty()).toList();
        return adminAuditLogMapper.selectAuditLogs(new Page<>(safePage, safeSize), actionList);
    }

    private void requireAdmin() {
        if (!SecurityUtils.isAdmin()) {
            throw new BusinessException(ErrorCode.NO_PERMISSION);
        }
    }
}
