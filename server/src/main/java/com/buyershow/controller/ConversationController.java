package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.dto.request.SendMessageRequest;
import com.buyershow.dto.request.StartConversationRequest;
import com.buyershow.dto.response.ConversationDTO;
import com.buyershow.dto.response.MessageDTO;
import com.buyershow.service.ConversationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 私信会话接口。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@RestController
@RequestMapping("/api/v1/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    /** 我的会话列表（按最后消息时间倒序）。 */
    @GetMapping
    public R<List<ConversationDTO>> listConversations() {
        return R.ok(conversationService.listConversations());
    }

    /** 发起/复用会话（对方已关注我时可发起）。 */
    @PostMapping
    public R<ConversationDTO> startConversation(@Valid @RequestBody StartConversationRequest request) {
        return R.ok(conversationService.startConversation(request.getTargetUserId()));
    }

    /** 会话消息（afterId 增量 / beforeId 历史分页，正序返回）。 */
    @GetMapping("/{conversationId}/messages")
    public R<List<MessageDTO>> listMessages(
            @PathVariable Long conversationId,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(required = false) Long afterId) {
        return R.ok(conversationService.listMessages(conversationId, beforeId, afterId));
    }

    /** 发送消息。 */
    @PostMapping("/{conversationId}/messages")
    public R<MessageDTO> sendMessage(
            @PathVariable Long conversationId,
            @Valid @RequestBody SendMessageRequest request) {
        return R.ok(conversationService.sendMessage(conversationId, request));
    }

    /** 标记会话已读。 */
    @PostMapping("/{conversationId}/read")
    public R<Void> markRead(@PathVariable Long conversationId) {
        conversationService.markRead(conversationId);
        return R.ok();
    }
}
