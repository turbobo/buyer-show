package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.PostStatus;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.common.util.CursorUtils;
import com.buyershow.dto.request.CreatePostRequest;
import com.buyershow.dto.response.CursorPage;
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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;
    private static final int RELATED_POSTS_DEFAULT = 6;
    private static final int RELATED_POSTS_MAX = 12;

    private final PostMapper postMapper;
    private final UserMapper userMapper;
    private final LikeMapper likeMapper;
    private final FavoriteMapper favoriteMapper;
    private final PostAssembler postAssembler;
    private final ContentModerationService contentModerationService;
    private final UploadService uploadService;
    private final NotificationService notificationService;

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

        List<PostQueryRow> rows;
        if (isFollowingScope) {
            // 关注流（G1）：必须登录，按发帖时间倒序（不支持热门排序）
            Long viewerId = requireCurrentUserId();
            rows = postMapper.selectFollowingFeedRows(viewerId, cursorId, normalizedTag, limit + 1);
        } else if (isHotSort && cursorId == null) {
            // Hot sort only works for first page (no cursor support for score-based sorting)
            rows = postMapper.selectHotFeedRows(normalizedTag, limit + 1, currentUserId);
        } else {
            rows = postMapper.selectFeedRows(cursorId, normalizedTag, limit + 1, currentUserId);
        }

        return toCursorPage(rows, limit);
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
     * @return 帖子游标页
     */
    public CursorPage<PostDTO> listUserFavorites(Long userId, String cursor, int requestedLimit) {
        requireActiveUser(userId);
        int limit = normalizePageSize(requestedLimit);
        Long cursorId = CursorUtils.decode(cursor);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<PostQueryRow> rows = postMapper.selectUserFavoriteRows(userId, cursorId, limit + 1, currentUserId);

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
        String tagsText = request.getTags() == null ? null : String.join(" ", request.getTags());
        ModerationDecision decision = contentModerationService.evaluate(
                request.getTitle(), request.getContent(), request.getProductName(),
                request.getProductSource(), tagsText);

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

        PostDTO result = createPostInTransaction(userId, request, decision, publishedImages);
        return getPostDetail(result.getId());
    }

    @Transactional
    protected PostDTO createPostInTransaction(Long userId, CreatePostRequest request,
                                               ModerationDecision decision, List<String> publishedImages) {
        Post post = new Post();
        post.setUserId(userId);
        post.setTitle(request.getTitle().trim());
        post.setContent(request.getContent().trim());
        post.setImages(publishedImages);
        post.setTags(request.getTags() == null ? Collections.emptyList() : request.getTags());
        post.setProductName(request.getProductName());
        post.setProductPrice(request.getProductPrice());
        post.setProductSource(request.getProductSource());
        post.setProductRating(normalizeRating(request.getProductRating()));
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

        String tagsText = request.getTags() == null ? null : String.join(" ", request.getTags());
        ModerationDecision decision = contentModerationService.evaluate(
                request.getTitle(), request.getContent(), request.getProductName(),
                request.getProductSource(), tagsText);
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
        post.setTags(request.getTags() == null ? Collections.emptyList() : request.getTags());
        post.setProductName(request.getProductName());
        post.setProductPrice(request.getProductPrice());
        post.setProductSource(request.getProductSource());
        post.setProductRating(normalizeRating(request.getProductRating()));
        post.setModerationStatus(decision.getStatus().getValue());
        post.setModerationReason(decision.getReason());
        postMapper.updateById(post);
        // updateById 忽略 null 字段，人工审核审计信息需显式清空
        postMapper.clearModerationAudit(postId);

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

    @Transactional
    public boolean toggleFavorite(Long postId) {
        Long userId = requireCurrentUserId();
        requireActivePost(postId);

        int deleted = favoriteMapper.deleteRelation(userId, postId);
        if (deleted > 0) {
            postMapper.adjustFavoriteCount(postId, -1);
            return false;
        }

        int inserted = favoriteMapper.insertIgnore(userId, postId);
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

    public List<PostDTO> searchPosts(String keyword, int limit) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        List<PostQueryRow> rows = postMapper.searchPosts(keyword, limit, currentUserId);
        return rows.stream()
                .map(postAssembler::toPostDTO)
                .toList();
    }

    public boolean isDuplicateContent(Long userId, String title, String content) {
        return postMapper.countRecentDuplicates(userId, title, content) > 0;
    }
}
