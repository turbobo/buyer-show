package com.buyershow.controller;

import com.buyershow.entity.Post;
import com.buyershow.mapper.PostMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Sitemap 生成器。
 * 为搜索引擎提供帖子 URL 列表，提升内容可发现性。
 */
@RestController
@RequiredArgsConstructor
public class SitemapController {

    private static final String BASE_URL = "https://buyershow.app";
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final PostMapper postMapper;

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String sitemap() {
        List<Post> posts = postMapper.selectPublicPosts();
        
        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        
        // 首页
        xml.append("  <url>\n");
        xml.append("    <loc>").append(BASE_URL).append("/</loc>\n");
        xml.append("    <changefreq>hourly</changefreq>\n");
        xml.append("    <priority>1.0</priority>\n");
        xml.append("  </url>\n");
        
        // 帖子详情页
        for (Post post : posts) {
            xml.append("  <url>\n");
            xml.append("    <loc>").append(BASE_URL).append("/posts/").append(post.getId()).append("</loc>\n");
            if (post.getCreatedAt() != null) {
                xml.append("    <lastmod>").append(post.getCreatedAt().toLocalDate().format(DATE_FORMAT)).append("</lastmod>\n");
            }
            xml.append("    <changefreq>weekly</changefreq>\n");
            xml.append("    <priority>0.8</priority>\n");
            xml.append("  </url>\n");
        }
        
        xml.append("</urlset>");
        return xml.toString();
    }
}
