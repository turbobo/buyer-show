package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.response.PostDTO;
import com.buyershow.dto.response.PostQueryRow;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class PostAssembler {

    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {};

    private final ObjectMapper objectMapper;

    public PostDTO toPostDTO(PostQueryRow row) {
        List<String> images = parseStringList(row.getImagesJson());
        return PostDTO.builder()
                .id(row.getId())
                .userId(row.getUserId())
                .title(row.getTitle())
                .content(row.getContent())
                .images(images)
                .thumbnails(deriveThumbnails(images))
                .tags(parseStringList(row.getTagsJson()))
                .productName(row.getProductName())
                .productPrice(row.getProductPrice())
                .productSource(row.getProductSource())
                .productRating(row.getProductRating())
                .likeCount(row.getLikeCount())
                .commentCount(row.getCommentCount())
                .favoriteCount(row.getFavoriteCount())
                .moderationStatus(row.getModerationStatus())
                .appealStatus(row.getAppealStatus())
                .isLiked(row.getLiked() != null && row.getLiked() == 1)
                .isFavorited(row.getFavorited() != null && row.getFavorited() == 1)
                .createdAt(row.getCreatedAt())
                .userNickname(row.getUserNickname())
                .userAvatarUrl(row.getUserAvatarUrl())
                .build();
    }

    /**
     * 根据原图 URL 推导缩略图 URL。
     * 约定：published/xxx.jpg -> thumbnails/xxx.jpg
     */
    private List<String> deriveThumbnails(List<String> images) {
        if (images == null || images.isEmpty()) {
            return Collections.emptyList();
        }
        return images.stream()
                .map(url -> url.replace("/published/", "/thumbnails/"))
                .toList();
    }

    private List<String> parseStringList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, STRING_LIST_TYPE);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "帖子数据解析失败");
        }
    }
}
