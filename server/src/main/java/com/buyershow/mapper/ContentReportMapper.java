package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.ContentReport;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

@Mapper
public interface ContentReportMapper extends BaseMapper<ContentReport> {

    @Update("UPDATE content_reports SET status = #{newStatus}, handled_by = #{adminId}, "
            + "handled_at = #{handledAt} WHERE id = #{reportId} AND status = 0")
    int handlePending(
            @Param("reportId") Long reportId,
            @Param("newStatus") int newStatus,
            @Param("adminId") Long adminId,
            @Param("handledAt") LocalDateTime handledAt);
}
