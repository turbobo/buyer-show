package com.buyershow.controller;

import com.buyershow.common.R;
import com.buyershow.service.FollowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "关注管理")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @Operation(summary = "关注/取消关注用户")
    @PostMapping("/{userId}/follow")
    public R<Map<String, Boolean>> toggleFollow(@PathVariable Long userId) {
        boolean followed = followService.toggleFollow(userId);
        return R.ok(Map.of("followed", followed));
    }
}
