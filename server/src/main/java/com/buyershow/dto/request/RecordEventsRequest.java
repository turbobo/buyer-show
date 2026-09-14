package com.buyershow.dto.request;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class RecordEventsRequest {
    private List<EventDTO> events;

    @Data
    public static class EventDTO {
        private String type;
        private Long userId;
        private Long postId;
        private Long commentId;
        private Long targetUserId;
        private String sessionId;
        private String referrer;
        private Map<String, Object> metadata;
    }
}
