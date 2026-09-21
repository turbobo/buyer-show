package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.response.AnnouncementDTO;
import com.buyershow.service.AnnouncementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 系统公告公开接口（G11）：最近一条已发布公告（登录后首页横幅展示）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@RestController
@RequestMapping("/api/v1/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    /** 最近一条已发布公告；无公告时返回 null。 */
    @GetMapping("/latest")
    public R<AnnouncementDTO> latest() {
        return R.ok(announcementService.latest());
    }
}
