package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.CommentLike;
import org.apache.ibatis.annotations.Mapper;

/**
 * 评论点赞关系访问。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Mapper
public interface CommentLikeMapper extends BaseMapper<CommentLike> {
}
