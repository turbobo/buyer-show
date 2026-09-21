package com.buyershow.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.response.FavoriteFolderDTO;
import com.buyershow.entity.Favorite;
import com.buyershow.entity.FavoriteFolder;
import com.buyershow.mapper.FavoriteFolderMapper;
import com.buyershow.mapper.FavoriteMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 收藏夹服务（G7）：创建/重命名/删除收藏夹与收藏移动。
 * 「默认收藏夹」不落库（favorites.folder_id 为 NULL），不可重命名/删除。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteFolderService {

    private static final int MAX_FOLDER_NAME_LENGTH = 30;

    private final FavoriteFolderMapper favoriteFolderMapper;
    private final FavoriteMapper favoriteMapper;

    /** 我的收藏夹列表（含收藏数，按创建顺序；默认夹由前端合成展示）。 */
    public List<FavoriteFolderDTO> listFolders() {
        Long userId = requireCurrentUserId();
        return favoriteFolderMapper.selectFoldersWithCount(userId);
    }

    /** 创建收藏夹（名称 trim 后 1-30 字符，同用户内不重名）。 */
    @Transactional
    public FavoriteFolderDTO createFolder(String name) {
        Long userId = requireCurrentUserId();
        String normalized = normalizeName(name);
        FavoriteFolder folder = new FavoriteFolder();
        folder.setUserId(userId);
        folder.setName(normalized);
        try {
            favoriteFolderMapper.insert(folder);
        } catch (DuplicateKeyException exception) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "收藏夹名称已存在");
        }
        FavoriteFolderDTO dto = new FavoriteFolderDTO();
        dto.setId(folder.getId());
        dto.setName(folder.getName());
        dto.setPostCount(0L);
        return dto;
    }

    /** 重命名收藏夹（仅本人）。 */
    @Transactional
    public void renameFolder(Long folderId, String name) {
        Long userId = requireCurrentUserId();
        requireOwnFolder(userId, folderId);
        String normalized = normalizeName(name);
        FavoriteFolder update = new FavoriteFolder();
        update.setId(folderId);
        update.setName(normalized);
        try {
            favoriteFolderMapper.updateById(update);
        } catch (DuplicateKeyException exception) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "收藏夹名称已存在");
        }
    }

    /** 删除收藏夹（夹内收藏移回默认夹）。 */
    @Transactional
    public void deleteFolder(Long folderId) {
        Long userId = requireCurrentUserId();
        requireOwnFolder(userId, folderId);
        favoriteMapper.clearFolder(userId, folderId);
        favoriteFolderMapper.deleteById(folderId);
        log.info("User {} deleted favorite folder {}", userId, folderId);
    }

    /** 移动收藏到指定收藏夹（folderId 为空表示默认夹）。 */
    @Transactional
    public void moveFavorite(Long postId, Long folderId) {
        Long userId = requireCurrentUserId();
        Favorite favorite = favoriteMapper.selectOne(
                Wrappers.<Favorite>lambdaQuery()
                        .eq(Favorite::getUserId, userId)
                        .eq(Favorite::getPostId, postId));
        if (favorite == null) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND, "尚未收藏该帖子");
        }
        if (folderId != null) {
            requireOwnFolder(userId, folderId);
        }
        favoriteMapper.updateFolder(userId, postId, folderId);
    }

    /** 校验收藏夹存在且属于当前用户（供收藏、移动复用）。 */
    public void requireOwnFolder(Long userId, Long folderId) {
        FavoriteFolder folder = favoriteFolderMapper.selectById(folderId);
        if (folder == null || !folder.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "收藏夹不存在或无权访问");
        }
    }

    private String normalizeName(String name) {
        String normalized = name == null ? "" : name.trim();
        if (normalized.isEmpty() || normalized.length() > MAX_FOLDER_NAME_LENGTH) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "收藏夹名称需为 1-30 个字符");
        }
        return normalized;
    }

    private Long requireCurrentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return userId;
    }
}
