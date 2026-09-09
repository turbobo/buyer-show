package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.request.CreateCommentRequest;
import com.buyershow.dto.response.CommentDTO;
import com.buyershow.entity.Comment;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import com.buyershow.mapper.CommentMapper;
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
    private final PostMapper postMapper = mock(PostMapper.class);
    private final UserMapper userMapper = mock(UserMapper.class);
    private final ContentModerationService moderationService = mock(ContentModerationService.class);
    private final CommentService service = new CommentService(
            commentMapper, postMapper, userMapper, moderationService);

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
        parent.setModerationStatus(ModerationStatus.PENDING);
        when(commentMapper.selectById(20L)).thenReturn(parent);

        CreateCommentRequest request = new CreateCommentRequest();
        request.setParentId(20L);
        request.setContent("这是一条有效回复");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.createComment(10L, request));
        assertEquals(ErrorCode.COMMENT_NOT_FOUND.getCode(), exception.getCode());
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

        assertEquals(ModerationStatus.PENDING, result.getModerationStatus());
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
        root.setModerationStatus(ModerationStatus.APPROVED);
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
        when(commentMapper.selectVisibleRoots(10L, 100)).thenReturn(List.of(root));
        when(commentMapper.selectVisibleReplies(List.of(20L))).thenReturn(List.of(reply));

        List<CommentDTO> result = service.listComments(10L, 500);

        assertEquals(1, result.size());
        assertEquals(1, result.getFirst().getReplies().size());
        verify(commentMapper).selectVisibleRoots(10L, 100);
    }

    private Post approvedPost(Long id) {
        Post post = new Post();
        post.setId(id);
        post.setStatus(0);
        post.setModerationStatus(ModerationStatus.APPROVED);
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
