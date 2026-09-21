package com.buyershow.common.search;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

/**
 * 帖子搜索索引文档（G5 ES 搜索增强）。
 *
 * <p>标题/正文/标签/商品名使用自定义 ngram 分析器（1-2 字符词元）实现中文子串匹配；
 * 用户状态入索引用于查询期过滤封禁用户内容（与 MySQL 公开查询口径一致）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "posts")
public class PostDoc {

    @Id
    @Field(type = FieldType.Long)
    private Long id;

    /**
     * 帖子 id 的数字排序字段：@Id 字段在 ES mapping 中为 keyword（字典序），
     * 数值排序不可靠，因此另存一份数字字段作为相关性同分时的 tiebreaker。
     */
    @Field(type = FieldType.Long)
    private Long postId;

    @Field(type = FieldType.Text, analyzer = "ngram_search", searchAnalyzer = "ngram_search")
    private String title;

    @Field(type = FieldType.Text, analyzer = "ngram_search", searchAnalyzer = "ngram_search")
    private String content;

    /** 标签空格连接存储，便于统一走 ngram 文本检索。 */
    @Field(type = FieldType.Text, analyzer = "ngram_search", searchAnalyzer = "ngram_search")
    private String tags;

    @Field(type = FieldType.Text, analyzer = "ngram_search", searchAnalyzer = "ngram_search")
    private String productName;

    /** 作者用户 id（封禁用户批量删除索引用）。 */
    @Field(type = FieldType.Long)
    private Long userId;

    @Field(type = FieldType.Keyword)
    private String userNickname;

    /** 用户状态（0 正常 / 1 封禁 / 2 注销），查询期过滤。 */
    @Field(type = FieldType.Integer)
    private Integer userStatus;

    @Field(type = FieldType.Long)
    private Long likeCount;

    /**
     * 发布时间（ISO 字符串）。仅作索引元信息，不参与排序；
     * 用 Keyword 避免 LocalDateTime 与 ES date 字段往返转换的格式不一致问题。
     */
    @Field(type = FieldType.Keyword)
    private String createdAt;
}
