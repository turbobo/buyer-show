package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.PostAppeal;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

@Mapper
public interface PostAppealMapper extends BaseMapper<PostAppeal> {

    @Update("UPDATE post_appeals SET status = #{status}, handle_reason = #{handleReason}, "
            + "handled_by = #{adminId}, handled_at = #{handledAt} "
            + "WHERE id = #{appealId} AND status = 0")
    int handlePending(
            @Param("appealId") Long appealId,
            @Param("status") int status,
            @Param("handleReason") String handleReason,
            @Param("adminId") Long adminId,
            @Param("handledAt") LocalDateTime handledAt);
}
