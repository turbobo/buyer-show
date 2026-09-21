package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.util.CursorUtils;
import com.buyershow.dto.request.CreateCommentRequest;
import com.buyershow.dto.request.UpdateCommentRequest;
import com.buyershow.dto.response.CommentDTO;
import com.buyershow.dto.response.CommentFavoriteResult;
import com.buyershow.dto.response.CommentLikeResult;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.UserCommentRow;
import com.buyershow.entity.Comment;
import com.buyershow.entity.CommentLike;
import com.buyershow.entity.FavoriteComment;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import com.buyershow.mapper.CommentLikeMapper;
import com.buyershow.mapper.CommentMapper;
import com.buyershow.mapper.FavoriteCommentMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CommentServiceTest {

    private final CommentMapper commentMapper = mock(CommentMapper.class);
    private final CommentLikeMapper commentLikeMapper = mock(CommentLikeMapper.class);
    private final FavoriteCommentMapper favoriteCommentMapper = mock(FavoriteCommentMapper.class);
    private final PostMapper postMapper = mock(PostMapper.class);
    private final UserMapper userMapper = mock(UserMapper.class);
    private final ContentModerationService moderationService = mock(ContentModerationService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final CommentService service = new CommentService(
            commentMapper, commentLikeMapper, favoriteCommentMapper, postMapper, userMapper,
            moderationService, notificationService);

    @Test
    void togglesCommentFavorite() {
        authenticate(1L);
        Comment comment = new Comment();
        comment.setId(20L);
        comment.setStatus(0);
        comment.setModerationStatus(ModerationStatus.APPROVED.getValue());
        when(commentMapper.selectById(20L)).thenReturn(comment);
        when(favoriteCommentMapper.selectOne(any())).thenReturn(null);

        CommentFavoriteResult result = service.toggleCommentFavorite(20L);

        assertTrue(result.isFavorited());
        verify(favoriteCommentMapper).insert(any(FavoriteComment.class));
    }

    @Test
    void rejectsCommentEditAfterWindow() {
        authenticate(1L);
        Comment comment = new Comment();
        comment.setId(20L);
        comment.setUserId(1L);
        comment.setStatus(0);
        comment.setCreatedAt(java.time.LocalDateTime.now().minusMinutes(10));
        when(commentMapper.selectById(20L)).thenReturn(comment);

        UpdateCommentRequest request = new UpdateCommentRequest();
        request.setContent("修改后的内容");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.updateComment(20L, request));
        assertEquals(ErrorCode.COMMENT_EDIT_EXPIRED.getCode(), exception.getCode());
    }

    @Test
    void togglesCommentLikeAndAdjustsCount() {
        authenticate(1L);
        Comment comment = new Comment();
        comment.setId(20L);
        comment.setStatus(0);
        comment.setModerationStatus(ModerationStatus.APPROVED.getValue());
        Comment after = new Comment();
        after.setLikeCount(3);
        when(commentMapper.selectById(20L)).thenReturn(comment, after);
        when(commentLikeMapper.selectOne(any())).thenReturn(null);

        CommentLikeResult result = service.toggleCommentLike(20L);

        assertTrue(result.isLiked());
        assertEquals(3, result.getLikeCount());
        verify(commentLikeMapper).insert(any(CommentLike.class));
        verify(commentMapper).adjustCommentLikeCount(20L, 1);
    }

    @Test
    void listsMyCommentsWithCursor() {
        authenticate(1L);
        UserCommentRow first = new UserCommentRow();
        first.setId(30L);
        UserCommentRow second = new UserCommentRow();
        second.setId(20L);
        UserCommentRow extra = new UserCommentRow();
        extra.setId(10L);
        when(commentMapper.selectUserComments(eq(1L), isNull(), eq(3))).thenReturn(List.of(first, second, extra));

        CursorPage<UserCommentRow> page = service.listMyComments(null, 2);

        assertEquals(2, page.getList().size());
        assertTrue(page.isHasMore());
        assertEquals(CursorUtils.encode(20L), page.getNextCursor());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsReplyToPendingParent() {
        authenticate(1L);
        when(postMapper.selectById(10L)).thenReturn(approvedPost(10L));
        Comment parent = new Comment();
        parent.setId(20L);
        parent.setPostId(10L);
        parent.setStatus(0);
        parent.setModerationStatus(ModerationStatus.PENDING.getValue());
        when(commentMapper.selectById(20L)).thenReturn(parent);

        CreateCommentRequest request = new CreateCommentRequest();
        request.setParentId(20L);
        request.setContent("这是一条有效回复");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.createComment(10L, request));
        assertEquals(ErrorCode.COMMENT_NOT_FOUND.getCode(), exception.getCode());
    }

    @Test
    void replyToReplyWithinThreadDerivesRootAndNotifies() {
        authenticate(1L);
        Post post = approvedPost(10L);
        post.setUserId(3L);
        when(postMapper.selectById(10L)).thenReturn(post);
        when(moderationService.evaluate(any())).thenReturn(
                new ModerationDecision(ModerationStatus.APPROVED, null));
        Comment target = new Comment();
        target.setId(21L);
        target.setUserId(2L);
        target.setPostId(10L);
        target.setParentId(20L);
        target.setStatus(0);
        target.setModerationStatus(ModerationStatus.APPROVED.getValue());
        Comment root = new Comment();
        root.setId(20L);
        root.setUserId(3L);
        root.setPostId(10L);
        root.setStatus(0);
        root.setModerationStatus(ModerationStatus.APPROVED.getValue());
        when(commentMapper.selectById(21L)).thenReturn(target);
        when(commentMapper.selectById(20L)).thenReturn(root);
        when(commentMapper.insert(any(Comment.class))).thenAnswer(invocation -> {
            Comment saved = invocation.getArgument(0);
            saved.setId(22L);
            return 1;
        });
        User user = new User();
        user.setId(1L);
        user.setNickname("回复者");
        when(userMapper.selectById(1L)).thenReturn(user);

        CreateCommentRequest request = new CreateCommentRequest();
        request.setContent("回复的回复");
        request.setReplyToId(21L);

        CommentDTO result = service.createComment(10L, request);

        assertEquals(20L, result.getParentId());
        assertEquals(21L, result.getReplyToId());
        verify(commentMapper).adjustReplyCount(20L, 1);
        verify(notificationService).notifyComment(3L, 1L, 10L, "回复的回复");
        verify(notificationService).notifyReply(2L, 1L, 10L, "回复的回复");
    }

    @Test
    void replyToPostOwnerSkipsReplyNotification() {
        authenticate(1L);
        Post post = approvedPost(10L);
        post.setUserId(2L);
        when(postMapper.selectById(10L)).thenReturn(post);
        when(moderationService.evaluate(any())).thenReturn(
                new ModerationDecision(ModerationStatus.APPROVED, null));
        Comment target = new Comment();
        target.setId(20L);
        target.setUserId(2L);
        target.setPostId(10L);
        target.setStatus(0);
        target.setModerationStatus(ModerationStatus.APPROVED.getValue());
        when(commentMapper.selectById(20L)).thenReturn(target);
        when(commentMapper.insert(any(Comment.class))).thenAnswer(invocation -> {
            Comment saved = invocation.getArgument(0);
            saved.setId(22L);
            return 1;
        });
        User user = new User();
        user.setId(1L);
        user.setNickname("回复者");
        when(userMapper.selectById(1L)).thenReturn(user);

        CreateCommentRequest request = new CreateCommentRequest();
        request.setContent("回复楼主");
        request.setReplyToId(20L);

        service.createComment(10L, request);

        verify(notificationService).notifyComment(2L, 1L, 10L, "回复楼主");
        verify(notificationService, never()).notifyReply(anyLong(), anyLong(), anyLong(), anyString());
    }

    @Test
    void replyToReplyCrossThreadRejected() {
        authenticate(1L);
        when(postMapper.selectById(10L)).thenReturn(approvedPost(10L));
        Comment target = new Comment();
        target.setId(21L);
        target.setPostId(10L);
        target.setParentId(20L);
        target.setStatus(0);
        target.setModerationStatus(ModerationStatus.APPROVED.getValue());
        when(commentMapper.selectById(21L)).thenReturn(target);

        CreateCommentRequest request = new CreateCommentRequest();
        request.setContent("越楼回复");
        request.setParentId(99L);
        request.setReplyToId(21L);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.createComment(10L, request));
        assertEquals(ErrorCode.COMMENT_NOT_FOUND.getCode(), exception.getCode());
    }

    @Test
    void replyToDeletedTargetRejected() {
        authenticate(1L);
        when(postMapper.selectById(10L)).thenReturn(approvedPost(10L));
        Comment target = new Comment();
        target.setId(21L);
        target.setPostId(10L);
        target.setStatus(1);
        when(commentMapper.selectById(21L)).thenReturn(target);

        CreateCommentRequest request = new CreateCommentRequest();
        request.setContent("回复已删除评论");
        request.setReplyToId(21L);

        assertThrows(BusinessException.class, () -> service.createComment(10L, request));
    }

    @Test
    void pendingCommentResponseContainsModerationAndAuthor() {
        authenticate(1L);
        when(postMapper.selectById(10L)).thenReturn(approvedPost(10L));
        when(moderationService.evaluate(any())).thenReturn(
                new ModerationDecision(ModerationStatus.PENDING, "待人工审核"));
        User user = new User();
        user.setId(1L);
        user.setNickname("测试用户");
        when(userMapper.selectById(1L)).thenReturn(user);

        CreateCommentRequest request = new CreateCommentRequest();
        request.setContent("这是一条需要审核的评论");
        CommentDTO result = service.createComment(10L, request);

        assertEquals(ModerationStatus.PENDING.getValue(), result.getModerationStatus());
        assertEquals("测试用户", result.getUserNickname());
        verify(commentMapper, never()).adjustPostCommentCount(anyLong(), anyInt());
    }

    @Test
    void deletingRootCommentSoftDeletesThreadAndAdjustsApprovedCountOnce() {
        authenticate(1L);
        Comment root = new Comment();
        root.setId(20L);
        root.setUserId(1L);
        root.setPostId(10L);
        root.setStatus(0);
        root.setModerationStatus(ModerationStatus.APPROVED.getValue());
        when(commentMapper.selectById(20L)).thenReturn(root);
        when(commentMapper.countApprovedThread(20L)).thenReturn(3);
        when(commentMapper.softDeleteThread(20L)).thenReturn(3);

        service.deleteComment(20L);

        verify(commentMapper).adjustPostCommentCount(10L, -3);
    }

    @Test
    void listCommentsUsesBoundedRootQueryAndSeparateReplies() {
        when(postMapper.selectById(10L)).thenReturn(approvedPost(10L));
        CommentDTO root = CommentDTO.builder().id(20L).parentId(null).replies(List.of()).build();
        CommentDTO reply = CommentDTO.builder().id(21L).parentId(20L).replies(List.of()).build();
        when(commentMapper.selectVisibleRoots(10L, null, null, 100)).thenReturn(List.of(root));
        when(commentMapper.selectVisibleReplies(List.of(20L), null)).thenReturn(List.of(reply));

        List<CommentDTO> result = service.listComments(10L, 500);

        assertEquals(1, result.size());
        assertEquals(1, result.getFirst().getReplies().size());
        verify(commentMapper).selectVisibleRoots(10L, null, null, 100);
    }

    private Post approvedPost(Long id) {
        Post post = new Post();
        post.setId(id);
        post.setStatus(0);
        post.setModerationStatus(ModerationStatus.APPROVED.getValue());
        return post;
    }

    private void authenticate(Long userId) {
        User user = new User();
        user.setId(userId);
        user.setRole(0);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
    }
}
