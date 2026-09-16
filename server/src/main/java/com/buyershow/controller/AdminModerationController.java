package com.buyershow.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.buyershow.common.R;
import com.buyershow.dto.request.HandleReportRequest;
import com.buyershow.dto.request.ModerateContentRequest;
import com.buyershow.dto.response.ModerationCommentDTO;
import com.buyershow.dto.response.ModerationPostDTO;
import com.buyershow.dto.response.ReportDTO;
import com.buyershow.service.AdminModerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 管理员审核工作台 REST 接口。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminModerationController {

    private final AdminModerationService adminModerationService;

    /** 获取待审核帖子。 */
    @GetMapping("/moderation/posts")
    public R<IPage<ModerationPostDTO>> listPendingPosts(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return R.ok(adminModerationService.listPendingPosts(page, size));
    }

    /** 获取待审核评论。 */
    @GetMapping("/moderation/comments")
    public R<IPage<ModerationCommentDTO>> listPendingComments(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return R.ok(adminModerationService.listPendingComments(page, size));
    }

    /** 获取待处理举报。 */
    @GetMapping("/reports")
    public R<IPage<ReportDTO>> listPendingReports(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size) {
        return R.ok(adminModerationService.listPendingReports(page, size));
    }

    /** 待办计数（待审帖子/评论/举报）。 */
    @GetMapping("/pending-counts")
    public R<Map<String, Long>> pendingCounts() {
        return R.ok(adminModerationService.pendingCounts());
    }

    /** 审核帖子。 */
    @PostMapping("/moderation/posts/{postId}")
    public R<Void> moderatePost(
            @PathVariable Long postId,
            @Valid @RequestBody ModerateContentRequest request) {
        adminModerationService.moderatePost(postId, request);
        return R.ok();
    }

    /** 审核评论。 */
    @PostMapping("/moderation/comments/{commentId}")
    public R<Void> moderateComment(
            @PathVariable Long commentId,
            @Valid @RequestBody ModerateContentRequest request) {
        adminModerationService.moderateComment(commentId, request);
        return R.ok();
    }

    /** 处理举报。 */
    @PostMapping("/reports/{reportId}")
    public R<Void> handleReport(
            @PathVariable Long reportId,
            @Valid @RequestBody HandleReportRequest request) {
        adminModerationService.handleReport(reportId, request);
        return R.ok();
    }
}
