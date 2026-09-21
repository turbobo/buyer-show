package com.buyershow.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.buyershow.common.ErrorCode;
import com.buyershow.common.ModerationStatus;
import com.buyershow.common.UserStatus;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.request.SendMessageRequest;
import com.buyershow.dto.response.ConversationDTO;
import com.buyershow.dto.response.MessageDTO;
import com.buyershow.entity.Conversation;
import com.buyershow.entity.Message;
import com.buyershow.entity.User;
import com.buyershow.mapper.ConversationMapper;
import com.buyershow.mapper.FollowMapper;
import com.buyershow.mapper.MessageMapper;
import com.buyershow.mapper.UserBlockMapper;
import com.buyershow.mapper.UserMapper;
import com.buyershow.realtime.RealtimeEvent;
import com.buyershow.realtime.RealtimeEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;

/**
 * 私信服务：会话发起、消息收发与已读。
 * 隐私规则：仅当对方已关注我（含互关）时可发起会话。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationService {

    private static final int MAX_CONVERSATIONS = 100;
    private static final int DEFAULT_MESSAGE_PAGE_SIZE = 30;

    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final UserMapper userMapper;
    private final FollowMapper followMapper;
    private final UserBlockMapper userBlockMapper;
    private final ContentModerationService contentModerationService;
    private final ActivityService activityService;
    private final RealtimeEventPublisher realtimeEventPublisher;

    /**
     * 当前用户的会话列表（按最后消息时间倒序）。
     *
     * @return 会话列表
     */
    public List<ConversationDTO> listConversations() {
        Long userId = requireCurrentUserId();
        List<ConversationDTO> conversations = conversationMapper.selectConversations(userId, MAX_CONVERSATIONS);
        if (!conversations.isEmpty()) {
            Set<Long> onlinePeers = activityService.onlineAmong(
                    conversations.stream().map(ConversationDTO::getPeerId).toList());
            conversations.forEach(dto -> dto.setPeerOnline(onlinePeers.contains(dto.getPeerId())));
        }
        return conversations;
    }

    /**
     * 发起/复用私信会话（对方已关注我时可发起）。
     *
     * @param targetUserId 目标用户ID
     * @return 会话（含对方信息）
     */
    @Transactional
    public ConversationDTO startConversation(Long targetUserId) {
        Long userId = requireCurrentUserId();
        if (userId.equals(targetUserId)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "不能给自己发私信");
        }
        User target = userMapper.selectById(targetUserId);
        if (target == null || target.getStatus() != UserStatus.ACTIVE.getValue()) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        if (followMapper.countFollow(targetUserId, userId) <= 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "对方关注你之后才能发起私信");
        }
        requireNotBlocked(userId, targetUserId);
        long userA = Math.min(userId, targetUserId);
        long userB = Math.max(userId, targetUserId);
        Conversation existing = conversationMapper.selectOne(
                Wrappers.<Conversation>lambdaQuery()
                        .eq(Conversation::getUserAId, userA)
                        .eq(Conversation::getUserBId, userB));
        if (existing != null) {
            return toConversationDTO(existing, userId, target);
        }
        Conversation conversation = new Conversation();
        conversation.setUserAId(userA);
        conversation.setUserBId(userB);
        conversation.setAUnread(0);
        conversation.setBUnread(0);
        conversationMapper.insert(conversation);
        return toConversationDTO(conversation, userId, target);
    }
    /**
     * 会话消息：afterId 拉增量（正序）；否则加载 beforeId 之前最近一页（正序返回）。
     *
     * @param conversationId 会话ID
     * @param beforeId 历史分页游标（可空）
     * @param afterId 增量游标（可空，优先）
     * @return 消息列表（正序）
     */
    public List<MessageDTO> listMessages(Long conversationId, Long beforeId, Long afterId) {
        Long userId = requireCurrentUserId();
        requireMember(conversationId, userId);
        if (afterId != null) {
            return messageMapper.selectMessagesAfter(conversationId, afterId);
        }
        List<MessageDTO> desc = messageMapper.selectMessages(conversationId, beforeId, DEFAULT_MESSAGE_PAGE_SIZE);
        List<MessageDTO> ordered = new ArrayList<>(desc);
        Collections.reverse(ordered);
        return ordered;
    }

    /**
     * 发送消息（内容安全检查；更新会话最后消息与对方未读数）。
     *
     * @param conversationId 会话ID
     * @param request 消息内容
     * @return 已发送消息
     */
    @Transactional
    public MessageDTO sendMessage(Long conversationId, SendMessageRequest request) {
        Long userId = requireCurrentUserId();
        Conversation conversation = requireMember(conversationId, userId);
        String content = request.getContent().trim();
        if (content.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "消息内容不能为空");
        }
        ModerationDecision decision = contentModerationService.evaluate(content);
        if (decision.getStatus() != ModerationStatus.APPROVED) {
            throw new BusinessException(ErrorCode.CONTENT_REJECTED,
                    decision.getReason() != null ? decision.getReason() : "消息包含敏感信息，发送失败");
        }
        Long receiverId = conversation.getUserAId().equals(userId)
                ? conversation.getUserBId()
                : conversation.getUserAId();
        requireNotBlocked(userId, receiverId);
        Message message = new Message();
        message.setConversationId(conversationId);
        message.setSenderId(userId);
        message.setReceiverId(receiverId);
        message.setContent(content);
        message.setIsRead(0);
        messageMapper.insert(message);

        Conversation update = new Conversation();
        update.setId(conversationId);
        update.setLastMessageId(message.getId());
        update.setLastMessageAt(LocalDateTime.now());
        if (conversation.getUserAId().equals(userId)) {
            update.setBUnread(safeUnread(conversation.getBUnread()) + 1);
        } else {
            update.setAUnread(safeUnread(conversation.getAUnread()) + 1);
        }
        conversationMapper.updateById(update);
        // G11：消息落库后发布实时事件推送对方（推送失败不影响业务，轮询兜底）
        realtimeEventPublisher.publish(RealtimeEvent.builder()
                .type(RealtimeEvent.TYPE_MESSAGE)
                .userId(receiverId)
                .message(toMessageDTO(message))
                .build());
        return toMessageDTO(message);
    }

    /**
     * 将会话内对方发来的消息标记为已读，并清零我的未读数。
     *
     * @param conversationId 会话ID
     */
    @Transactional
    public void markRead(Long conversationId) {
        Long userId = requireCurrentUserId();
        Conversation conversation = requireMember(conversationId, userId);
        messageMapper.markReadInConversation(conversationId, userId);
        Conversation update = new Conversation();
        update.setId(conversationId);
        if (conversation.getUserAId().equals(userId)) {
            update.setAUnread(0);
        } else {
            update.setBUnread(0);
        }
        conversationMapper.updateById(update);
    }

    /** 任意方向存在拉黑关系时禁止私信。 */
    private void requireNotBlocked(Long userId, Long peerId) {
        if (userBlockMapper.countBlockBetween(userId, peerId) > 0) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "存在拉黑关系，无法发送私信");
        }
    }

    private Conversation requireMember(Long conversationId, Long userId) {
        Conversation conversation = conversationMapper.selectById(conversationId);
        if (conversation == null
                || (!conversation.getUserAId().equals(userId) && !conversation.getUserBId().equals(userId))) {
            throw new BusinessException(ErrorCode.NO_PERMISSION, "会话不存在或无权访问");
        }
        return conversation;
    }

    private ConversationDTO toConversationDTO(Conversation conversation, Long userId, User peer) {
        ConversationDTO dto = new ConversationDTO();
        dto.setId(conversation.getId());
        dto.setPeerId(peer.getId());
        dto.setPeerNickname(peer.getNickname());
        dto.setPeerAvatarUrl(peer.getAvatarUrl());
        dto.setLastMessage(null);
        dto.setLastMessageAt(conversation.getLastMessageAt());
        dto.setUnreadCount(conversation.getUserAId().equals(userId)
                ? safeUnread(conversation.getAUnread())
                : safeUnread(conversation.getBUnread()));
        dto.setPeerOnline(activityService.onlineAmong(List.of(peer.getId())).contains(peer.getId()));
        return dto;
    }

    private MessageDTO toMessageDTO(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setId(message.getId());
        dto.setConversationId(message.getConversationId());
        dto.setSenderId(message.getSenderId());
        dto.setReceiverId(message.getReceiverId());
        dto.setContent(message.getContent());
        dto.setIsRead(message.getIsRead());
        dto.setCreatedAt(message.getCreatedAt());
        return dto;
    }

    private int safeUnread(Integer value) {
        return value == null ? 0 : value;
    }

    private Long requireCurrentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.TOKEN_INVALID);
        }
        return userId;
    }
}
