package com.buyershow;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.buyershow.mapper")
public class BuyerShowApplication {
    public static void main(String[] args) {
        SpringApplication.run(BuyerShowApplication.class, args);
    }
}
