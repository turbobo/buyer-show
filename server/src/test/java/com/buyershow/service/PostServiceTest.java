package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.exception.BusinessException;
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
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
    private final PostService postService = new PostService(postMapper, userMapper, likeMapper,
            favoriteMapper, postAssembler, contentModerationService, uploadService, notificationService);

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
        when(contentModerationService.evaluate(any(), any(), any(), any(), any()))
                .thenReturn(new ModerationDecision(ModerationStatus.APPROVED, null));
        when(uploadService.publishImages(eq(10L), anyList()))
                .thenReturn(List.of("http://cdn/published/b.jpg"));
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
        when(contentModerationService.evaluate(any(), any(), any(), any(), any()))
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
        when(postMapper.selectUserFavoriteRows(eq(10L), isNull(), eq(3), isNull()))
                .thenReturn(List.of(cursorRow(100L, 501L), cursorRow(99L, 499L), cursorRow(98L, 497L)));
        when(postAssembler.toPostDTO(any())).thenAnswer(invocation ->
                PostDTO.builder().id(((PostQueryRow) invocation.getArgument(0)).getId()).build());

        CursorPage<PostDTO> page = postService.listUserFavorites(10L, null, 2);

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

    private PostQueryRow row(Long id) {
        PostQueryRow row = new PostQueryRow();
        row.setId(id);
        return row;
    }
}
