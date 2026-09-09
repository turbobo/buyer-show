package com.buyershow.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.buyershow.common.ModerationStatus;
import com.buyershow.entity.SensitiveWord;
import com.buyershow.mapper.SensitiveWordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

/** 基于本地敏感词库的同步内容审核服务。 */
@Service
@RequiredArgsConstructor
public class ContentModerationService {

    private static final int ACTION_REVIEW = 0;
    private static final int ACTION_REJECT = 1;
    private static final Duration CACHE_TTL = Duration.ofMinutes(1);

    private final SensitiveWordMapper sensitiveWordMapper;
    private volatile List<SensitiveWord> cachedRules = List.of();
    private volatile Instant cacheExpiresAt = Instant.EPOCH;

    /** 审核多个文本字段；字段独立匹配，拒绝优先于人工审核。 */
    public ModerationDecision evaluate(String... contents) {
        boolean requiresReview = false;
        for (String content : contents) {
            String normalized = normalize(content);
            if (normalized.isBlank()) {
                continue;
            }
            for (SensitiveWord rule : getRules()) {
                String word = normalize(rule.getWord());
                if (word.isBlank() || !normalized.contains(word)) {
                    continue;
                }
                if (rule.getAction() == ACTION_REJECT) {
                    return new ModerationDecision(ModerationStatus.REJECTED, "命中内容安全规则");
                }
                if (rule.getAction() == ACTION_REVIEW) {
                    requiresReview = true;
                }
            }
        }
        return requiresReview
                ? new ModerationDecision(ModerationStatus.PENDING, "命中人工审核规则")
                : new ModerationDecision(ModerationStatus.APPROVED, null);
    }

    private List<SensitiveWord> getRules() {
        Instant now = Instant.now();
        if (now.isBefore(cacheExpiresAt)) {
            return cachedRules;
        }
        synchronized (this) {
            if (now.isBefore(cacheExpiresAt)) {
                return cachedRules;
            }
            cachedRules = sensitiveWordMapper.selectList(
                    Wrappers.<SensitiveWord>lambdaQuery()
                            .eq(SensitiveWord::getEnabled, 1)
                            .ne(SensitiveWord::getWord, ""));
            cacheExpiresAt = now.plus(CACHE_TTL);
            return cachedRules;
        }
    }

    private String normalize(String content) {
        if (content == null) {
            return "";
        }
        return Normalizer.normalize(content, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[\\s\\p{Cf}]+", "");
    }
}
