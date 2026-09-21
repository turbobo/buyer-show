package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 系统公告创建/更新请求（G11）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class AnnouncementRequest {

    @NotBlank(message = "公告标题不能为空")
    @Size(max = 100, message = "公告标题最长 100 字")
    private String title;

    @NotBlank(message = "公告正文不能为空")
    @Size(max = 2000, message = "公告正文最长 2000 字")
    private String content;

    /** 状态: 0=草稿 1=已发布 2=已下线（创建时仅 0/1）。 */
    @NotNull(message = "公告状态不能为空")
    private Integer status;
}
