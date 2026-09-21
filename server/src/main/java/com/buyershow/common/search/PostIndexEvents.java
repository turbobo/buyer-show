package com.buyershow.common.search;

/**
 * G5 搜索索引同步事件。
 *
 * <p>索引同步调用若直接发 @Async 任务，异步线程可能在事务提交前读库读不到未提交数据，
 * 导致文档漏写（发帖后文档不入索引）。因此统一改为：业务事务方法内发布事件，
 * PostSearchIndexService 在事务提交后（AFTER_COMMIT）异步消费再写索引。
 *
 * @author Qoder
 * @since 2026/09/21
 */
public final class PostIndexEvents {

    private PostIndexEvents() {
    }

    /** 索引/更新单个帖子。 */
    public record PostIndexRequested(Long postId) {
    }

    /** 删除单个帖子文档。 */
    public record PostIndexRemoved(Long postId) {
    }

    /** 批量删除某用户全部帖子文档（封禁用户时）。 */
    public record UserPostsRemoved(Long userId) {
    }

    /** 重建某用户公开帖子文档（解封用户时）。 */
    public record UserPostsRebuildRequested(Long userId) {
    }

    /** 全量重建索引（标签批量操作等影响 tags 字段时）。 */
    public record AllRebuildRequested() {
    }
}
