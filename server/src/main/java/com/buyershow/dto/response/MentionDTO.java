package com.buyershow.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 帖子正文 @提及的解析结果（G4）：昵称到用户 ID 的映射，供前端高亮跳转。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MentionDTO {

    /** 被提及用户的昵称（与正文中 @昵称 一致）。 */
    private String nickname;

    /** 被提及用户的 ID（跳转用户主页用）。 */
    private Long userId;
}
