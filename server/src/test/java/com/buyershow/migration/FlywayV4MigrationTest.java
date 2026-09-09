package com.buyershow.migration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** V4/V5 静态迁移契约测试；真实 MySQL 迁移由 Docker 验证步骤覆盖。 */
class FlywayV4MigrationTest {

    @Test
    void testModerationSchemaAndHardeningMigrations() throws IOException {
        String v4 = readMigration("/db/migration/V4__add_content_moderation.sql");
        String v5 = readMigration("/db/migration/V5__harden_moderation_and_visibility.sql");

        assertTrue(v4.contains("ADD COLUMN moderation_status"));
        assertTrue(v4.contains("CREATE TABLE sensitive_words"));
        assertTrue(v4.contains("CREATE TABLE content_reports"));

        assertTrue(v5.contains("DEFAULT 1 COMMENT '审核状态"));
        assertTrue(v5.contains("chk_sensitive_word_nonempty"));
        assertTrue(v5.contains("uk_reporter_content"));
        assertTrue(v5.contains("idx_post_moderation_queue"));
        assertTrue(v5.contains("idx_comment_moderation_queue"));
        assertFalse(v5.contains("ADD UNIQUE KEY uk_reporter_content_reason"));
    }

    private String readMigration(String path) throws IOException {
        try (InputStream inputStream = getClass().getResourceAsStream(path)) {
            if (inputStream == null) {
                throw new IOException("Migration file not found: " + path);
            }
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
