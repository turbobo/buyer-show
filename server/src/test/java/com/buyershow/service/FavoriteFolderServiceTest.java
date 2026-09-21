package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.response.FavoriteFolderDTO;
import com.buyershow.entity.Favorite;
import com.buyershow.entity.FavoriteFolder;
import com.buyershow.entity.User;
import com.buyershow.mapper.FavoriteFolderMapper;
import com.buyershow.mapper.FavoriteMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 收藏夹服务（G7）测试：创建/重命名/删除/移动与权限校验。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class FavoriteFolderServiceTest {

    private final FavoriteFolderMapper favoriteFolderMapper = mock(FavoriteFolderMapper.class);
    private final FavoriteMapper favoriteMapper = mock(FavoriteMapper.class);
    private final FavoriteFolderService service = new FavoriteFolderService(favoriteFolderMapper, favoriteMapper);

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testCreateFolderTrimsNameAndReturnsDto() {
        authenticate(1L);
        when(favoriteFolderMapper.insert(any(FavoriteFolder.class))).thenAnswer(invocation -> {
            FavoriteFolder folder = invocation.getArgument(0);
            folder.setId(7L);
            return 1;
        });

        FavoriteFolderDTO dto = service.createFolder("  好物清单  ");

        assertEquals(7L, dto.getId());
        assertEquals("好物清单", dto.getName());
        assertEquals(0L, dto.getPostCount());
    }

    @Test
    void testCreateFolderRejectsBlankName() {
        authenticate(1L);

        BusinessException exception = assertThrows(BusinessException.class, () -> service.createFolder("   "));

        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
        verify(favoriteFolderMapper, never()).insert(any(FavoriteFolder.class));
    }

    @Test
    void testCreateFolderRejectsDuplicateName() {
        authenticate(1L);
        when(favoriteFolderMapper.insert(any(FavoriteFolder.class)))
                .thenThrow(new DuplicateKeyException("uk_user_name"));

        BusinessException exception = assertThrows(BusinessException.class, () -> service.createFolder("重复"));

        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
    }

    @Test
    void testRenameFolderRequiresOwnership() {
        authenticate(1L);
        when(favoriteFolderMapper.selectById(9L)).thenReturn(null);

        BusinessException exception = assertThrows(BusinessException.class, () -> service.renameFolder(9L, "新名字"));

        assertEquals(ErrorCode.NO_PERMISSION.getCode(), exception.getCode());
        verify(favoriteFolderMapper, never()).updateById(any(FavoriteFolder.class));
    }

    @Test
    void testRenameFolderUpdatesName() {
        authenticate(1L);
        when(favoriteFolderMapper.selectById(5L)).thenReturn(folder(5L, 1L, "旧名字"));

        service.renameFolder(5L, " 新名字 ");

        verify(favoriteFolderMapper).updateById(any(FavoriteFolder.class));
    }

    @Test
    void testDeleteFolderMovesFavoritesBackToDefault() {
        authenticate(1L);
        when(favoriteFolderMapper.selectById(5L)).thenReturn(folder(5L, 1L, "待删除"));

        service.deleteFolder(5L);

        verify(favoriteMapper).clearFolder(eq(1L), eq(5L));
        verify(favoriteFolderMapper).deleteById(5L);
    }

    @Test
    void testMoveFavoriteToFolder() {
        authenticate(1L);
        when(favoriteMapper.selectOne(any())).thenReturn(favorite(1L, 30L, null));
        when(favoriteFolderMapper.selectById(8L)).thenReturn(folder(8L, 1L, "目标夹"));

        service.moveFavorite(30L, 8L);

        verify(favoriteMapper).updateFolder(eq(1L), eq(30L), eq(8L));
    }

    @Test
    void testMoveFavoriteRejectsMissingFavorite() {
        authenticate(1L);
        when(favoriteMapper.selectOne(any())).thenReturn(null);

        BusinessException exception = assertThrows(BusinessException.class, () -> service.moveFavorite(30L, null));

        assertEquals(ErrorCode.POST_NOT_FOUND.getCode(), exception.getCode());
        verify(favoriteMapper, never()).updateFolder(any(), any(), any());
    }

    @Test
    void testMoveFavoriteRejectsForeignFolder() {
        authenticate(1L);
        when(favoriteMapper.selectOne(any())).thenReturn(favorite(1L, 30L, null));
        when(favoriteFolderMapper.selectById(8L)).thenReturn(folder(8L, 2L, "别人的夹"));

        BusinessException exception = assertThrows(BusinessException.class, () -> service.moveFavorite(30L, 8L));

        assertEquals(ErrorCode.NO_PERMISSION.getCode(), exception.getCode());
        verify(favoriteMapper, never()).updateFolder(any(), any(), any());
    }

    @Test
    void testListFoldersReturnsWithCount() {
        authenticate(1L);
        FavoriteFolderDTO dto = new FavoriteFolderDTO();
        dto.setId(2L);
        dto.setName("清单");
        dto.setPostCount(3L);
        when(favoriteFolderMapper.selectFoldersWithCount(1L)).thenReturn(List.of(dto));

        List<FavoriteFolderDTO> result = service.listFolders();

        assertEquals(1, result.size());
        assertEquals(3L, result.get(0).getPostCount());
        assertTrue(service.listFolders().get(0).getName().equals("清单"));
    }

    private FavoriteFolder folder(Long id, Long userId, String name) {
        FavoriteFolder folder = new FavoriteFolder();
        folder.setId(id);
        folder.setUserId(userId);
        folder.setName(name);
        return folder;
    }

    private Favorite favorite(Long userId, Long postId, Long folderId) {
        Favorite favorite = new Favorite();
        favorite.setUserId(userId);
        favorite.setPostId(postId);
        favorite.setFolderId(folderId);
        return favorite;
    }

    private void authenticate(Long userId) {
        User user = new User();
        user.setId(userId);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null));
    }
}
