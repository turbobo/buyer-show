package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.search.SearchHitResult;
import com.buyershow.common.util.CursorUtils;
import com.buyershow.dto.request.CreatePostRequest;
import com.buyershow.dto.response.AdminPostRow;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.PostDTO;
import com.buyershow.dto.response.PostQueryRow;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import com.buyershow.mapper.FavoriteMapper;
import com.buyershow.mapper.LikeMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doAnswer;

/**
 * 用户公开帖子列表（游标分页）测试。
 *
 * @author Qoder
 * @since 2026/09/15
 */
class PostServiceTest {

    private final PostMapper postMapper = mock(PostMapper.class);
    private final UserMapper userMapper = mock(UserMapper.class);
    private final LikeMapper likeMapper = mock(LikeMapper.class);
    private final FavoriteMapper favoriteMapper = mock(FavoriteMapper.class);
    private final PostAssembler postAssembler = mock(PostAssembler.class);
    private final ContentModerationService contentModerationService = mock(ContentModerationService.class);
    private final UploadService uploadService = mock(UploadService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final FavoriteFolderService favoriteFolderService = mock(FavoriteFolderService.class);
    private final PostSearchIndexService postSearchIndexService = mock(PostSearchIndexService.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final PostService postService = new PostService(postMapper, userMapper, likeMapper,
            favoriteMapper, postAssembler, contentModerationService, uploadService, notificationService,
            favoriteFolderService, postSearchIndexService, eventPublisher);

    @Test
    void testListUserPostsReturnsCursorPage() {
        SecurityContextHolder.clearContext();
        when(userMapper.selectById(10L)).thenReturn(activeUser(10L));
        when(postMapper.selectUserFeedRows(eq(10L), isNull(), eq(3), isNull()))
                .thenReturn(List.of(row(100L), row(99L), row(98L)));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId()).build());

        CursorPage<PostDTO> page = postService.listUserPosts(10L, null, 2);

        assertEquals(2, page.getList().size());
        assertTrue(page.isHasMore());
        assertEquals(CursorUtils.encode(99L), page.getNextCursor());
    }

    @Test
    void testListUserPostsRejectsInactiveUser() {
        SecurityContextHolder.clearContext();
        User banned = activeUser(10L);
        banned.setStatus(1);
        when(userMapper.selectById(10L)).thenReturn(banned);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> postService.listUserPosts(10L, null, 20));

