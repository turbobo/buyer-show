package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.common.util.CursorUtils;
import com.buyershow.dto.request.CreatePostRequest;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.PostDTO;
import com.buyershow.dto.response.PostQueryRow;
import com.buyershow.entity.Post;
import com.buyershow.mapper.FavoriteMapper;
import com.buyershow.mapper.LikeMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final PostMapper postMapper;
    private final UserMapper userMapper;
    private final LikeMapper likeMapper;
    private final FavoriteMapper favoriteMapper;
    private final PostAssembler postAssembler;
    private final ContentModerationService contentModerationService;
    private final UploadService uploadService;

    /**
     * 稳定游标分页：自增 id 与发帖顺序一致，避免深分页与 MySQL filesort。
     * 点赞/收藏状态通过 JOIN 一次返回，消除每页 2N 次查询。
     */
    public CursorPage<PostDTO> getFeed(String cursor, String tag, int requestedLimit) {
        int limit = normalizePageSize(requestedLimit);
        Long cursorId = CursorUtils.decode(cursor);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        String normalizedTag = tag == null || tag.isBlank() ? null : tag.trim();

        List<PostQueryRow> rows = postMapper.selectFeedRows(
                cursorId,
                normalizedTag,
                limit + 1,
                currentUserId);

        boolean hasMore = rows.size() > limit;
        List<PostQueryRow> visibleRows = hasMore ? rows.subList(0, limit) : rows;
        List<PostDTO> posts = visibleRows.stream()
                .map(postAssembler::toPostDTO)
                .toList();

        String nextCursor = null;
        if (hasMore && !visibleRows.isEmpty()) {
            PostQueryRow lastRow = visibleRows.get(visibleRows.size() - 1);
            nextCursor = CursorUtils.encode(lastRow.getId());
        }

        return CursorPage.<PostDTO>builder()
                .list(posts)
                .nextCursor(nextCursor)
                .hasMore(hasMore)
                .build();
    }

    /**
     * 帖子、作者、当前用户点赞/收藏状态一次 JOIN 返回。
     */
    public PostDTO getPostDetail(Long postId) {
        PostQueryRow row = postMapper.selectPostDetailRow(postId, SecurityUtils.getCurrentUserId());
        if (row == null) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
        PostDTO dto = postAssembler.toPostDTO(row);
        if (dto.getModerationStatus() != ModerationStatus.APPROVED) {
            dto.setImages(Collections.emptyList());
        }
        return dto;
    }

    @Transactional
    public PostDTO createPost(CreatePostRequest request) {
        Long userId = requireCurrentUserId();

        Post post = new Post();
        post.setUserId(userId);
        post.setTitle(request.getTitle().trim());
        post.setContent(request.getContent().trim());
        post.setImages(request.getImages());
        post.setTags(request.getTags() == null ? Collections.emptyList() : request.getTags());
        post.setProductName(request.getProductName());
        post.setProductPrice(request.getProductPrice());
        post.setProductSource(request.getProductSource());
        post.setProductRating(request.getProductRating());
        uploadService.validatePendingImages(userId, request.getImages());
        String tagsText = request.getTags() == null ? null : String.join(" ", request.getTags());
        ModerationDecision decision = contentModerationService.evaluate(
                request.getTitle(), request.getContent(), request.getProductName(),
                request.getProductSource(), tagsText);
        if (decision.getStatus() == ModerationStatus.REJECTED) {
            uploadService.deletePendingImages(userId, request.getImages());
            throw new BusinessException(ErrorCode.CONTENT_REJECTED, decision.getReason());
        }
        if (decision.getStatus() == ModerationStatus.APPROVED) {
            post.setImages(uploadService.publishImages(userId, request.getImages()));
        }

        post.setLikeCount(0);
        post.setCommentCount(0);
        post.setFavoriteCount(0);
        post.setStatus(0);
        post.setModerationStatus(decision.getStatus());
        post.setModerationReason(decision.getReason());
        postMapper.insert(post);

        userMapper.adjustPostCount(userId, 1);
        return getPostDetail(post.getId());
    }

    @Transactional
    public void deletePost(Long postId) {
        Long currentUserId = requireCurrentUserId();
        Post post = postMapper.selectById(postId);
        if (post == null || post.getStatus() == 2) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }

        int affected = SecurityUtils.isAdmin()
                ? postMapper.softDeleteAsAdmin(postId)
                : postMapper.softDeleteOwned(postId, currentUserId);
        if (affected == 0) {
            throw new BusinessException(ErrorCode.POST_NO_DELETE);
        }

        // 管理员删除他人帖子时，扣减原作者而不是管理员自己的计数。
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
        if (post == null || post.getStatus() != 0
                || post.getModerationStatus() != ModerationStatus.APPROVED) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }
    }
}
