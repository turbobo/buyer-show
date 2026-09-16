package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.buyershow.dto.response.AuditLogDTO;
import com.buyershow.entity.AdminAuditLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 管理员审计日志访问。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Mapper
public interface AdminAuditLogMapper extends BaseMapper<AdminAuditLog> {

    /**
     * 分页查询审计日志（可按动作集合筛选，时间倒序）。
     */
    @Select({
            "<script>",
            "SELECT a.id, a.admin_id AS adminId, u.nickname AS adminNickname, a.action,",
            "       a.target_type AS targetType, a.target_id AS targetId, a.detail,",
            "       a.created_at AS createdAt",
            "FROM admin_audit_log a LEFT JOIN users u ON u.id = a.admin_id",
            "WHERE 1 = 1",
            "<if test='actions != null and actions.size() > 0'>",
            "  AND a.action IN",
            "  <foreach collection='actions' item='item' open='(' separator=',' close=')'>",
            "    #{item}",
            "  </foreach>",
            "</if>",
            "ORDER BY a.id DESC",
            "</script>"
    })
    IPage<AuditLogDTO> selectAuditLogs(Page<AuditLogDTO> page, @Param("actions") List<String> actions);
}
