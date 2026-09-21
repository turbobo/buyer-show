package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.AnnouncementRequest;
import com.buyershow.dto.request.BannerRequest;
import com.buyershow.dto.request.FeaturedRequest;
import com.buyershow.dto.request.TopicRequest;
import com.buyershow.dto.response.AdminPostRow;
import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.TopicDTO;
import com.buyershow.entity.Announcement;
import com.buyershow.entity.SiteBanner;
import com.buyershow.service.AnnouncementService;
import com.buyershow.service.BannerService;
import com.buyershow.service.PostService;
import com.buyershow.service.TopicService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 运营管理接口（G10）：Banner 位、精选流、话题（仅管理员）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminOperationsController {

    private final BannerService bannerService;
    private final TopicService topicService;
    private final PostService postService;
    private final AnnouncementService announcementService;

    // ─── Banner 运营位 ───

    /** 全部 Banner 列表。 */
    @GetMapping("/banners")
    public R<List<SiteBanner>> listBanners() {
        return R.ok(bannerService.listAll());
    }

    /** 创建 Banner。 */
    @PostMapping("/banners")
    public R<SiteBanner> createBanner(@Valid @RequestBody BannerRequest request) {
        return R.ok(bannerService.create(
                request.getTitle(), request.getImageUrl(), request.getLinkType(),
                request.getLinkValue(), request.getSortOrder()));
    }

    /** 更新 Banner（含启用/停用）。 */
    @PutMapping("/banners/{id}")
    public R<SiteBanner> updateBanner(@PathVariable Long id, @Valid @RequestBody BannerRequest request) {
        return R.ok(bannerService.update(
                id, request.getTitle(), request.getImageUrl(), request.getLinkType(),
                request.getLinkValue(), request.getSortOrder(), request.getStatus()));
    }

    /** 删除 Banner。 */
    @DeleteMapping("/banners/{id}")
    public R<Void> deleteBanner(@PathVariable Long id) {
        bannerService.delete(id);
        return R.ok();
    }

    // ─── 运营话题 ───

    /** 全部话题列表（含帖子数）。 */
    @GetMapping("/topics")
    public R<List<TopicDTO>> listTopics() {
        return R.ok(topicService.listAll());
    }

    /** 创建话题。 */
    @PostMapping("/topics")
    public R<TopicDTO> createTopic(@Valid @RequestBody TopicRequest request) {
        return R.ok(topicService.create(
                request.getName(), request.getCoverUrl(), request.getDescription(), request.getSortOrder()));
    }

    /** 更新话题（含启用/停用）。 */
    @PutMapping("/topics/{id}")
    public R<TopicDTO> updateTopic(@PathVariable Long id, @Valid @RequestBody TopicRequest request) {
        return R.ok(topicService.update(
                id, request.getName(), request.getCoverUrl(), request.getDescription(),
                request.getSortOrder(), request.getStatus()));
    }

    /** 删除话题。 */
    @DeleteMapping("/topics/{id}")
    public R<Void> deleteTopic(@PathVariable Long id) {
        topicService.delete(id);
        return R.ok();
    }

    // ─── 精选流 ───

    /** 帖子列表（精选管理；featured 非空时按精选状态过滤）。 */
    @GetMapping("/posts")
    public R<CursorPage<AdminPostRow>> listPosts(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Integer featured) {
        return R.ok(postService.listAdminPosts(cursor, size, featured));
    }

    /** 设置/取消精选。 */
    @PutMapping("/posts/{postId}/featured")
    public R<Void> setFeatured(@PathVariable Long postId, @Valid @RequestBody FeaturedRequest request) {
        postService.setFeatured(postId, request.getFeatured());
        return R.ok();
    }

    // ─── 系统公告（G11） ───

    /** 全部公告列表。 */
    @GetMapping("/announcements")
    public R<List<Announcement>> listAnnouncements() {
        return R.ok(announcementService.listAll());
    }

    /** 创建公告（草稿或直接发布；发布即实时广播）。 */
    @PostMapping("/announcements")
    public R<Announcement> createAnnouncement(@Valid @RequestBody AnnouncementRequest request) {
        return R.ok(announcementService.create(
                request.getTitle(), request.getContent(), request.getStatus()));
    }

    /** 更新公告（草稿→发布时实时广播）。 */
    @PutMapping("/announcements/{id}")
    public R<Announcement> updateAnnouncement(@PathVariable Long id, @Valid @RequestBody AnnouncementRequest request) {
        return R.ok(announcementService.update(
                id, request.getTitle(), request.getContent(), request.getStatus()));
    }

    /** 下线公告。 */
    @PutMapping("/announcements/{id}/offline")
    public R<Void> offlineAnnouncement(@PathVariable Long id) {
        announcementService.offline(id);
        return R.ok();
    }

    /** 删除公告。 */
    @DeleteMapping("/announcements/{id}")
    public R<Void> deleteAnnouncement(@PathVariable Long id) {
        announcementService.delete(id);
        return R.ok();
    }
}
