package com.buyershow.service;

import com.buyershow.common.search.PostDoc;
import com.buyershow.common.search.PostIndexEvents;
import com.buyershow.common.search.SearchHitResult;
import com.buyershow.dto.response.PostIndexRow;
import com.buyershow.mapper.PostMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.index.Settings;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;
import org.springframework.data.elasticsearch.core.query.HighlightQuery;
import org.springframework.data.elasticsearch.core.query.highlight.Highlight;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightField;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightFieldParameters;
import org.springframework.data.elasticsearch.core.query.highlight.HighlightParameters;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 帖子搜索索引服务（G5 ES 搜索增强）。
 *
 * <p>职责：索引生命周期（创建/重建）与帖子文档同步（新增/更新/删除）。
 * 全部写入操作异步执行且失败仅告警——ES 不可用时主业务流程不受影响，搜索自动降级 MySQL LIKE。
 * 索引内容仅包含公开且审核通过的帖子（status=0 且 moderation_status=0）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PostSearchIndexService {

    private static final String INDEX_NAME = "posts";

    /** 标题高亮片段字符数。 */
    private static final int HIGHLIGHT_FRAGMENT = 80;

    private final ElasticsearchOperations operations;
    private final PostMapper postMapper;
    private final PostAssembler postAssembler;

    /**
     * 应用启动时确保索引存在：不存在则创建（自定义 ngram 分析器）并全量重建历史数据。
     * 启动重建为同步执行（自调用不走 @Async 代理），数据量小可接受；ES 不可用时仅告警，不影响启动。
     */
    public void ensureIndexOnStartup() {
        try {
            IndexCoordinates coordinates = IndexCoordinates.of(INDEX_NAME);
            IndexOperations indexOps = operations.indexOps(coordinates);
            if (!indexOps.exists()) {
                // 自定义 ngram 分析器（1-2 字符词元），支持中文子串匹配
                indexOps.create(new Settings(Map.of(
                        "number_of_shards", 1,
                        "number_of_replicas", 0,
                        "analysis.tokenizer.ngram_tokenizer.type", "ngram",
                        "analysis.tokenizer.ngram_tokenizer.min_gram", 1,
                        "analysis.tokenizer.ngram_tokenizer.max_gram", 2,
                        "analysis.analyzer.ngram_search.tokenizer", "ngram_tokenizer",
                        "analysis.analyzer.ngram_search.filter", List.of("lowercase"))));
                indexOps.putMapping(PostDoc.class);
                log.info("Elasticsearch index created: {}", INDEX_NAME);
                rebuildAll();
            }
        } catch (Exception e) {
            log.warn("Elasticsearch index init failed, search will fallback to MySQL LIKE: {}", e.getMessage());
        }
    }

    /** 索引/更新单个帖子（帖子须公开且审核通过，否则删除其文档）。 */
    public void indexPost(Long postId) {
        try {
            PostIndexRow row = postMapper.selectIndexRow(postId);
            if (row == null || row.getUserStatus() == null || row.getUserStatus() != 0) {
                deletePost(postId);
                return;
            }
            operations.save(toDoc(row));
        } catch (Exception e) {
            log.warn("Elasticsearch index post failed. postId: {}, message: {}", postId, e.getMessage());
        }
    }

    /** 删除单个帖子文档。 */
    public void deletePost(Long postId) {
        try {
            operations.delete(postId.toString(), PostDoc.class);
        } catch (Exception e) {
            log.warn("Elasticsearch delete post failed. postId: {}, message: {}", postId, e.getMessage());
        }
    }

    /** 批量删除某用户的全部帖子文档（用户封禁时）。 */
    public void deleteByUserId(Long userId) {
        try {
            operations.delete(NativeQuery.builder()
                    .withQuery(q -> q.term(t -> t.field("userId").value(userId)))
                    .build(), PostDoc.class);
        } catch (Exception e) {
            log.warn("Elasticsearch delete by user failed. userId: {}, message: {}", userId, e.getMessage());
        }
    }

    /** 重建某用户的公开帖子文档（用户解封时）。 */
    public void rebuildByUserId(Long userId) {
        try {
            List<PostIndexRow> rows = postMapper.selectIndexRows(userId);
            if (!rows.isEmpty()) {
                operations.save(rows.stream().map(this::toDoc).toList());
            }
        } catch (Exception e) {
            log.warn("Elasticsearch rebuild by user failed. userId: {}, message: {}", userId, e.getMessage());
        }
    }

    /** 全量重建索引（标签重命名/合并/删除等影响 tags 的批量操作后）。 */
    public void rebuildAll() {
        try {
            List<PostIndexRow> rows = postMapper.selectIndexRows(null);
            if (!rows.isEmpty()) {
                operations.save(rows.stream().map(this::toDoc).toList());
            }
            log.info("Elasticsearch index rebuilt. docs: {}", rows.size());
        } catch (Exception e) {
            log.warn("Elasticsearch rebuild all failed: {}", e.getMessage());
        }
    }

    /**
     * 事务提交后异步索引/更新单个帖子。
     *
     * <p>@TransactionalEventListener 保证读库发生在事务提交后（避免读不到未提交新帖导致文档漏写）；
     * fallbackExecution 兼容无事务调用点（立即执行）。
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPostIndexRequested(PostIndexEvents.PostIndexRequested event) {
        indexPost(event.postId());
    }

    /** 事务提交后异步删除单个帖子文档。 */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPostIndexRemoved(PostIndexEvents.PostIndexRemoved event) {
        deletePost(event.postId());
    }

    /** 事务提交后异步批量删除某用户帖子文档。 */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onUserPostsRemoved(PostIndexEvents.UserPostsRemoved event) {
        deleteByUserId(event.userId());
    }

    /** 事务提交后异步重建某用户帖子文档。 */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onUserPostsRebuildRequested(PostIndexEvents.UserPostsRebuildRequested event) {
        rebuildByUserId(event.userId());
    }

    /** 事务提交后异步全量重建索引。 */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onAllRebuildRequested(PostIndexEvents.AllRebuildRequested event) {
        rebuildAll();
    }

    /**
     * ES 全文检索：multi_match（标题/标签/商品名/正文，字段加权）+ 封禁用户过滤。
     * 返回按相关性排序的帖子 id 与高亮片段。
     */
    public SearchHitResult search(String keyword, int limit) {
        // 标题/标签/商品名/正文高亮片段（<em> 标记，前端拆分渲染避免 HTML 注入）
        HighlightFieldParameters fieldParams = HighlightFieldParameters.builder()
                .withFragmentSize(HIGHLIGHT_FRAGMENT)
                .withNumberOfFragments(1)
                .build();
        Highlight highlight = new Highlight(
                HighlightParameters.builder().withPreTags("<em>").withPostTags("</em>").build(),
                List.of(new HighlightField("title", fieldParams), new HighlightField("content", fieldParams)));
        NativeQuery query = NativeQuery.builder()
                .withQuery(q -> q.bool(b -> b
                        .must(m -> m.multiMatch(mm -> mm
                                .query(keyword)
                                .fields("title^3", "tags^2", "productName^1.5", "content^1")
                                .minimumShouldMatch("60%")))
                        .filter(f -> f.term(t -> t.field("userStatus").value(0)))))
                .withHighlightQuery(new HighlightQuery(highlight, PostDoc.class))
                // 相关性同分时新帖优先（postId 为数字字段，@Id 的 keyword mapping 不支持数值排序）
                .withSort(Sort.by(Sort.Order.desc("_score"), Sort.Order.desc("postId")))
                .withMaxResults(limit)
                .build();
        SearchHits<PostDoc> hits = operations.search(query, PostDoc.class);

        List<Long> ids = new ArrayList<>();
        Map<Long, Map<String, String>> highlights = new HashMap<>();
        for (SearchHit<PostDoc> hit : hits) {
            Long postId = hit.getContent().getId();
            ids.add(postId);
            Map<String, List<String>> highlightFields = hit.getHighlightFields();
            if (highlightFields != null && !highlightFields.isEmpty()) {
                Map<String, String> perPost = new HashMap<>();
                for (Map.Entry<String, List<String>> entry : highlightFields.entrySet()) {
                    if (entry.getValue() != null && !entry.getValue().isEmpty()) {
                        perPost.put(entry.getKey(), entry.getValue().get(0));
                    }
                }
                if (!perPost.isEmpty()) {
                    highlights.put(postId, perPost);
                }
            }
        }
        return SearchHitResult.builder().ids(ids).highlights(highlights).build();
    }

    private PostDoc toDoc(PostIndexRow row) {
        List<String> tags = postAssembler.parseTagList(row.getTagsJson());
        return PostDoc.builder()
                .id(row.getId())
                .postId(row.getId())
                .title(row.getTitle())
                .content(row.getContent())
                .tags(tags.isEmpty() ? null : String.join(" ", tags))
                .productName(row.getProductName())
                .userId(row.getUserId())
                .userNickname(row.getUserNickname())
                .userStatus(row.getUserStatus())
                .likeCount(row.getLikeCount())
                .createdAt(row.getCreatedAt() != null
                        ? row.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        : null)
                .build();
    }
}
