package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.SensitiveWord;
import org.apache.ibatis.annotations.Mapper;

/**
 * 敏感词规则数据访问接口。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@Mapper
public interface SensitiveWordMapper extends BaseMapper<SensitiveWord> {
}
