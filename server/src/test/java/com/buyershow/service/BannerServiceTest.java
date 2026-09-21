package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.entity.SiteBanner;
import com.buyershow.mapper.SiteBannerMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Banner 运营位服务测试（G10）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class BannerServiceTest {

    private final SiteBannerMapper siteBannerMapper = mock(SiteBannerMapper.class);
    private final BannerService service = new BannerService(siteBannerMapper);

    @Test
    void testCreateBannerInsertsWithDefaults() {
        when(siteBannerMapper.countByTitle("新人礼")).thenReturn(0);
        when(siteBannerMapper.insert(any(SiteBanner.class))).thenReturn(1);

        SiteBanner banner = service.create("新人礼", "minio/banner.png", "url", "https://example.com", null);

        assertNotNull(banner.getTitle());
        assertEquals("新人礼", banner.getTitle());
        assertEquals("url", banner.getLinkType());
        assertEquals(0, banner.getSortOrder());
        assertEquals(0, banner.getStatus());
        verify(siteBannerMapper).insert(any(SiteBanner.class));
    }

    @Test
    void testCreateBannerRejectsDuplicateTitle() {
        when(siteBannerMapper.countByTitle("重复位")).thenReturn(1);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.create("重复位", "minio/b.png", "url", "https://example.com", 0));
        assertEquals(ErrorCode.BANNER_TITLE_EXISTS.getCode(), exception.getCode());
        verify(siteBannerMapper, never()).insert(any(SiteBanner.class));
    }

    @Test
    void testCreateBannerRejectsInvalidLinkType() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.create("位", "minio/b.png", "evil", "x", 0));
        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
    }

    @Test
    void testCreateBannerRejectsBlankTitle() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.create("  ", "minio/b.png", "url", "x", 0));
        assertEquals(ErrorCode.PARAM_MISSING.getCode(), exception.getCode());
    }

    @Test
    void testUpdateBannerChangesStatusAndSort() {
        SiteBanner existing = new SiteBanner();
        existing.setId(1L);
        existing.setTitle("旧");
        existing.setImageUrl("minio/old.png");
        existing.setLinkType("url");
        existing.setLinkValue("");
        existing.setSortOrder(0);
        existing.setStatus(0);
        when(siteBannerMapper.selectById(1L)).thenReturn(existing);
        when(siteBannerMapper.updateById(any(SiteBanner.class))).thenReturn(1);

        SiteBanner updated = service.update(1L, null, null, null, "https://new.com", 3, 1);

        assertEquals("https://new.com", updated.getLinkValue());
        assertEquals(3, updated.getSortOrder());
        assertEquals(1, updated.getStatus());
        verify(siteBannerMapper).updateById(existing);
    }

    @Test
    void testDeleteMissingBannerThrows() {
        when(siteBannerMapper.selectById(99L)).thenReturn(null);

        assertThrows(BusinessException.class, () -> service.delete(99L));
    }

    @Test
    void testListActiveDelegatesToMapper() {
        when(siteBannerMapper.selectActiveBanners()).thenReturn(List.of(new SiteBanner()));

        assertEquals(1, service.listActive().size());
    }
}
