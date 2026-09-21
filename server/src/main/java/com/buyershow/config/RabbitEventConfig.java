package com.buyershow.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.AnonymousQueue;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.FanoutExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 实时事件总线配置（G11）：fanout exchange + 每实例匿名 auto-delete 队列。
 * 事件发布到 exchange 后广播到所有实例的匿名队列，各实例消费后推送给本地 STOMP 连接。
 * 为将来多实例水平扩展铺路；单实例下同样工作。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Configuration
public class RabbitEventConfig {

    public static final String EVENT_EXCHANGE = "buyershow.events";

    @Bean
    public FanoutExchange eventExchange() {
        return new FanoutExchange(EVENT_EXCHANGE, true, false);
    }

    /** 每实例一个匿名队列（auto-delete），随实例销毁自动清理。 */
    @Bean
    public Queue eventQueue() {
        return new AnonymousQueue();
    }

    @Bean
    public Binding eventBinding(Queue eventQueue, FanoutExchange eventExchange) {
        return BindingBuilder.bind(eventQueue).to(eventExchange);
    }

    /** 全局消息转换器：JSON 序列化（复用 Spring ObjectMapper，日期格式与 REST 一致）。 */
    @Bean
    public MessageConverter rabbitMessageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }
}
