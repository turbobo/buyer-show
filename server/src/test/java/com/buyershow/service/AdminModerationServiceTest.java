package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.request.HandleReportRequest;
import com.buyershow.dto.request.ModerateContentRequest;
import com.buyershow.entity.Comment;
import com.buyershow.entity.ContentReport;
import com.buyershow.entity.Post;
import com.buyershow.entity.User;
import com.buyershow.mapper.CommentMapper;
import com.buyershow.mapper.ContentReportMapper;
import com.buyershow.mapper.PostMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminModerationServiceTest {

    private final PostMapper postMapper = mock(PostMapper.class);
    private final CommentMapper commentMapper = mock(CommentMapper.class);
    private final ContentReportMapper contentReportMapper = mock(ContentReportMapper.class);
    private final UploadService uploadService = mock(UploadService.class);
    private final AdminModerationService service = new AdminModerationService(
            postMapper, commentMapper, contentReportMapper, uploadService);

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testHandleReportRejectsNonAdmin() {
        authenticate(0);
        HandleReportRequest request = new HandleReportRequest();
        request.setAction("ACCEPT");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.handleReport(1L, request));

        assertEquals(ErrorCode.NO_PERMISSION.getCode(), exception.getCode());
    }

    @Test
    void testModeratePostApprovesPendingContentOnce() {
        authenticate(1);
        Post post = new Post();
        post.setId(1L);
        post.setUserId(10L);
        post.setStatus(0);
        post.setModerationStatus(ModerationStatus.PENDING);
        post.setImages(List.of("pending/10/product.png"));
        when(postMapper.selectById(1L)).thenReturn(post);
        when(postMapper.moderatePending(eq(1L), eq(ModerationStatus.APPROVED), isNull(), eq(100L), any(LocalDateTime.class)))
                .thenReturn(1);
        when(uploadService.publishImages(10L, post.getImages()))
                .thenReturn(List.of("http://cdn/published/product.png"));

        ModerateContentRequest request = new ModerateContentRequest();
        request.setAction("APPROVE");
        service.moderatePost(1L, request);

        verify(postMapper).moderatePending(eq(1L), eq(ModerationStatus.APPROVED), isNull(), eq(100L), any(LocalDateTime.class));
        verify(uploadService).publishImages(10L, List.of("pending/10/product.png"));
        verify(postMapper).updateById(argThat((Post update) -> update.getId().equals(1L)
                && update.getImages().equals(List.of("http://cdn/published/product.png"))));
    }

    @Test
    void testModeratePostRejectsAlreadyHandledContent() {
        authenticate(1);
        Post post = new Post();
        post.setId(1L);
        post.setUserId(10L);
        post.setStatus(0);
        post.setImages(List.of());
        when(postMapper.selectById(1L)).thenReturn(post);
        when(postMapper.moderatePending(anyLong(), anyInt(), any(), anyLong(), any())).thenReturn(0);

        ModerateContentRequest request = new ModerateContentRequest();
        request.setAction("APPROVE");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.moderatePost(1L, request));
        assertEquals(ErrorCode.CONTENT_NOT_PENDING.getCode(), exception.getCode());
    }

    @Test
    void testHandleReportAcceptsApprovedReplyOnce() {
        authenticate(1);
        ContentReport report = new ContentReport();
        report.setId(1L);
        report.setContentType(ContentReportService.TYPE_COMMENT);
        report.setContentId(2L);
        report.setStatus(ContentReportService.STATUS_PENDING);
        when(contentReportMapper.selectById(1L)).thenReturn(report);
        when(contentReportMapper.handlePending(eq(1L), eq(1), eq(100L), any(LocalDateTime.class))).thenReturn(1);

        Comment comment = new Comment();
        comment.setId(2L);
        comment.setPostId(3L);
        comment.setParentId(4L);
        comment.setStatus(0);
        comment.setModerationStatus(ModerationStatus.APPROVED);
        when(commentMapper.selectById(2L)).thenReturn(comment);
        when(commentMapper.rejectApprovedThread(eq(2L), anyString(), eq(100L), any(LocalDateTime.class)))
                .thenReturn(1);

        HandleReportRequest request = new HandleReportRequest();
        request.setAction("ACCEPT");
        service.handleReport(1L, request);

        verify(contentReportMapper).handlePending(eq(1L), eq(1), eq(100L), any(LocalDateTime.class));
        verify(commentMapper).adjustPostCommentCount(3L, -1);
        verify(commentMapper).adjustReplyCount(4L, -1);
    }

    private void authenticate(int role) {
        User user = new User();
        user.setId(100L);
        user.setRole(role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
    }
}
