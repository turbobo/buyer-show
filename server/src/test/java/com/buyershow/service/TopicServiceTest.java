package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.response.TopicDTO;
import com.buyershow.entity.Topic;
import com.buyershow.mapper.TopicMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 运营话题服务测试（G10）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
class TopicServiceTest {

    private final TopicMapper topicMapper = mock(TopicMapper.class);
    private final TopicService service = new TopicService(topicMapper);

    @Test
    void testCreateTopicInsertsWithDefaults() {
        when(topicMapper.countByName("咖啡店", null)).thenReturn(0);
        when(topicMapper.insert(any(Topic.class))).thenReturn(1);

        TopicDTO dto = service.create(" 咖啡店 ", null, "  ", null);

        assertEquals("咖啡店", dto.getName());
        assertNull(dto.getCoverUrl());
        assertNull(dto.getDescription());
        assertEquals(0, dto.getSortOrder());
        assertEquals(0, dto.getStatus());
        assertEquals(0L, dto.getPostCount());
        verify(topicMapper).insert(any(Topic.class));
    }

    @Test
    void testCreateTopicRejectsDuplicateName() {
        when(topicMapper.countByName("咖啡店", null)).thenReturn(1);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.create("咖啡店", null, null, 0));
        assertEquals(ErrorCode.TOPIC_NAME_EXISTS.getCode(), exception.getCode());
        verify(topicMapper, never()).insert(any(Topic.class));
    }

    @Test
    void testCreateTopicRejectsOverlongName() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.create("a".repeat(21), null, null, 0));
        assertEquals(ErrorCode.PARAM_INVALID.getCode(), exception.getCode());
    }

    @Test
    void testCreateTopicRejectsBlankName() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.create("   ", null, null, 0));
        assertEquals(ErrorCode.PARAM_MISSING.getCode(), exception.getCode());
    }

    @Test
    void testListActiveAttachesPostCounts() {
        when(topicMapper.selectActiveTopics()).thenReturn(List.of(
                topic(1L, "咖啡店", 0), topic(2L, "美食探店", 0)));
        when(topicMapper.countPostsByTags()).thenReturn(List.of(
                Map.of("tag", "咖啡店", "postCount", 5L),
                Map.of("tag", "孤立标签", "postCount", 9L)));

        List<TopicDTO> result = service.listActive();

        assertEquals(2, result.size());
        assertEquals(5L, result.get(0).getPostCount());
        assertEquals(0L, result.get(1).getPostCount());
    }

    @Test
    void testUpdateTopicChangesStatusAndName() {
        Topic existing = topic(1L, "旧话题", 0);
        when(topicMapper.selectById(1L)).thenReturn(existing);
        when(topicMapper.countByName("新话题", 1L)).thenReturn(0);
        when(topicMapper.updateById(existing)).thenReturn(1);
        when(topicMapper.countPostsByName("新话题")).thenReturn(3);

        TopicDTO dto = service.update(1L, "新话题", "", "新描述", 5, 1);

        assertEquals("新话题", dto.getName());
        assertNull(dto.getCoverUrl());
        assertEquals("新描述", dto.getDescription());
        assertEquals(5, dto.getSortOrder());
        assertEquals(1, dto.getStatus());
        assertEquals(3L, dto.getPostCount());
        verify(topicMapper).updateById(existing);
    }

    @Test
    void testUpdateTopicRejectsNameCollision() {
        Topic existing = topic(1L, "旧话题", 0);
        when(topicMapper.selectById(1L)).thenReturn(existing);
        when(topicMapper.countByName("被占用", 1L)).thenReturn(1);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.update(1L, "被占用", null, null, null, null));
        assertEquals(ErrorCode.TOPIC_NAME_EXISTS.getCode(), exception.getCode());
        verify(topicMapper, never()).updateById(any(Topic.class));
    }

    @Test
    void testGetTopicRejectsInactiveTopic() {
        when(topicMapper.selectById(1L)).thenReturn(topic(1L, "停用话题", 1));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.getTopic(1L));
        assertEquals(ErrorCode.TOPIC_NOT_FOUND.getCode(), exception.getCode());
    }

    @Test
    void testDeleteMissingTopicThrows() {
        when(topicMapper.selectById(99L)).thenReturn(null);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.delete(99L));
        assertEquals(ErrorCode.TOPIC_NOT_FOUND.getCode(), exception.getCode());
        verify(topicMapper, never()).deleteById(any(Long.class));
    }

    private Topic topic(Long id, String name, int status) {
        Topic topic = new Topic();
        topic.setId(id);
        topic.setName(name);
        topic.setSortOrder(0);
        topic.setStatus(status);
        return topic;
    }
}
