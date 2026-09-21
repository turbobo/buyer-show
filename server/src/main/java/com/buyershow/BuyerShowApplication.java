package com.buyershow;

import com.buyershow.service.PostSearchIndexService;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@MapperScan("com.buyershow.mapper")
@EnableAsync
public class BuyerShowApplication {
    public static void main(String[] args) {
        SpringApplication.run(BuyerShowApplication.class, args);
    }

    /**
     * G5：启动时确保 ES 索引存在（不存在则创建并全量重建）；
     * ES 不可用时仅告警跳过，搜索自动降级 MySQL LIKE。
     */
    @Bean
    public ApplicationRunner searchIndexInitializer(PostSearchIndexService service) {
        return args -> service.ensureIndexOnStartup();
    }
}
