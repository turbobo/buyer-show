package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.CreateFolderRequest;
import com.buyershow.dto.request.MoveFavoriteRequest;
import com.buyershow.dto.request.RenameFolderRequest;
import com.buyershow.dto.response.FavoriteFolderDTO;
import com.buyershow.service.FavoriteFolderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 收藏夹接口（G7）：仅本人可管理。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
public class FavoriteFolderController {

    private final FavoriteFolderService favoriteFolderService;

    /** 我的收藏夹列表（含收藏数；默认夹由前端合成展示）。 */
    @GetMapping("/folders")
    public R<List<FavoriteFolderDTO>> listFolders() {
        return R.ok(favoriteFolderService.listFolders());
    }

    /** 创建收藏夹。 */
    @PostMapping("/folders")
    public R<FavoriteFolderDTO> createFolder(@Valid @RequestBody CreateFolderRequest request) {
        return R.ok(favoriteFolderService.createFolder(request.getName()));
    }

    /** 重命名收藏夹。 */
    @PutMapping("/folders/{folderId}")
    public R<Void> renameFolder(@PathVariable Long folderId, @Valid @RequestBody RenameFolderRequest request) {
        favoriteFolderService.renameFolder(folderId, request.getName());
        return R.ok(null);
    }

    /** 删除收藏夹（夹内收藏移回默认夹）。 */
    @DeleteMapping("/folders/{folderId}")
    public R<Void> deleteFolder(@PathVariable Long folderId) {
        favoriteFolderService.deleteFolder(folderId);
        return R.ok(null);
    }

    /** 移动收藏到指定收藏夹（folderId 为空表示默认夹）。 */
    @PostMapping("/favorites/{postId}/move")
    public R<Void> moveFavorite(@PathVariable Long postId, @RequestBody(required = false) MoveFavoriteRequest request) {
        favoriteFolderService.moveFavorite(postId, request == null ? null : request.getFolderId());
        return R.ok(null);
    }
}
