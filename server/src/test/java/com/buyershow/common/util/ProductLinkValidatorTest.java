package com.buyershow.common.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * ProductLinkValidator 单元测试（G12）：白名单域名 + http/https + 防前缀/尾随欺骗。
 */
class ProductLinkValidatorTest {

    @Test
    void testNullAndBlankAreValid() {
        assertTrue(ProductLinkValidator.isValid(null));
        assertTrue(ProductLinkValidator.isValid(""));
        assertTrue(ProductLinkValidator.isValid("   "));
    }

    @Test
    void testAllowedMainDomains() {
        assertTrue(ProductLinkValidator.isValid("https://www.taobao.com/item/1"));
        assertTrue(ProductLinkValidator.isValid("https://tmall.com/x"));
        assertTrue(ProductLinkValidator.isValid("http://jd.com/x"));
        assertTrue(ProductLinkValidator.isValid("https://pinduoduo.com/x"));
        assertTrue(ProductLinkValidator.isValid("https://yangkeduo.com/x"));
    }

    @Test
    void testAllowedSubdomains() {
        assertTrue(ProductLinkValidator.isValid("https://detail.tmall.com/item.htm?id=1"));
        assertTrue(ProductLinkValidator.isValid("https://item.jd.com/100012043978.html"));
        assertTrue(ProductLinkValidator.isValid("https://mobile.yangkeduo.com/goods.html"));
        assertTrue(ProductLinkValidator.isValid("https://s.taobao.com/search?q=x"));
    }

    @Test
    void testRejectNonHttpScheme() {
        assertFalse(ProductLinkValidator.isValid("ftp://taobao.com/x"));
        assertFalse(ProductLinkValidator.isValid("javascript:alert(1)"));
        assertFalse(ProductLinkValidator.isValid("taobao.com/x"));
    }

    @Test
    void testRejectNonWhitelistedDomains() {
        assertFalse(ProductLinkValidator.isValid("https://evil.com/x"));
        assertFalse(ProductLinkValidator.isValid("https://example.com/x"));
    }

    @Test
    void testRejectPrefixAndSuffixSpoofing() {
        assertFalse(ProductLinkValidator.isValid("https://nottaobao.com/x"));
        assertFalse(ProductLinkValidator.isValid("https://taobao.com.evil.com/x"));
        assertFalse(ProductLinkValidator.isValid("https://taobao.com.evil.com"));
    }

    @Test
    void testRejectMalformedUri() {
        assertFalse(ProductLinkValidator.isValid("https://"));
        assertFalse(ProductLinkValidator.isValid("https://taobao.com:bad/x"));
        assertFalse(ProductLinkValidator.isValid("://taobao.com"));
    }

    @Test
    void testUserInfoHostParsing() {
        assertTrue(ProductLinkValidator.isValid("https://user@taobao.com/x"));
        assertFalse(ProductLinkValidator.isValid("https://taobao.com@evil.com/x"));
    }
}
