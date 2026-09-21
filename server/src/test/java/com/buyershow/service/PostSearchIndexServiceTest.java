package com.buyershow.service;

import com.buyershow.common.search.PostDoc;
import com.buyershow.common.search.SearchHitResult;
import com.buyershow.mapper.PostMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 帖子搜索索引服务测试：验证 ES 查询的排序策略（相关性同分新帖优先）与高亮收集。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class PostSearchIndexServiceTest {

    private final ElasticsearchOperations operations = mock(ElasticsearchOperations.class);
    private final PostMapper postMapper = mock(PostMapper.class);
    private final PostAssembler postAssembler = mock(PostAssembler.class);
    private final PostSearchIndexService service =
            new PostSearchIndexService(operations, postMapper, postAssembler);

    @Test
    @SuppressWarnings("unchecked")
    void testSearchSortsByScoreThenPostIdDesc() {
        PostDoc docOld = PostDoc.builder().id(30L).postId(30L).title("旧帖").build();
        PostDoc docNew = PostDoc.builder().id(40L).postId(40L).title("新帖").build();
        SearchHit<PostDoc> hitOld = mock(SearchHit.class);
        SearchHit<PostDoc> hitNew = mock(SearchHit.class);
        when(hitOld.getContent()).thenReturn(docOld);
        when(hitOld.getHighlightFields()).thenReturn(Map.of());
        when(hitNew.getContent()).thenReturn(docNew);
        when(hitNew.getHighlightFields()).thenReturn(Map.of("title", List.of("咖啡<em>新帖</em>")));
        SearchHits<PostDoc> hits = mock(SearchHits.class);
        when(hits.iterator()).thenReturn(List.of(hitOld, hitNew).iterator());
        when(operations.search(any(NativeQuery.class), eq(PostDoc.class))).thenReturn(hits);

        SearchHitResult result = service.search("咖啡", 20);

        ArgumentCaptor<NativeQuery> captor = ArgumentCaptor.forClass(NativeQuery.class);
        verify(operations).search(captor.capture(), eq(PostDoc.class));
        NativeQuery query = captor.getValue();
        assertNotNull(query.getSort());
        List<org.springframework.data.domain.Sort.Order> orders =
                query.getSort().stream().toList();
        assertEquals(2, orders.size());
        assertEquals("_score", orders.get(0).getProperty());
        assertEquals(org.springframework.data.domain.Sort.Direction.DESC, orders.get(0).getDirection());
        assertEquals("postId", orders.get(1).getProperty());
        assertEquals(org.springframework.data.domain.Sort.Direction.DESC, orders.get(1).getDirection());

        assertEquals(List.of(30L, 40L), result.getIds());
        assertEquals("咖啡<em>新帖</em>", result.getHighlights().get(40L).get("title"));
    }
}
