package com.buyershow.service;

import com.buyershow.common.ModerationStatus;
import com.buyershow.entity.SensitiveWord;
import com.buyershow.mapper.SensitiveWordMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 本地内容审核规则测试。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@ExtendWith(MockitoExtension.class)
class ContentModerationServiceTest {

    @Mock
    private SensitiveWordMapper sensitiveWordMapper;

    @InjectMocks
    private ContentModerationService contentModerationService;

    @Test
    void testEvaluateReturnsApprovedForCleanContent() {
        when(sensitiveWordMapper.selectList(any())).thenReturn(List.of());

        ModerationDecision decision = contentModerationService.evaluate("真实购物体验");

        assertEquals(ModerationStatus.APPROVED, decision.getStatus());
    }

    @Test
    void testEvaluateReturnsPendingForReviewRule() {
        SensitiveWord rule = rule("加微信", 0);
        when(sensitiveWordMapper.selectList(any())).thenReturn(List.of(rule));

        ModerationDecision decision = contentModerationService.evaluate("详情请加微信咨询");

        assertEquals(ModerationStatus.PENDING, decision.getStatus());
    }

    @Test
    void testEvaluateReturnsRejectedWhenBlockRuleMatches() {
        SensitiveWord reviewRule = rule("加微信", 0);
        SensitiveWord rejectRule = rule("刷单", 1);
        when(sensitiveWordMapper.selectList(any())).thenReturn(List.of(reviewRule, rejectRule));

        ModerationDecision decision = contentModerationService.evaluate("加微信安排刷单");

        assertEquals(ModerationStatus.REJECTED, decision.getStatus());
    }

    @Test
    void testEvaluateNormalizesFullWidthAndWhitespace() {
        when(sensitiveWordMapper.selectList(any())).thenReturn(List.of(rule("加微信", 0)));

        ModerationDecision decision = contentModerationService.evaluate("详情请加　微\u200B信咨询");

        assertEquals(ModerationStatus.PENDING, decision.getStatus());
    }

    private SensitiveWord rule(String word, int action) {
        SensitiveWord rule = new SensitiveWord();
        rule.setWord(word);
        rule.setAction(action);
        rule.setEnabled(1);
        return rule;
    }
}
