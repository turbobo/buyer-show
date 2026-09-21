package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 重命名收藏夹请求（G7）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class RenameFolderRequest {
    @NotBlank(message = "收藏夹名称不能为空")
    @Size(max = 30, message = "收藏夹名称最多 30 个字符")
    private String name;
}
