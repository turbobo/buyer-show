package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.FavoriteComment;
import org.apache.ibatis.annotations.Mapper;

/**
 * 评论收藏关系访问。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Mapper
public interface FavoriteCommentMapper extends BaseMapper<FavoriteComment> {
}
