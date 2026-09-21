package com.buyershow.common.search;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * ES 搜索命中结果（G5）：帖子 id 有序列表 + 各字段高亮片段（HTML，含 &lt;em&gt; 标记）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
@Builder
public class SearchHitResult {

    /** 按 ES 打分排序的帖子 id。 */
    private List<Long> ids;

    /** postId -> (字段名 -> 高亮 HTML 片段)。 */
    private Map<Long, Map<String, String>> highlights;
}
