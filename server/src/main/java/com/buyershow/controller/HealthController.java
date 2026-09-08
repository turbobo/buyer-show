package com.buyershow.controller;

import com.buyershow.common.R;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

    @GetMapping("/health")
    public R<Map<String, Object>> health() {
        return R.ok(Map.of(
                "status", "UP",
                "service", "buyer-show-server",
                "time", LocalDateTime.now().toString()
        ));
    }
}
