package com.buyershow.common.util;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Set;

/**
 * 商品购买链接校验（G12）：仅允许 http/https 且主机名命中白名单主域（含子域）。
 * <p>
 * 防钓鱼要点：后缀匹配要求「完全相等或以 {@code .主域} 结尾」，
 * 阻止 {@code nottaobao.com}、{@code taobao.com.evil.com} 之类前缀/尾随欺骗；
 * URI 解析用 {@code getHost()}（解析 {@code https://user@taobao.com} 用户信息与端口）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
public final class ProductLinkValidator {

    /** 允许的电商主域（淘宝/天猫/京东/拼多多）。 */
    private static final Set<String> ALLOWED_DOMAINS = Set.of(
            "taobao.com", "tmall.com", "jd.com", "pinduoduo.com", "yangkeduo.com");

    private ProductLinkValidator() {
    }

    /** 链接合法返回 true；空白（未填写）视为合法，由调用方决定是否落库。 */
    public static boolean isValid(String link) {
        if (link == null || link.isBlank()) {
            return true;
        }
        URI uri;
        try {
            uri = new URI(link.trim());
        } catch (URISyntaxException e) {
            return false;
        }
        String scheme = uri.getScheme();
        if (scheme == null || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
            return false;
        }
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            return false;
        }
        String lowerHost = host.toLowerCase();
        for (String domain : ALLOWED_DOMAINS) {
            if (lowerHost.equals(domain) || lowerHost.endsWith("." + domain)) {
                return true;
            }
        }
        return false;
    }
}
