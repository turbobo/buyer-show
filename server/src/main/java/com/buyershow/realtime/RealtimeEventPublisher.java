package com.buyershow.realtime;

import com.buyershow.config.RabbitEventConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 实时事件发布器（G11）：业务事务内直接发布，内部吞异常保证推送失败不影响业务。
 * 前端 15s/5s 轮询作为降级兜底，事件丢失可被轮询幂等校准。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimeEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publish(RealtimeEvent event) {
        try {
            rabbitTemplate.convertAndSend(RabbitEventConfig.EVENT_EXCHANGE, "", event);
        } catch (Exception e) {
            log.warn("Failed to publish realtime event: type={}, error={}", event.getType(), e.getMessage());
        }
    }
}
