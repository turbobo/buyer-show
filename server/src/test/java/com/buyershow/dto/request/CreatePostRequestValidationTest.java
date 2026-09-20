package com.buyershow.dto.request;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * CreatePostRequest 参数校验测试（G2 多图发布）。
 *
 * @author qoder
 * @since 2026/09/20
 */
class CreatePostRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static CreatePostRequest validRequest(int imageCount) {
        CreatePostRequest request = new CreatePostRequest();
        request.setTitle("测试标题");
        request.setContent("这是正文内容，至少十个字符的长度要求");
        List<String> images = new ArrayList<>();
        for (int i = 0; i < imageCount; i++) {
            images.add("pending/1/2026/9/img" + i + ".png");
        }
        request.setImages(images);
        return request;
    }

    @Test
    void testSingleImagePasses() {
        Set<ConstraintViolation<CreatePostRequest>> violations = validator.validate(validRequest(1));

        assertTrue(violations.isEmpty());
    }

    @Test
    void testMaxImagesPasses() {
        Set<ConstraintViolation<CreatePostRequest>> violations =
                validator.validate(validRequest(CreatePostRequest.MAX_POST_IMAGES));

        assertTrue(violations.isEmpty());
    }

    @Test
    void testOverMaxImagesRejected() {
        Set<ConstraintViolation<CreatePostRequest>> violations =
                validator.validate(validRequest(CreatePostRequest.MAX_POST_IMAGES + 1));

        assertEquals(1, violations.size());
        assertEquals("images", violations.iterator().next().getPropertyPath().toString());
    }

    @Test
    void testEmptyImagesRejected() {
        CreatePostRequest request = validRequest(0);

        Set<ConstraintViolation<CreatePostRequest>> violations = validator.validate(request);

        assertTrue(violations.stream().anyMatch(v -> "images".equals(v.getPropertyPath().toString())));
    }
}
