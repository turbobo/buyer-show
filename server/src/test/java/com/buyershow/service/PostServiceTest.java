package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.util.CursorUtils;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.PostDTO;
import com.buyershow.dto.response.PostQueryRow;
import com.buyershow.entity.User;
import com.buyershow.mapper.FavoriteMapper;
import com.buyershow.mapper.LikeMapper;
import com.buyershow.mapper.PostMapper;
import com.buyershow.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
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
