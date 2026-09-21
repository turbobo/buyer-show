package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.PostStatus;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.common.search.PostIndexEvents;
import com.buyershow.common.search.SearchHitResult;
import com.buyershow.common.util.CursorUtils;
import com.buyershow.common.util.MentionExtractor;
import com.buyershow.common.util.ProductLinkValidator;
import com.buyershow.dto.request.CreatePostRequest;
import com.buyershow.dto.response.AdminPostRow;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.MentionDTO;
import com.buyershow.dto.response.PostDTO;
import com.buyershow.dto.response.PostQueryRow;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import com.buyershow.mapper.FavoriteMapper;
import com.buyershow.mapper.LikeMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import com.buyershow.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;
    private static final int RELATED_POSTS_DEFAULT = 6;
    private static final int RELATED_POSTS_MAX = 12;
    /** 降级高亮片段两侧保留字符数（G5）。 */
    private static final int FALLBACK_HIGHLIGHT_MARGIN = 40;
    /** G13：推荐偏好标签画像 TopN（发帖/收藏/点赞行为聚合）。 */
    private static final int RECOMMEND_TAG_LIMIT = 5;

    private final PostMapper postMapper;
    private final UserMapper userMapper;
    private final LikeMapper likeMapper;
    private final FavoriteMapper favoriteMapper;
    private final PostAssembler postAssembler;
    private final ContentModerationService contentModerationService;
    private final UploadService uploadService;
    private final NotificationService notificationService;
    private final FavoriteFolderService favoriteFolderService;
    private final PostSearchIndexService postSearchIndexService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Feed 首屏缓存（P1.2 业务缓存）：仅匿名用户 + 无游标（第一页）+ 全站 scope 命中，
     * 登录用户 Feed 含 isLiked/isFavorited 用户维度，关注流需登录且内容因人而异，均不缓存；
     * 写操作（发帖/删帖/审核/封禁/标签）主动 allEntries 失效，另设 60s TTL 兜底。
     */
    @Cacheable(cacheNames = "feed:anonymous",
            key = "T(com.buyershow.common.util.CursorUtils).feedCacheKey(#tag, #sort, #requestedLimit)",
            condition = "T(com.buyershow.common.security.SecurityUtils).getCurrentUserId() == null"
                    + " && (#cursor == null || #cursor.isEmpty())"
                    + " && (#scope == null || #scope.isEmpty() || #scope.equals('all'))")
    public CursorPage<PostDTO> getFeed(String cursor, String tag, int requestedLimit, String sort, String scope) {
        int limit = normalizePageSize(requestedLimit);
        Long cursorId = CursorUtils.decode(cursor);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        String normalizedTag = tag == null || tag.isBlank() ? null : tag.trim();
        boolean isHotSort = "hot".equalsIgnoreCase(sort);
        boolean isFollowingScope = "following".equalsIgnoreCase(scope);
        boolean isFeaturedSort = "featured".equalsIgnoreCase(sort);
        boolean isRecommendSort = "recommend".equalsIgnoreCase(sort);

        List<PostQueryRow> rows;
        if (isFollowingScope) {
            // 关注流（G1）：必须登录，按发帖时间倒序（不支持热门排序）
            Long viewerId = requireCurrentUserId();
            rows = postMapper.selectFollowingFeedRows(viewerId, cursorId, normalizedTag, limit + 1);
        } else if (isRecommendSort && cursorId == null) {
            // 推荐流（G13）：需登录，偏好标签加权重排，仅第一页（分数排序无游标，同热门）
            rows = selectRecommendFeedRows(normalizedTag, limit);
        } else if (isHotSort && cursorId == null) {
            // Hot sort only works for first page (no cursor support for score-based sorting)
            rows = postMapper.selectHotFeedRows(normalizedTag, limit + 1, currentUserId);
        } else if (isFeaturedSort) {
            // 精选流（G10）：运营打标的优质内容，按发帖时间倒序游标分页
            rows = postMapper.selectFeaturedRows(cursorId, normalizedTag, limit + 1, currentUserId);
        } else {
            rows = postMapper.selectFeedRows(cursorId, normalizedTag, limit + 1, currentUserId);
        }

        return toCursorPage(rows, limit);
    }

    /**
     * G13：推荐流查询——聚合偏好标签画像后按「偏好命中 +50 分加成 + 热度分」重排；
     * 冷启动（无行为画像）回退热门流。
     *
     * @param normalizedTag 可选标签过滤（null 表示全部）
     * @param limit 返回条数
     */
    private List<PostQueryRow> selectRecommendFeedRows(String normalizedTag, int limit) {
        Long viewerId = requireCurrentUserId();
        List<String> preferredTags = postMapper.selectPreferredTags(viewerId, RECOMMEND_TAG_LIMIT);
        if (preferredTags.isEmpty()) {
            return postMapper.selectHotFeedRows(normalizedTag, limit + 1, viewerId);
        }
        return postMapper.selectRecommendFeedRows(
                postAssembler.toJsonArray(preferredTags), normalizedTag, limit + 1, viewerId);
    }

    /**
     * 查询指定用户的公开帖子（游标分页）。
     *
     * @param userId 目标用户ID
     * @param cursor 游标（上一页最后一条帖子ID的编码）
     * @param requestedLimit 每页数量
     * @return 帖子游标页
     */
    public CursorPage<PostDTO> listUserPosts(Long userId, String cursor, int requestedLimit) {
        requireActiveUser(userId);

        int limit = normalizePageSize(requestedLimit);
        Long cursorId = CursorUtils.decode(cursor);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<PostQueryRow> rows = postMapper.selectUserFeedRows(userId, cursorId, limit + 1, currentUserId);

        return toCursorPage(rows, limit);
    }

    /**
     * 查询当前用户自己的全部帖子（含待审/未通过，仅本人可见，游标分页）。
     *
     * @param cursor 游标
     * @param requestedLimit 每页数量
     * @return 帖子游标页
     */
    public CursorPage<PostDTO> listOwnPosts(String cursor, int requestedLimit) {
        Long currentUserId = requireCurrentUserId();
        int limit = normalizePageSize(requestedLimit);
        Long cursorId = CursorUtils.decode(cursor);
        List<PostQueryRow> rows = postMapper.selectOwnFeedRows(currentUserId, cursorId, limit + 1, currentUserId);

        return toCursorPage(rows, limit);
    }

    /**
     * 查询指定用户收藏的公开帖子（按收藏时间倒序，游标分页）。
     *
     * @param userId 目标用户ID
     * @param cursor 游标（上一页最后一条收藏关系的ID编码）
     * @param requestedLimit 每页数量
     * @param folderId 收藏夹筛选（G7）：null 表示全部收藏夹；仅限本人主页按夹浏览时传入
     * @return 帖子游标页
     */
    public CursorPage<PostDTO> listUserFavorites(Long userId, String cursor, int requestedLimit, Long folderId) {
        requireActiveUser(userId);
        int limit = normalizePageSize(requestedLimit);
        Long cursorId = CursorUtils.decode(cursor);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<PostQueryRow> rows = postMapper.selectUserFavoriteRows(userId, cursorId, limit + 1, currentUserId, folderId);

        return toCursorPage(rows, limit);
    }

    /**
     * 查询指定用户点赞过的公开帖子（按点赞时间倒序，游标分页）。
     *
     * @param userId 目标用户ID
     * @param cursor 游标（上一页最后一条点赞关系的ID编码）
     * @param requestedLimit 每页数量
     * @return 帖子游标页
     */
    public CursorPage<PostDTO> listUserLikedPosts(Long userId, String cursor, int requestedLimit) {
        requireActiveUser(userId);
        int limit = normalizePageSize(requestedLimit);
        Long cursorId = CursorUtils.decode(cursor);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<PostQueryRow> rows = postMapper.selectUserLikeRows(userId, cursorId, limit + 1, currentUserId);

        return toCursorPage(rows, limit);
    }

    private void requireActiveUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || user.getStatus() != UserStatus.ACTIVE.getValue()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
    }

    private CursorPage<PostDTO> toCursorPage(List<PostQueryRow> rows, int limit) {
        boolean hasMore = rows.size() > limit;
        List<PostQueryRow> visibleRows = hasMore ? rows.subList(0, limit) : rows;
        List<PostDTO> posts = visibleRows.stream()
                .map(postAssembler::toPostDTO)
                .toList();

        String nextCursor = null;
        if (hasMore && !visibleRows.isEmpty()) {
            PostQueryRow lastRow = visibleRows.get(visibleRows.size() - 1);
            Long cursorValue = lastRow.getCursorKey() != null ? lastRow.getCursorKey() : lastRow.getId();
            nextCursor = CursorUtils.encode(cursorValue);
        }

        return CursorPage.<PostDTO>builder()
                .list(posts)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .build();
    }

    /**
     * 帖子详情查询。
     * 注意：PostDTO 包含用户维度的 isLiked/isFavorited，不适合跨用户缓存。
     * 缓存失效由写操作（create/delete/toggleLike/toggleFavorite）保证。
     */
    public PostDTO getPostDetail(Long postId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        PostQueryRow row = postMapper.selectPostDetailRow(postId, currentUserId);
        if (row == null) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        PostDTO dto = postAssembler.toPostDTO(row);
        if (dto.getModerationStatus() != ModerationStatus.APPROVED.getValue()
                && !row.getUserId().equals(currentUserId)) {
            dto.setImages(Collections.emptyList());
        }
        // G4：解析正文 @提及（昵称→用户映射，供前端高亮跳转）
        dto.setMentions(resolveMentions(dto.getContent()));
        return dto;
    }

    /**
     * 相关推荐（G3）：同标签最新帖召回（v1 规则召回）；无标签或同标签帖不足时用最新公开帖补足，避免区块过空。
     *
     * @param postId 当前帖子 ID
     * @param requestedLimit 推荐条数（默认 6，上限 12）
     * @return 推荐帖子列表（不含当前帖，按发帖时间倒序）
     */
    public List<PostDTO> getRelatedPosts(Long postId, int requestedLimit) {
        int limit = requestedLimit <= 0 ? RELATED_POSTS_DEFAULT : Math.min(requestedLimit, RELATED_POSTS_MAX);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        PostQueryRow current = postMapper.selectPostDetailRow(postId, currentUserId);
        if (current == null) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }

        List<String> tags = postAssembler.parseTagList(current.getTagsJson());
        List<PostQueryRow> rows = tags.isEmpty()
                ? new ArrayList<>()
                : postMapper.selectRelatedRows(postId, postAssembler.toJsonArray(tags), limit, currentUserId);
        if (rows.size() < limit) {
            rows = new ArrayList<>(rows);
            rows.addAll(fillWithLatest(currentUserId, postId, rows, limit));
        }
        return rows.stream().map(postAssembler::toPostDTO).toList();
    }

    private List<PostQueryRow> fillWithLatest(Long currentUserId, Long excludePostId, List<PostQueryRow> existing, int targetSize) {
        List<PostQueryRow> latest = postMapper.selectFeedRows(null, null, targetSize + 1, currentUserId);
        List<PostQueryRow> fill = new ArrayList<>();
        for (PostQueryRow row : latest) {
            if (fill.size() >= targetSize - existing.size()) {
                break;
            }
            boolean isDuplicate = row.getId().equals(excludePostId)
                    || existing.stream().anyMatch(existingRow -> existingRow.getId().equals(row.getId()));
            if (!isDuplicate) {
                fill.add(row);
            }
        }
        return fill;
    }

    /**
     * 解析正文 @提及（G4）：昵称批量查活跃用户，返回昵称→用户映射；不存在的昵称静默忽略。
     */
    private List<MentionDTO> resolveMentions(String content) {
        List<String> nicknames = MentionExtractor.extractMentions(content);
        if (nicknames.isEmpty()) {
            return Collections.emptyList();
        }
        List<User> users = userMapper.selectActiveUsersByNicknames(nicknames);
        return users.stream()
                .map(user -> MentionDTO.builder().nickname(user.getNickname()).userId(user.getId()).build())
                .toList();
    }

    /**
     * 发送 @提及通知（G4）：逐个异步通知被提及用户；@自己与不存在昵称由调用链过滤/忽略。
     */
    private void notifyMentions(Long actorId, Long postId, String content, String title) {
        List<String> nicknames = MentionExtractor.extractMentions(content);
        if (nicknames.isEmpty()) {
            return;
        }
        List<User> mentioned = userMapper.selectActiveUsersByNicknames(nicknames);
        for (User user : mentioned) {
            notificationService.notifyMention(user.getId(), actorId, postId, title);
        }
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = "user:profile", key = "#root.target.getCurrentUserIdSafe()"),
            @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    })
    public PostDTO createPost(CreatePostRequest request) {
        Long userId = requireCurrentUserId();

        // 内容去重：检查最近 24 小时内是否发布过相同标题+内容的帖子
        int duplicateCount = postMapper.countRecentDuplicates(
                userId, request.getTitle().trim(), request.getContent().trim());
        if (duplicateCount > 0) {
            throw new BusinessException(ErrorCode.CONTENT_DUPLICATED, "检测到重复内容，请勿频繁发布相同内容");
        }

        uploadService.validatePendingImages(userId, request.getImages());
        // G12：购买链接白名单域名校验（防钓鱼）
        validateProductLink(request.getProductLink());
        // G4：正文 #话题# 自动并入标签（手选在前，去重，上限 8）
        List<String> mergedTags = MentionExtractor.mergeTags(request.getTags(),
                MentionExtractor.extractTopics(request.getContent()));
        String tagsText = mergedTags.isEmpty() ? null : String.join(" ", mergedTags);
        ModerationDecision decision = contentModerationService.evaluate(
                request.getTitle(), request.getContent(), request.getProductName(),
                request.getProductSource(), request.getProductLink(), tagsText);

        List<String> publishedImages;
        if (decision.getStatus() == ModerationStatus.REJECTED) {
            uploadService.deletePendingImages(userId, request.getImages());
            throw new BusinessException(ErrorCode.CONTENT_REJECTED, decision.getReason());
        }
        if (decision.getStatus() == ModerationStatus.APPROVED) {
            publishedImages = uploadService.publishImages(userId, request.getImages());
        } else {
            publishedImages = request.getImages();
        }

        PostDTO result = createPostInTransaction(userId, request, decision, publishedImages, mergedTags);
        // G4：正文 @提及 通知（异步，失败仅告警）
        notifyMentions(userId, result.getId(), request.getContent(), request.getTitle());
        // G5：同步搜索索引（事务提交后异步；仅公开且审核通过才入索引，失败仅告警）
        eventPublisher.publishEvent(new PostIndexEvents.PostIndexRequested(result.getId()));
        return getPostDetail(result.getId());
    }

    @Transactional
    protected PostDTO createPostInTransaction(Long userId, CreatePostRequest request,
                                               ModerationDecision decision, List<String> publishedImages,
                                               List<String> mergedTags) {
        Post post = new Post();
        post.setUserId(userId);
        post.setTitle(request.getTitle().trim());
        post.setContent(request.getContent().trim());
        post.setImages(publishedImages);
        post.setTags(mergedTags);
        post.setProductName(request.getProductName());
        post.setProductPrice(request.getProductPrice());
        post.setProductSource(request.getProductSource());
        post.setProductRating(normalizeRating(request.getProductRating()));
        post.setProductLink(trimToNull(request.getProductLink()));
        post.setLikeCount(0);
        post.setCommentCount(0);
        post.setFavoriteCount(0);
        post.setStatus(PostStatus.PUBLIC.getValue());
        post.setModerationStatus(decision.getStatus().getValue());
        post.setModerationReason(decision.getReason());
        postMapper.insert(post);
        userMapper.adjustPostCount(userId, 1);

        return PostDTO.builder()
                .id(post.getId())
                .moderationStatus(post.getModerationStatus())
                .build();
    }

    /**
     * 评分归一化：前端「未评分」传 0 或 null，落库统一 null（DB 约束 chk_post_rating 仅允许 1-5 或 NULL）。
     *
     * @param rating 前端评分（0=未评分）
     * @return 归一化后的评分
     */
    private Integer normalizeRating(Integer rating) {
        return rating != null && rating >= 1 && rating <= 5 ? rating : null;
    }

    /**
     * G12：购买链接校验——仅允许淘宝/天猫/京东/拼多多域名（含子域）的 http/https 链接。
     *
     * @param productLink 前端提交的购买链接（可选）
     */
    private void validateProductLink(String productLink) {
        if (!ProductLinkValidator.isValid(productLink)) {
            throw new BusinessException(ErrorCode.PRODUCT_LINK_INVALID);
        }
    }

    /** 空白转 null（可选字段统一落库口径）。 */
    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /**
     * 编辑帖子：仅作者本人可编辑，保存后重新过审。
     * 图片支持混合提交：原帖已有图片（完整 URL，需与帖内图片一致）与新上传图片（pending objectName）。
     *
     * @param postId 帖子ID
     * @param request 编辑请求（字段与发布一致）
     * @return 更新后的帖子详情
     */
    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    public PostDTO updatePost(Long postId, CreatePostRequest request) {
        Long userId = requireCurrentUserId();
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() != PostStatus.PUBLIC.getValue()) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        if (!post.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.POST_NO_EDIT);
        }
        if (post.getModerationStatus() != null
                && post.getModerationStatus() == ModerationStatus.REJECTED.getValue()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "帖子已下架，无法修改，可在个人主页发起申诉");
        }

        List<String> requestImages = request.getImages();
        List<String> pendingImages = new ArrayList<>();
        for (String image : requestImages) {
            if (image != null && image.startsWith("pending/" + userId + "/")) {
                pendingImages.add(image);
            } else if (image == null || post.getImages() == null || !post.getImages().contains(image)) {
                throw new BusinessException(ErrorCode.NO_PERMISSION, "图片不属于当前帖子");
            }
        }
        uploadService.validatePendingImages(userId, pendingImages);

        // G12：购买链接白名单域名校验（防钓鱼）
        validateProductLink(request.getProductLink());

        // G4：正文 #话题# 自动并入标签（手选在前，去重，上限 8）
        List<String> mergedTags = MentionExtractor.mergeTags(request.getTags(),
                MentionExtractor.extractTopics(request.getContent()));
        String tagsText = mergedTags.isEmpty() ? null : String.join(" ", mergedTags);
        ModerationDecision decision = contentModerationService.evaluate(
                request.getTitle(), request.getContent(), request.getProductName(),
                request.getProductSource(), request.getProductLink(), tagsText);
        if (decision.getStatus() == ModerationStatus.REJECTED) {
            uploadService.deletePendingImages(userId, pendingImages);
            throw new BusinessException(ErrorCode.CONTENT_REJECTED, decision.getReason());
        }

        List<String> finalImages = requestImages;
        if (decision.getStatus() == ModerationStatus.APPROVED) {
            finalImages = uploadService.publishPendingImages(userId, requestImages);
        }

        post.setTitle(request.getTitle().trim());
        post.setContent(request.getContent().trim());
        post.setImages(finalImages);
        post.setTags(mergedTags);
        post.setProductName(request.getProductName());
        post.setProductPrice(request.getProductPrice());
        post.setProductSource(request.getProductSource());
        post.setProductRating(normalizeRating(request.getProductRating()));
        post.setProductLink(trimToNull(request.getProductLink()));
        post.setModerationStatus(decision.getStatus().getValue());
        post.setModerationReason(decision.getReason());
        postMapper.updateById(post);
        // updateById 忽略 null 字段，人工审核审计信息需显式清空
        postMapper.clearModerationAudit(postId);

        // G4：正文 @提及 通知（异步，失败仅告警）
        notifyMentions(userId, postId, request.getContent(), request.getTitle());
        // G5：同步搜索索引（事务提交后异步；重新过审后待审帖不入索引，审核通过时由管理端同步）
        eventPublisher.publishEvent(new PostIndexEvents.PostIndexRequested(postId));

        return getPostDetail(postId);
    }

    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    public void deletePost(Long postId) {
        Long currentUserId = requireCurrentUserId();
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() == PostStatus.DELETED.getValue()) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }

        int affected = SecurityUtils.isAdmin()
                ? postMapper.softDeleteAsAdmin(postId)
                : postMapper.softDeleteOwned(postId, currentUserId);
        if (affected == 0) {
            throw new BusinessException(ErrorCode.POST_NO_DELETE);
        }

        userMapper.adjustPostCount(post.getUserId(), -1);
        // G5：删除搜索索引文档（事务提交后异步，失败仅告警）
        eventPublisher.publishEvent(new PostIndexEvents.PostIndexRemoved(postId));
    }

    @Transactional
    public boolean toggleLike(Long postId) {
        Long userId = requireCurrentUserId();
        requireActivePost(postId);

        int deleted = likeMapper.deleteRelation(userId, postId);
        if (deleted > 0) {
            postMapper.adjustLikeCount(postId, -1);
            return false;
        }

        int inserted = likeMapper.insertIgnore(userId, postId);
        if (inserted > 0) {
            postMapper.adjustLikeCount(postId, 1);
            // 发送点赞通知
            Post post = postMapper.selectById(postId);
            if (post != null) {
                notificationService.notifyLike(post.getUserId(), userId, postId, post.getTitle());
            }
        }
        return true;
    }

    /**
     * 切换收藏（G7）：已收藏则取消；未收藏时收藏到指定收藏夹（folderId 为空表示默认夹）。
     *
     * @param postId 帖子ID
     * @param folderId 目标收藏夹ID（仅新增收藏时生效；null = 默认收藏夹）
     * @return true 表示已收藏，false 表示已取消
     */
    @Transactional
    public boolean toggleFavorite(Long postId, Long folderId) {
        Long userId = requireCurrentUserId();
        requireActivePost(postId);
        if (folderId != null) {
            favoriteFolderService.requireOwnFolder(userId, folderId);
        }

        int deleted = favoriteMapper.deleteRelation(userId, postId);
        if (deleted > 0) {
            postMapper.adjustFavoriteCount(postId, -1);
            return false;
        }

        int inserted = favoriteMapper.insertIgnore(userId, postId, folderId);
        if (inserted > 0) {
            postMapper.adjustFavoriteCount(postId, 1);
        }
        return true;
    }


    /**
     * 供 @CacheEvict SpEL 调用，安全获取当前用户 ID。
     */
    public Long getCurrentUserIdSafe() {
        return SecurityUtils.getCurrentUserId();
    }

    /**
     * 精选打标（G10）：仅审核通过的未删除帖子可设为精选；取消精选无审核限制。
     */
    public void setFeatured(Long postId, boolean featured) {
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() != PostStatus.PUBLIC.getValue()) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        if (featured && post.getModerationStatus() != ModerationStatus.APPROVED.getValue()) {
            throw new BusinessException(ErrorCode.POST_FEATURE_INVALID);
        }
        postMapper.updateFeatured(postId, featured ? 1 : 0);
    }

    /** 管理端精选列表（G10）：全部未删除帖子，可选按精选状态过滤。 */
    public CursorPage<AdminPostRow> listAdminPosts(String cursor, int requestedLimit, Integer featuredFilter) {
        int limit = normalizePageSize(requestedLimit);
        Long cursorId = CursorUtils.decode(cursor);
        List<AdminPostRow> rows = postMapper.selectAdminPostRows(cursorId, limit + 1, featuredFilter);

        boolean hasMore = rows.size() > limit;
        if (hasMore) {
            rows = rows.subList(0, limit);
        }
        String nextCursor = hasMore ? CursorUtils.encode(rows.get(rows.size() - 1).getId()) : null;
        return new CursorPage<>(rows, nextCursor, hasMore);
    }

    private int normalizePageSize(int requestedLimit) {
        if (requestedLimit <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }

    private Long requireCurrentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return userId;
    }

    private void requireActivePost(Long postId) {
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() != PostStatus.PUBLIC.getValue()
                || post.getModerationStatus() != ModerationStatus.APPROVED.getValue()) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
    }

    /**
     * 搜索帖子（G5）：ES 优先（相关性排序 + 高亮片段），ES 不可用自动降级 MySQL LIKE。
     * 命中后按 ES 打分顺序回查公开帖（二次过滤，保证与 Feed 口径一致且附带 isLiked/isFavorited）。
     *
     * @param keyword 关键词
     * @param limit 返回条数（0 或负数取默认 20，上限 50）
     * @return 帖子列表（ES 命中时附 highlights 高亮片段）
     */
    public List<PostDTO> searchPosts(String keyword, int limit) {
        int normalizedLimit = normalizePageSize(limit);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<PostDTO> esResult = tryEsSearch(keyword, normalizedLimit, currentUserId);
        if (esResult != null) {
            return esResult;
        }
        List<PostQueryRow> rows = postMapper.searchPosts(keyword, normalizedLimit, currentUserId);
        return rows.stream()
                .map(row -> {
                    PostDTO dto = postAssembler.toPostDTO(row);
                    // 降级路径也生成 <em> 高亮片段，保证前端渲染体验一致
                    dto.setHighlights(buildFallbackHighlights(keyword, row));
                    return dto;
                })
                .toList();
    }

    /** ES 搜索尝试：异常或不可用时返回 null，由调用方降级 MySQL LIKE。 */
    private List<PostDTO> tryEsSearch(String keyword, int limit, Long currentUserId) {
        try {
            SearchHitResult hit = postSearchIndexService.search(keyword, limit);
            if (hit.getIds().isEmpty()) {
                return Collections.emptyList();
            }
            List<PostQueryRow> rows = postMapper.selectPublicRowsByIds(hit.getIds(), currentUserId);
            Map<Long, PostQueryRow> rowById = rows.stream()
                    .collect(Collectors.toMap(PostQueryRow::getId, Function.identity()));
            List<PostDTO> result = new ArrayList<>();
            for (Long postId : hit.getIds()) {
                PostQueryRow row = rowById.get(postId);
                if (row == null) {
                    continue;
                }
                PostDTO dto = postAssembler.toPostDTO(row);
                dto.setHighlights(hit.getHighlights().get(postId));
                result.add(dto);
            }
            return result;
        } catch (Exception e) {
            log.warn("Elasticsearch search failed, fallback to MySQL LIKE. keyword: {}", keyword, e);
            return null;
        }
    }

    /** MySQL 降级路径的高亮片段：命中标题/正文时截取关键词附近内容并加 <em> 标记。 */
    private Map<String, String> buildFallbackHighlights(String keyword, PostQueryRow row) {
        Map<String, String> highlights = new HashMap<>();
        if (row.getTitle() != null && row.getTitle().contains(keyword)) {
            highlights.put("title", highlightPlain(row.getTitle(), keyword));
        }
        if (row.getContent() != null && row.getContent().contains(keyword)) {
            highlights.put("content", highlightPlain(row.getContent(), keyword));
        }
        return highlights;
    }

    /** 关键词首次出现位置前后各取 FALLBACK_HIGHLIGHT_MARGIN 字符，两侧截断补省略号。 */
    private String highlightPlain(String text, String keyword) {
        int index = text.indexOf(keyword);
        int start = Math.max(0, index - FALLBACK_HIGHLIGHT_MARGIN);
        int end = Math.min(text.length(), index + keyword.length() + FALLBACK_HIGHLIGHT_MARGIN);
        StringBuilder fragment = new StringBuilder();
        if (start > 0) {
            fragment.append("…");
        }
        fragment.append(text, start, index)
                .append("<em>").append(keyword).append("</em>")
                .append(text, index + keyword.length(), end);
        if (end < text.length()) {
            fragment.append("…");
        }
        return fragment.toString();
    }

    public boolean isDuplicateContent(Long userId, String title, String content) {
        return postMapper.countRecentDuplicates(userId, title, content) > 0;
    }
}
