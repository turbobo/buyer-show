package com.buyershow.common.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 正文提及与话题解析工具（G4：帖子 @提及 + #话题#）。
 *
 * <p>语法约定：{@code @昵称}（昵称 2-20 字符，中英文/数字/下划线/连字符；前缀不可紧邻字母数字与 @，
 * 避免误匹配邮箱）；{@code #话题#}（话题 1-20 字符，不含 # 与空白）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
public final class MentionExtractor {

    /** 单帖提及人数上限（防刷）。 */
    public static final int MAX_MENTIONS = 10;

    /** 手选标签与正文话题合并后的上限（前端手选上限 5，话题补充至多 8）。 */
    public static final int MAX_TAGS = 8;

    private static final Pattern MENTION_PATTERN = Pattern.compile("(?<![\\w@])@([a-zA-Z0-9_\\-\\u4e00-\\u9fa5]{2,20})");
    private static final Pattern TOPIC_PATTERN = Pattern.compile("#([^#\\s]{1,20})#");

    private MentionExtractor() {
    }

    /** 提取正文中的 @提及（去重，上限 {@value #MAX_MENTIONS}）。 */
    public static List<String> extractMentions(String content) {
        return extract(content, MENTION_PATTERN, MAX_MENTIONS);
    }

    /** 提取正文中的 #话题#（去重，上限 {@value #MAX_TAGS}）。 */
    public static List<String> extractTopics(String content) {
        return extract(content, TOPIC_PATTERN, MAX_TAGS);
    }

    /** 手选标签与正文话题合并去重（手选在前，上限 {@value #MAX_TAGS}）。 */
    public static List<String> mergeTags(List<String> manualTags, List<String> topics) {
        Set<String> merged = new LinkedHashSet<>();
        if (manualTags != null) {
            merged.addAll(manualTags);
        }
        if (topics != null) {
            merged.addAll(topics);
        }
        List<String> result = new ArrayList<>(merged);
        return result.size() > MAX_TAGS ? result.subList(0, MAX_TAGS) : result;
    }

    private static List<String> extract(String content, Pattern pattern, int limit) {
        List<String> result = new ArrayList<>();
        if (content == null || content.isEmpty()) {
            return result;
        }
        Matcher matcher = pattern.matcher(content);
        while (matcher.find() && result.size() < limit) {
            String value = matcher.group(1);
            if (!result.contains(value)) {
                result.add(value);
            }
        }
        return result;
    }
}
