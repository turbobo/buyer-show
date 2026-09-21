package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.entity.SiteBanner;
import com.buyershow.mapper.SiteBannerMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Banner 运营位服务（G10）：管理端 CRUD + 公开端启用列表。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BannerService {

    /** 跳转类型白名单。 */
    private static final List<String> LINK_TYPES = List.of("post", "topic", "url");

    private final SiteBannerMapper siteBannerMapper;

    /** 公开端：启用中的 Banner 列表（按排序升序）。 */
    public List<SiteBanner> listActive() {
        return siteBannerMapper.selectActiveBanners();
    }

    /** 管理端：全部 Banner 列表。 */
    public List<SiteBanner> listAll() {
        return siteBannerMapper.selectAllBanners();
    }

    /** 创建 Banner（标题查重、跳转类型白名单）。 */
    public SiteBanner create(String title, String imageUrl, String linkType, String linkValue, Integer sortOrder) {
        String normalizedTitle = requireText(title, 100);
        String normalizedImage = requireText(imageUrl, 500);
        String normalizedType = normalizeLinkType(linkType);
        String normalizedValue = linkValue == null ? "" : linkValue.trim();

        if (siteBannerMapper.countByTitle(normalizedTitle) > 0) {
            throw new BusinessException(ErrorCode.BANNER_TITLE_EXISTS);
        }
        SiteBanner banner = new SiteBanner();
        banner.setTitle(normalizedTitle);
        banner.setImageUrl(normalizedImage);
        banner.setLinkType(normalizedType);
        banner.setLinkValue(normalizedValue);
        banner.setSortOrder(sortOrder == null ? 0 : sortOrder);
        banner.setStatus(0);
        siteBannerMapper.insert(banner);
        log.info("Admin created banner: id={}, title={}", banner.getId(), banner.getTitle());
        return banner;
    }

    /** 更新 Banner。 */
    public SiteBanner update(Long id, String title, String imageUrl, String linkType, String linkValue,
                             Integer sortOrder, Integer status) {
        SiteBanner banner = requireBanner(id);
        if (title != null && !title.isBlank()) {
            banner.setTitle(title.trim());
        }
        if (imageUrl != null && !imageUrl.isBlank()) {
            banner.setImageUrl(imageUrl.trim());
        }
        if (linkType != null) {
            banner.setLinkType(normalizeLinkType(linkType));
        }
        if (linkValue != null) {
            banner.setLinkValue(linkValue.trim());
        }
        if (sortOrder != null) {
            banner.setSortOrder(sortOrder);
        }
        if (status != null) {
            banner.setStatus(status == 1 ? 1 : 0);
        }
        siteBannerMapper.updateById(banner);
        log.info("Admin updated banner: id={}", banner.getId());
        return banner;
    }

    /** 删除 Banner（物理删除，运营位数据量小）。 */
    public void delete(Long id) {
        requireBanner(id);
        siteBannerMapper.deleteById(id);
        log.info("Admin deleted banner: id={}", id);
    }

    private SiteBanner requireBanner(Long id) {
        SiteBanner banner = siteBannerMapper.selectById(id);
        if (banner == null) {
            throw new BusinessException(ErrorCode.BANNER_NOT_FOUND);
        }
        return banner;
    }

    private String normalizeLinkType(String linkType) {
        if (linkType == null || !LINK_TYPES.contains(linkType)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID);
        }
        return linkType;
    }

    private String requireText(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_MISSING);
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new BusinessException(ErrorCode.PARAM_INVALID);
        }
        return normalized;
    }
}