        assertEquals(ErrorCode.USER_NOT_FOUND.getCode(), exception.getCode());
        verify(postMapper, never()).selectUserFeedRows(any(), any(), anyInt(), any());
    }

    @Test
    void testListOwnPostsIncludesUnmoderated() {
        loginAs(10L);
        when(postMapper.selectOwnFeedRows(eq(10L), isNull(), eq(21), eq(10L)))
                .thenReturn(List.of(row(100L)));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId()).build());

        CursorPage<PostDTO> page = postService.listOwnPosts(null, 20);

        assertEquals(1, page.getList().size());
        assertFalse(page.isHasMore());
        verify(postMapper).selectOwnFeedRows(10L, null, 21, 10L);
    }

    @Test
    void testUpdatePostPublishesNewImagesAndResetsModeration() {
        loginAs(10L);
        when(postMapper.selectById(50L)).thenReturn(ownedPost());
        when(contentModerationService.evaluate(any(), any(), any(), any(), any(), any()))
                .thenReturn(new ModerationDecision(ModerationStatus.APPROVED, null));
        when(uploadService.publishPendingImages(eq(10L), anyList()))
                .thenReturn(List.of("http://cdn/published/a.jpg", "http://cdn/published/b.jpg"));
        when(postMapper.selectPostDetailRow(50L, 10L)).thenReturn(row(50L));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId())
                        .moderationStatus(ModerationStatus.APPROVED.getValue())
                        .build());

        PostDTO dto = postService.updatePost(50L,
                editRequest(List.of("http://cdn/published/a.jpg", "pending/10/b.jpg")));

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postMapper).updateById(captor.capture());
        assertEquals(List.of("http://cdn/published/a.jpg", "http://cdn/published/b.jpg"),
                captor.getValue().getImages());
        assertEquals(ModerationStatus.APPROVED.getValue(), captor.getValue().getModerationStatus());
        assertEquals("编辑后的标题", captor.getValue().getTitle());
        verify(postMapper).clearModerationAudit(50L);
        assertEquals(50L, dto.getId());
    }

    @Test
    void testCreatePostNormalizesUnratedToNull() {
        loginAs(10L);
        when(contentModerationService.evaluate(any(), any(), any(), any(), any(), any()))
                .thenReturn(new ModerationDecision(ModerationStatus.APPROVED, null));
        when(uploadService.publishImages(eq(10L), anyList()))
                .thenReturn(List.of("http://cdn/published/a.jpg"));
        when(postMapper.selectPostDetailRow(any(), eq(10L))).thenReturn(ownedRow(60L));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId())
                        .moderationStatus(ModerationStatus.APPROVED.getValue()).build());

        CreatePostRequest request = new CreatePostRequest();
        request.setTitle("未评分发布");
        request.setContent("未评分发布正文内容");
        request.setImages(List.of("pending/10/a.jpg"));
        request.setProductRating(0);

        postService.createPost(request);

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postMapper).insert(captor.capture());
        assertNull(captor.getValue().getProductRating());
        verify(userMapper).adjustPostCount(10L, 1);
    }

    @Test
    void testCreatePostMergesTopicsIntoTags() {
        loginAs(10L);
        when(contentModerationService.evaluate(any(), any(), any(), any(), any(), any()))
                .thenReturn(new ModerationDecision(ModerationStatus.APPROVED, null));
        when(uploadService.publishImages(eq(10L), anyList()))
                .thenReturn(List.of("http://cdn/published/a.jpg"));
        when(postMapper.selectPostDetailRow(any(), eq(10L))).thenReturn(ownedRow(60L));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId())
                        .moderationStatus(ModerationStatus.APPROVED.getValue()).build());

        CreatePostRequest request = new CreatePostRequest();
        request.setTitle("话题合并测试");
        request.setContent("今天打卡了 #咖啡店# 和 #美食探店# 太棒了");
        request.setImages(List.of("pending/10/a.jpg"));
        request.setTags(List.of("探店", "美食探店"));

        postService.createPost(request);

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postMapper).insert(captor.capture());
        assertEquals(List.of("探店", "美食探店", "咖啡店"), captor.getValue().getTags());
    }

    @Test
    void testCreatePostSendsMentionNotifications() {
        loginAs(10L);
        when(contentModerationService.evaluate(any(), any(), any(), any(), any(), any()))
                .thenReturn(new ModerationDecision(ModerationStatus.APPROVED, null));
        when(uploadService.publishImages(eq(10L), anyList()))
                .thenReturn(List.of("http://cdn/published/a.jpg"));
        when(postMapper.selectPostDetailRow(any(), eq(10L))).thenReturn(ownedRow(60L));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId())
                        .moderationStatus(ModerationStatus.APPROVED.getValue()).build());
        when(userMapper.selectActiveUsersByNicknames(List.of("李四")))
                .thenReturn(List.of(namedUser(20L, "李四")));
        doAnswer(invocation -> {
            ((Post) invocation.getArgument(0)).setId(60L);
            return 1;
        }).when(postMapper).insert(any(Post.class));

        CreatePostRequest request = new CreatePostRequest();
        request.setTitle("提及测试标题");
        request.setContent("推荐 @李四 也来看看这个好物分享");
        request.setImages(List.of("pending/10/a.jpg"));

        postService.createPost(request);

        verify(notificationService).notifyMention(20L, 10L, 60L, "提及测试标题");
    }

    @Test
    void testGetPostDetailResolvesMentions() {
        SecurityContextHolder.clearContext();
        PostQueryRow row = ownedRow(60L);
        when(postMapper.selectPostDetailRow(60L, null)).thenReturn(row);
        when(postAssembler.toPostDTO(any())).thenReturn(
                PostDTO.builder().id(60L).content("试试 @李四 的推荐")
                        .moderationStatus(ModerationStatus.APPROVED.getValue()).build());
        when(userMapper.selectActiveUsersByNicknames(List.of("李四")))
                .thenReturn(List.of(namedUser(20L, "李四")));

        PostDTO dto = postService.getPostDetail(60L);

        assertEquals(1, dto.getMentions().size());
        assertEquals("李四", dto.getMentions().get(0).getNickname());
        assertEquals(20L, dto.getMentions().get(0).getUserId());
    }

    @Test
    void testUpdatePostMergesTopicsAndNotifiesMentions() {
        loginAs(10L);
        when(postMapper.selectById(50L)).thenReturn(ownedPost());
        when(contentModerationService.evaluate(any(), any(), any(), any(), any(), any()))
                .thenReturn(new ModerationDecision(ModerationStatus.APPROVED, null));
        when(postMapper.selectPostDetailRow(50L, 10L)).thenReturn(row(50L));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId())
                        .moderationStatus(ModerationStatus.APPROVED.getValue()).build());
        when(userMapper.selectActiveUsersByNicknames(List.of("李四")))
                .thenReturn(List.of(namedUser(20L, "李四")));

        CreatePostRequest request = editRequest(List.of("http://cdn/published/a.jpg"));
        request.setContent("编辑正文 @李四 看看 #新话题# 吧");
        request.setTags(List.of("美食"));

        postService.updatePost(50L, request);

        ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
        verify(postMapper).updateById(captor.capture());
        assertEquals(List.of("美食", "新话题"), captor.getValue().getTags());
        verify(notificationService).notifyMention(20L, 10L, 50L, "编辑后的标题");
    }

    @Test
    void testUpdatePostRejectsOthersPost() {
        loginAs(20L);
        when(postMapper.selectById(50L)).thenReturn(ownedPost());

        BusinessException exception = assertThrows(BusinessException.class,
                () -> postService.updatePost(50L, editRequest(List.of("http://cdn/published/a.jpg"))));

        assertEquals(ErrorCode.POST_NO_EDIT.getCode(), exception.getCode());
        verify(postMapper, never()).updateById(any(Post.class));
    }

    @Test
    void testUpdatePostRejectedCleansPendingImages() {
        loginAs(10L);
        when(postMapper.selectById(50L)).thenReturn(ownedPost());
        when(contentModerationService.evaluate(any(), any(), any(), any(), any(), any()))
                .thenReturn(new ModerationDecision(ModerationStatus.REJECTED, "含违规信息"));

        BusinessException exception = assertThrows(BusinessException.class, () -> postService.updatePost(50L,
                editRequest(List.of("http://cdn/published/a.jpg", "pending/10/b.jpg"))));

        assertEquals(ErrorCode.CONTENT_REJECTED.getCode(), exception.getCode());
        verify(uploadService).deletePendingImages(10L, List.of("pending/10/b.jpg"));
        verify(postMapper, never()).updateById(any(Post.class));
    }

    @Test
    void testUpdatePostRejectsForeignImage() {
        loginAs(10L);
        when(postMapper.selectById(50L)).thenReturn(ownedPost());

        BusinessException exception = assertThrows(BusinessException.class,
                () -> postService.updatePost(50L, editRequest(List.of("http://cdn/published/other.jpg"))));

        assertEquals(ErrorCode.NO_PERMISSION.getCode(), exception.getCode());
        verify(postMapper, never()).updateById(any(Post.class));
    }

    @Test
    void testListUserFavoritesUsesRelationCursor() {
        SecurityContextHolder.clearContext();
        when(userMapper.selectById(10L)).thenReturn(activeUser(10L));
        when(postMapper.selectUserFavoriteRows(eq(10L), isNull(), eq(3), isNull(), isNull()))
                .thenReturn(List.of(cursorRow(100L, 501L), cursorRow(99L, 499L), cursorRow(98L, 497L)));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId()).build());

        CursorPage<PostDTO> page = postService.listUserFavorites(10L, null, 2, null);

        assertEquals(2, page.getList().size());
        assertTrue(page.isHasMore());
        assertEquals(CursorUtils.encode(499L), page.getNextCursor());
    }

    @Test
    void testListUserLikedPostsReturnsPage() {
        SecurityContextHolder.clearContext();
        when(userMapper.selectById(10L)).thenReturn(activeUser(10L));
        when(postMapper.selectUserLikeRows(eq(10L), isNull(), eq(21), isNull()))
                .thenReturn(List.of(row(100L)));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId()).build());

        CursorPage<PostDTO> page = postService.listUserLikedPosts(10L, null, 20);

        assertEquals(1, page.getList().size());
        assertFalse(page.isHasMore());
    }

    @Test
    void testGetFeedFollowingScopeRequiresLogin() {
        SecurityContextHolder.clearContext();

        BusinessException exception = assertThrows(BusinessException.class,
                () -> postService.getFeed(null, null, 20, "new", "following"));

        assertEquals(ErrorCode.TOKEN_INVALID.getCode(), exception.getCode());
        verify(postMapper, never()).selectFollowingFeedRows(any(), any(), any(), anyInt());
    }

    @Test
    void testGetFeedFollowingScopeReturnsFollowingPosts() {
        loginAs(10L);
        when(postMapper.selectFollowingFeedRows(eq(10L), isNull(), isNull(), eq(21)))
                .thenReturn(List.of(row(100L)));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId()).build());

        CursorPage<PostDTO> page = postService.getFeed(null, null, 20, "new", "following");

        assertEquals(1, page.getList().size());
        assertFalse(page.isHasMore());
        verify(postMapper).selectFollowingFeedRows(10L, null, null, 21);
    }

    @Test
    void testGetRelatedPostsPostNotFound() {
        SecurityContextHolder.clearContext();
        when(postMapper.selectPostDetailRow(99L, null)).thenReturn(null);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> postService.getRelatedPosts(99L, 6));

        assertEquals(ErrorCode.POST_NOT_FOUND.getCode(), exception.getCode());
    }

    @Test
    void testGetRelatedPostsWithTags() {
        SecurityContextHolder.clearContext();
        PostQueryRow current = row(50L);
        current.setTagsJson("[\"美食\"]");
        when(postMapper.selectPostDetailRow(50L, null)).thenReturn(current);
        when(postAssembler.parseTagList("[\"美食\"]")).thenReturn(List.of("美食"));
        when(postAssembler.toJsonArray(List.of("美食"))).thenReturn("[\"美食\"]");
        when(postMapper.selectRelatedRows(eq(50L), eq("[\"美食\"]"), eq(6), isNull()))
                .thenReturn(List.of(row(48L), row(47L), row(46L), row(45L), row(44L), row(43L)));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId()).build());

        List<PostDTO> related = postService.getRelatedPosts(50L, 6);

        assertEquals(6, related.size());
        verify(postMapper, never()).selectFeedRows(any(), any(), anyInt(), any());
    }

    @Test
    void testGetRelatedPostsNoTagsFallsBackToLatest() {
        SecurityContextHolder.clearContext();
        PostQueryRow current = row(50L);
        when(postMapper.selectPostDetailRow(50L, null)).thenReturn(current);
        when(postAssembler.parseTagList(null)).thenReturn(List.of());
        when(postMapper.selectFeedRows(isNull(), isNull(), eq(7), isNull()))
                .thenReturn(List.of(row(50L), row(48L), row(47L)));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId()).build());

        List<PostDTO> related = postService.getRelatedPosts(50L, 6);

        assertEquals(2, related.size());
        assertEquals(48L, related.get(0).getId());
        verify(postMapper, never()).selectRelatedRows(any(), any(), anyInt(), any());
    }

    private PostQueryRow cursorRow(Long id, Long cursorKey) {
        PostQueryRow row = row(id);
        row.setCursorKey(cursorKey);
        return row;
    }

    private void loginAs(Long userId) {
        User user = new User();
        user.setId(userId);
        user.setStatus(0);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }

    private Post ownedPost() {
        Post post = new Post();
        post.setId(50L);
        post.setUserId(10L);
        post.setStatus(0);
        post.setModerationStatus(0);
        post.setImages(List.of("http://cdn/published/a.jpg"));
        return post;
    }

    private CreatePostRequest editRequest(List<String> images) {
        CreatePostRequest request = new CreatePostRequest();
        request.setTitle("编辑后的标题");
        request.setContent("编辑后的正文内容");
        request.setImages(images);
        return request;
    }

    private User activeUser(Long id) {
        User user = new User();
        user.setId(id);
        user.setStatus(0);
        return user;
    }

    private User namedUser(Long id, String nickname) {
        User user = activeUser(id);
        user.setNickname(nickname);
        return user;
    }

    private PostQueryRow row(Long id) {
        PostQueryRow row = new PostQueryRow();
        row.setId(id);
        return row;
    }

    private AdminPostRow adminRow(Long id) {
        AdminPostRow row = new AdminPostRow();
        row.setId(id);
        return row;
    }

    private PostQueryRow ownedRow(Long id) {
        PostQueryRow row = row(id);
        row.setUserId(10L);
        return row;
    }

    // ─── G5 ES 搜索 ───

    @Test
    void testSearchPostsUsesEsOrderWithHighlights() {
        SecurityContextHolder.clearContext();
        when(postSearchIndexService.search("咖啡", 20)).thenReturn(SearchHitResult.builder()
                .ids(List.of(30L, 20L, 10L))
                .highlights(Map.of(30L, Map.of("title", "手冲<em>咖啡</em>教程")))
                .build());
        // 回查时 20L 已被删（二次过滤），结果保持 ES 打分顺序
        when(postMapper.selectPublicRowsByIds(eq(List.of(30L, 20L, 10L)), any()))
                .thenReturn(List.of(row(30L), row(10L)));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId()).build());

        List<PostDTO> result = postService.searchPosts("咖啡", 20);

        assertEquals(2, result.size());
        assertEquals(30L, result.get(0).getId());
        assertEquals(10L, result.get(1).getId());
        assertEquals("手冲<em>咖啡</em>教程", result.get(0).getHighlights().get("title"));
        assertNull(result.get(1).getHighlights());
        verify(postMapper, never()).searchPosts(any(), anyInt(), any());
    }

    @Test
    void testSearchPostsReturnsEmptyWhenEsNoHits() {
        SecurityContextHolder.clearContext();
        when(postSearchIndexService.search("不存在", 20)).thenReturn(SearchHitResult.builder()
                .ids(List.of())
                .highlights(Map.of())
                .build());

        List<PostDTO> result = postService.searchPosts("不存在", 20);

        assertTrue(result.isEmpty());
        verify(postMapper, never()).searchPosts(any(), anyInt(), any());
    }

    @Test
    void testSearchPostsFallsBackToMysqlWhenEsFails() {
        SecurityContextHolder.clearContext();
        when(postSearchIndexService.search("关键词", 20)).thenThrow(new RuntimeException("es down"));
        PostQueryRow matched = row(7L);
        matched.setTitle("今日好物分享：关键词盘点");
        when(postMapper.searchPosts(eq("关键词"), eq(20), any()))
                .thenReturn(List.of(matched));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId()).build());

        List<PostDTO> result = postService.searchPosts("关键词", 20);

        assertEquals(1, result.size());
        assertEquals(7L, result.get(0).getId());
        // 降级路径同样生成 <em> 高亮片段，保证前端体验一致
        assertEquals("今日好物分享：<em>关键词</em>盘点", result.get(0).getHighlights().get("title"));
    }

    // ─── G10 精选流 ───

    @Test
    void testSetFeaturedMarksApprovedPost() {
        SecurityContextHolder.clearContext();
        Post approved = ownedPost();
        approved.setModerationStatus(ModerationStatus.APPROVED.getValue());
        when(postMapper.selectById(50L)).thenReturn(approved);

        postService.setFeatured(50L, true);

        verify(postMapper).updateFeatured(50L, 1);
    }

    @Test
    void testSetFeaturedRejectsPendingModeration() {
        SecurityContextHolder.clearContext();
        Post pending = ownedPost();
        pending.setModerationStatus(ModerationStatus.PENDING.getValue());
        when(postMapper.selectById(50L)).thenReturn(pending);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> postService.setFeatured(50L, true));

        assertEquals(ErrorCode.POST_FEATURE_INVALID.getCode(), exception.getCode());
        verify(postMapper, never()).updateFeatured(any(), anyInt());
    }

    @Test
    void testUnfeatureSkipsModerationCheck() {
        SecurityContextHolder.clearContext();
        Post pending = ownedPost();
        pending.setModerationStatus(ModerationStatus.PENDING.getValue());
        when(postMapper.selectById(50L)).thenReturn(pending);

        postService.setFeatured(50L, false);

        verify(postMapper).updateFeatured(50L, 0);
    }

    @Test
    void testSetFeaturedRejectsMissingPost() {
        SecurityContextHolder.clearContext();
        when(postMapper.selectById(99L)).thenReturn(null);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> postService.setFeatured(99L, true));

        assertEquals(ErrorCode.POST_NOT_FOUND.getCode(), exception.getCode());
        verify(postMapper, never()).updateFeatured(any(), anyInt());
    }

    @Test
    void testListAdminPostsReturnsCursorPage() {
        SecurityContextHolder.clearContext();
        when(postMapper.selectAdminPostRows(isNull(), eq(4), isNull()))
                .thenReturn(List.of(adminRow(100L), adminRow(99L)));

        CursorPage<AdminPostRow> page = postService.listAdminPosts(null, 3, null);

        assertEquals(2, page.getList().size());
        assertFalse(page.isHasMore());
        assertNull(page.getNextCursor());
        verify(postMapper).selectAdminPostRows(isNull(), eq(4), isNull());
    }

    @Test
    void testListAdminPostsPassesFeaturedFilter() {
        SecurityContextHolder.clearContext();
        when(postMapper.selectAdminPostRows(isNull(), eq(21), eq(1)))
                .thenReturn(List.of(adminRow(7L)));

        CursorPage<AdminPostRow> page = postService.listAdminPosts(null, 20, 1);

        assertEquals(1, page.getList().size());
        verify(postMapper).selectAdminPostRows(isNull(), eq(21), eq(1));
    }

    @Test
    void testListAdminPostsHasMoreWhenRowsExceedLimit() {
        SecurityContextHolder.clearContext();
        List<AdminPostRow> rows = new java.util.ArrayList<>();
        for (long id = 100; id >= 80; id--) {
            rows.add(adminRow(id));
        }
        when(postMapper.selectAdminPostRows(isNull(), eq(21), isNull())).thenReturn(rows);

        CursorPage<AdminPostRow> page = postService.listAdminPosts(null, 20, null);

        assertEquals(20, page.getList().size());
        assertTrue(page.isHasMore());
        assertEquals(CursorUtils.encode(81L), page.getNextCursor());
    }
}
