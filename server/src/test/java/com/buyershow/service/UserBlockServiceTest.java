package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.response.BlockedUserDTO;
import com.buyershow.entity.User;
import com.buyershow.entity.UserBlock;
import com.buyershow.mapper.FollowMapper;
import com.buyershow.mapper.UserBlockMapper;
import com.buyershow.mapper.UserMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 拉黑服务测试（G6）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class UserBlockServiceTest {

    private final UserBlockMapper userBlockMapper = mock(UserBlockMapper.class);
    private final FollowMapper followMapper = mock(FollowMapper.class);
    private final UserMapper userMapper = mock(UserMapper.class);
    private final UserBlockService service = new UserBlockService(userBlockMapper, followMapper, userMapper);

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testBlockCreatesRecordAndRemovesMutualFollows() {
        authenticate(1L);
        when(userMapper.selectById(2L)).thenReturn(activeUser(2L));
        when(userBlockMapper.selectCount(any())).thenReturn(0L);
        when(userBlockMapper.insert(any(UserBlock.class))).thenReturn(1);
        when(followMapper.delete(any())).thenReturn(1);

        assertTrue(service.block(2L));

        verify(userBlockMapper).insert(any(UserBlock.class));
        // 双向取关：1→2 与 2→1 各一次，计数同步
        verify(followMapper, org.mockito.Mockito.times(2)).delete(any());
        verify(userMapper).adjustFollowerCount(eq(2L), eq(-1));
        verify(userMapper).adjustFollowingCount(eq(1L), eq(-1));
        verify(userMapper).adjustFollowerCount(eq(1L), eq(-1));
        verify(userMapper).adjustFollowingCount(eq(2L), eq(-1));
    }

    @Test
    void testBlockIsIdempotent() {
        authenticate(1L);
        when(userMapper.selectById(2L)).thenReturn(activeUser(2L));
        when(userBlockMapper.selectCount(any())).thenReturn(1L);

        assertTrue(service.block(2L));

        verify(userBlockMapper, never()).insert(any(UserBlock.class));
        verify(followMapper, never()).delete(any());
    }

    @Test
    void testBlockRejectsSelf() {
        authenticate(1L);

        BusinessException exception = assertThrows(BusinessException.class, () -> service.block(1L));

        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
        verify(userBlockMapper, never()).insert(any(UserBlock.class));
    }

    @Test
    void testBlockRejectsMissingUser() {
        authenticate(1L);
        when(userMapper.selectById(2L)).thenReturn(null);

        BusinessException exception = assertThrows(BusinessException.class, () -> service.block(2L));

        assertEquals(ErrorCode.USER_NOT_FOUND.getCode(), exception.getCode());
    }

    @Test
    void testUnblockRemovesRecord() {
        authenticate(1L);
        when(userBlockMapper.delete(any())).thenReturn(1);

        assertFalse(service.unblock(2L));

        verify(userBlockMapper).delete(any());
        verify(followMapper, never()).insert(any(com.buyershow.entity.Follow.class));
    }

    @Test
    void testListBlockedUsers() {
        authenticate(1L);
        BlockedUserDTO dto = new BlockedUserDTO();
        dto.setId(2L);
        dto.setNickname("被拉黑人");
        when(userBlockMapper.selectBlockedUsers(1L)).thenReturn(List.of(dto));

        List<BlockedUserDTO> result = service.listBlockedUsers();

        assertEquals(1, result.size());
        assertEquals("被拉黑人", result.get(0).getNickname());
    }

    private User activeUser(Long id) {
        User user = new User();
        user.setId(id);
        user.setStatus(0);
        return user;
    }

    private void authenticate(Long userId) {
        User user = new User();
        user.setId(userId);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
    }
}
