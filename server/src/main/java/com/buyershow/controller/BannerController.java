package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.entity.SiteBanner;
import com.buyershow.service.BannerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 公开 Banner 接口（G10）：首页运营位。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@RestController
@RequestMapping("/api/v1/banners")
@RequiredArgsConstructor
public class BannerController {

    private final BannerService bannerService;

    /** 启用中的 Banner 列表（按排序升序），无需登录。 */
    @GetMapping
    public R<List<SiteBanner>> listActive() {
        return R.ok(bannerService.listActive());
    }
}
