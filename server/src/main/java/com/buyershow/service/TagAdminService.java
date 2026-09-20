package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.common.security.SecurityUtils;
import com.buyershow.dto.request.TagOperationRequest;
import com.buyershow.dto.response.TagStatDTO;
import com.buyershow.entity.Post;
import com.buyershow.mapper.PostMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 标签管理：聚合统计与重命名/合并/删除（基于 posts.tags JSON 列）。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TagAdminService {

    private static final int MAX_TAG_LENGTH = 20;
    private static final int MAX_TAG_RESULTS = 200;

    private final PostMapper postMapper;
    private final AdminAuditService adminAuditService;
    private final ObjectMapper objectMapper;

    /**
     * 标签聚合统计（按使用量倒序，可按关键词过滤）。
     *
     * @param keyword 关键词（可空）
     * @param limit 数量上限
     * @return 标签统计列表
     */
    public List<TagStatDTO> listTags(String keyword, int limit) {
        requireAdmin();
        int safeLimit = Math.min(Math.max(limit, 1), MAX_TAG_RESULTS);
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return postMapper.selectTagStats(normalizedKeyword, safeLimit);
    }

    /**
     * 重命名标签（替换 + 同帖保序去重）。
     *
     * @param request source 原标签 / target 新标签
     * @return 受影响帖子数
     */
    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    public int renameTag(TagOperationRequest request) {
        Long adminId = requireAdmin();
        String source = normalizeTag(request.getSource());
        String target = requireTarget(request.getTarget());
        if (source.equals(target)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "新标签与原名相同");
        }
        int affected = replaceTag(source, target);
        adminAuditService.log(adminId, "RENAME_TAG", "TAG", 0L,
                String.format("「%s」→「%s」（影响 %d 篇）", source, target, affected));
        return affected;
    }

    /**
     * 合并标签到目标标签（源移除，目标保留；同帖去重）。
     *
     * @param request source 被合并标签 / target 目标标签
     * @return 受影响帖子数
     */
    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    public int mergeTag(TagOperationRequest request) {
        Long adminId = requireAdmin();
        String source = normalizeTag(request.getSource());
        String target = requireTarget(request.getTarget());
        if (source.equals(target)) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "目标标签与来源相同");
        }
        int affected = replaceTag(source, target);
        adminAuditService.log(adminId, "MERGE_TAG", "TAG", 0L,
                String.format("「%s」并入「%s」（影响 %d 篇）", source, target, affected));
        return affected;
    }

    /**
     * 删除标签（从所有帖子中移除）。
     *
     * @param request source 标签名
     * @return 受影响帖子数
     */
    @Transactional
    @CacheEvict(cacheNames = "feed:anonymous", allEntries = true)
    public int deleteTag(TagOperationRequest request) {
        Long adminId = requireAdmin();
        String source = normalizeTag(request.getSource());
        List<Post> posts = postMapper.selectPostsWithTag(source);
        int affected = 0;
        for (Post post : posts) {
            List<String> updated = post.getTags().stream()
                    .filter(tag -> !source.equals(tag))
                    .toList();
            updatePostTags(post.getId(), new ArrayList<>(updated));
            affected++;
        }
        adminAuditService.log(adminId, "DELETE_TAG", "TAG", 0L,
                String.format("「%s」（影响 %d 篇）", source, affected));
        return affected;
    }

    /** 替换 + 同帖保序去重（重命名与合并共用）。 */
    private int replaceTag(String source, String target) {
        List<Post> posts = postMapper.selectPostsWithTag(source);
        int affected = 0;
        for (Post post : posts) {
            List<String> updated = new ArrayList<>();
            for (String tag : post.getTags()) {
                String value = source.equals(tag) ? target : tag;
                if (!updated.contains(value)) {
                    updated.add(value);
                }
            }
            updatePostTags(post.getId(), updated);
            affected++;
        }
        return affected;
    }

    private void updatePostTags(Long postId, List<String> tags) {
        try {
            postMapper.updatePostTags(postId, objectMapper.writeValueAsString(tags));
        } catch (JsonProcessingException exception) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "标签格式错误");
        }
    }

    private String normalizeTag(String tag) {
        String value = tag == null ? "" : tag.trim();
        if (value.isEmpty() || value.length() > MAX_TAG_LENGTH) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "标签需为 1-20 个字符");
        }
        return value;
    }

    private String requireTarget(String target) {
        if (target == null || target.isBlank()) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "新标签不能为空");
        }
        return normalizeTag(target);
    }

    private Long requireAdmin() {
        Long adminId = SecurityUtils.getCurrentUserId();
        if (adminId == null || !SecurityUtils.isAdmin()) {
            throw new BusinessException(ErrorCode.NO_PERMISSION);
        }
        return adminId;
    }
}
