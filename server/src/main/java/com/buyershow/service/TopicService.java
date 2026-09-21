package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.response.TopicDTO;
import com.buyershow.entity.Topic;
import com.buyershow.mapper.TopicMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 运营话题服务（G10）：管理端 CRUD + 公开端话题列表（含帖子数聚合）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TopicService {

    /** 话题名称最大长度（与帖子标签长度上限一致）。 */
    private static final int NAME_MAX_LENGTH = 20;
    private static final int DESCRIPTION_MAX_LENGTH = 200;

    private final TopicMapper topicMapper;

    /** 公开端：启用中的话题列表（含帖子数）。 */
    public List<TopicDTO> listActive() {
        return attachPostCounts(topicMapper.selectActiveTopics());
    }

    /** 管理端：全部话题列表（含帖子数）。 */
    public List<TopicDTO> listAll() {
        return attachPostCounts(topicMapper.selectAllTopics());
    }

    /** 创建话题（名称查重）。 */
    public TopicDTO create(String name, String coverUrl, String description, Integer sortOrder) {
        String normalizedName = requireName(name);
        if (topicMapper.countByName(normalizedName, null) > 0) {
            throw new BusinessException(ErrorCode.TOPIC_NAME_EXISTS);
        }
        Topic topic = new Topic();
        topic.setName(normalizedName);
        topic.setCoverUrl(coverUrl == null || coverUrl.isBlank() ? null : coverUrl.trim());
        topic.setDescription(normalizeDescription(description));
        topic.setSortOrder(sortOrder == null ? 0 : sortOrder);
        topic.setStatus(0);
        topicMapper.insert(topic);
        log.info("Admin created topic: id={}, name={}", topic.getId(), topic.getName());
        return toDTO(topic, 0L);
    }

    /** 更新话题。 */
    public TopicDTO update(Long id, String name, String coverUrl, String description,
                           Integer sortOrder, Integer status) {
        Topic topic = requireTopic(id);
        if (name != null && !name.isBlank()) {
            String normalizedName = requireName(name);
            if (topicMapper.countByName(normalizedName, id) > 0) {
                throw new BusinessException(ErrorCode.TOPIC_NAME_EXISTS);
            }
            topic.setName(normalizedName);
        }
        if (coverUrl != null) {
            topic.setCoverUrl(coverUrl.isBlank() ? null : coverUrl.trim());
        }
        if (description != null) {
            topic.setDescription(normalizeDescription(description));
        }
        if (sortOrder != null) {
            topic.setSortOrder(sortOrder);
        }
        if (status != null) {
            topic.setStatus(status == 1 ? 1 : 0);
        }
        topicMapper.updateById(topic);
        log.info("Admin updated topic: id={}", topic.getId());
        return toDTO(topic, topicMapper.countPostsByName(topic.getName()));
    }

    /** 删除话题（帖子标签不受影响）。 */
    public void delete(Long id) {
        requireTopic(id);
        topicMapper.deleteById(id);
        log.info("Admin deleted topic: id={}", id);
    }

    /** 话题详情（公开端）。 */
    public TopicDTO getTopic(Long id) {
        Topic topic = topicMapper.selectById(id);
        if (topic == null || topic.getStatus() != 0) {
            throw new BusinessException(ErrorCode.TOPIC_NOT_FOUND);
        }
        return toDTO(topic, topicMapper.countPostsByName(topic.getName()));
    }

    private List<TopicDTO> attachPostCounts(List<Topic> topics) {
        Map<String, Long> counts = new HashMap<>();
        for (Map<String, Object> row : topicMapper.countPostsByTags()) {
            Object tag = row.get("tag");
            Object count = row.get("postCount");
            if (tag != null && count != null) {
                counts.put(String.valueOf(tag), ((Number) count).longValue());
            }
        }
        return topics.stream().map(topic -> toDTO(topic, counts.getOrDefault(topic.getName(), 0L))).toList();
    }

    private TopicDTO toDTO(Topic topic, long postCount) {
        TopicDTO dto = new TopicDTO();
        dto.setId(topic.getId());
        dto.setName(topic.getName());
        dto.setCoverUrl(topic.getCoverUrl());
        dto.setDescription(topic.getDescription());
        dto.setSortOrder(topic.getSortOrder());
        dto.setStatus(topic.getStatus());
        dto.setPostCount(postCount);
        return dto;
    }

    private Topic requireTopic(Long id) {
        Topic topic = topicMapper.selectById(id);
        if (topic == null) {
            throw new BusinessException(ErrorCode.TOPIC_NOT_FOUND);
        }
        return topic;
    }

    private String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_MISSING);
        }
        String normalized = name.trim();
        if (normalized.length() > NAME_MAX_LENGTH) {
            throw new BusinessException(ErrorCode.PARAM_INVALID);
        }
        return normalized;
    }

    private String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        String normalized = description.trim();
        if (normalized.length() > DESCRIPTION_MAX_LENGTH) {
            throw new BusinessException(ErrorCode.PARAM_INVALID);
        }
        return normalized;
    }
}
