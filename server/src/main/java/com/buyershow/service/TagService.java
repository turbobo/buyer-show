package com.buyershow.service;

import com.buyershow.dto.response.TagStatDTO;
import com.buyershow.mapper.PostMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 公开标签服务：基于 posts.tags 的聚合查询（供 Feed 筛选与发布页选择）。
 *
 * @author Qoder
 * @since 2026/09/17
 */
@Service
@RequiredArgsConstructor
public class TagService {

    private static final int MAX_TAG_RESULTS = 50;

    private final PostMapper postMapper;

    /**
     * 热门标签聚合（按使用量倒序）。
     *
     * @param limit 数量上限（1-50）
     * @return 标签统计列表
     */
    public List<TagStatDTO> listHotTags(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), MAX_TAG_RESULTS);
        return postMapper.selectTagStats(null, safeLimit);
    }
}
