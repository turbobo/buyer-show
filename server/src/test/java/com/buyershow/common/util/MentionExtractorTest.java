package com.buyershow.common.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 正文提及与话题解析测试（G4）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class MentionExtractorTest {

    @Test
    void testExtractMentionsMixedChineseAndEnglish() {
        List<String> mentions = MentionExtractor.extractMentions("试试看 @张三 和 @alice_wang 都来看看");

        assertEquals(List.of("张三", "alice_wang"), mentions);
    }

    @Test
    void testExtractMentionsSkipsEmail() {
        List<String> mentions = MentionExtractor.extractMentions("联系我 abc@test.com 谢谢");

        assertTrue(mentions.isEmpty());
    }

    @Test
    void testExtractMentionsIgnoresTooShortOrInvalid() {
        List<String> mentions = MentionExtractor.extractMentions("@a @1 @@@ @张三_abc 结尾");

        assertEquals(List.of("张三_abc"), mentions);
    }

    @Test
    void testExtractMentionsDeduplicatesAndCaps() {
        StringBuilder content = new StringBuilder();
        for (int i = 1; i <= 12; i++) {
            content.append("@用户").append(i).append(' ');
        }
        content.append("@用户1");

        List<String> mentions = MentionExtractor.extractMentions(content.toString());

        assertEquals(10, mentions.size());
        assertEquals("用户1", mentions.get(0));
        assertTrue(mentions.stream().distinct().count() == 10);
    }

    @Test
    void testExtractTopicsBasic() {
        List<String> topics = MentionExtractor.extractTopics("今天去了 #咖啡店# 打卡 #美食探店# 真不错");

        assertEquals(List.of("咖啡店", "美食探店"), topics);
    }

    @Test
    void testExtractTopicsSkipsUnclosed() {
        List<String> topics = MentionExtractor.extractTopics("#没有闭合 和 # 空话题 # 之后 #正常#");

        assertEquals(List.of("正常"), topics);
    }

    @Test
    void testExtractTopicsDeduplicatesAndCaps() {
        StringBuilder content = new StringBuilder();
        for (int i = 1; i <= 10; i++) {
            content.append('#').append("话题").append(i).append("# ");
        }
        content.append("#话题1#");

        List<String> topics = MentionExtractor.extractTopics(content.toString());

        assertEquals(8, topics.size());
    }

    @Test
    void testMergeTagsDeduplicatesAndKeepsOrder() {
        List<String> merged = MentionExtractor.mergeTags(List.of("美食", "探店"), List.of("探店", "咖啡"));

        assertEquals(List.of("美食", "探店", "咖啡"), merged);
    }

    @Test
    void testMergeTagsCapsAtEight() {
        List<String> merged = MentionExtractor.mergeTags(
                List.of("a", "b", "c", "d", "e"),
                List.of("f", "g", "h", "i", "j"));

        assertEquals(8, merged.size());
        assertEquals(List.of("a", "b", "c", "d", "e", "f", "g", "h"), merged);
    }

    @Test
    void testMergeTagsHandlesNull() {
        assertEquals(List.of("话题1"), MentionExtractor.mergeTags(null, List.of("话题1")));
        assertEquals(List.of("手选"), MentionExtractor.mergeTags(List.of("手选"), null));
        assertTrue(MentionExtractor.mergeTags(null, null).isEmpty());
    }
}
