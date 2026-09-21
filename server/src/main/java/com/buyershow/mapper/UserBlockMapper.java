package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.dto.response.BlockedUserDTO;
import com.buyershow.entity.UserBlock;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 用户拉黑关系数据访问。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Mapper
public interface UserBlockMapper extends BaseMapper<UserBlock> {

    /** 任意方向存在拉黑关系（用于私信限制）。 */
    @Select("SELECT COUNT(*) FROM user_blocks WHERE "
            + "(blocker_id = #{userIdA} AND blocked_id = #{userIdB}) "
            + "OR (blocker_id = #{userIdB} AND blocked_id = #{userIdA})")
    int countBlockBetween(@Param("userIdA") Long userIdA, @Param("userIdB") Long userIdB);

    /** 我的拉黑列表（按拉黑时间倒序）。 */
    @Select("SELECT u.id, u.nickname, u.avatar_url AS avatarUrl, ub.created_at AS blockedAt "
            + "FROM user_blocks ub JOIN users u ON u.id = ub.blocked_id "
            + "WHERE ub.blocker_id = #{blockerId} ORDER BY ub.id DESC")
    List<BlockedUserDTO> selectBlockedUsers(@Param("blockerId") Long blockerId);
}
