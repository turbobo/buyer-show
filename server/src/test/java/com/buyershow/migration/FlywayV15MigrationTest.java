package com.buyershow.migration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** V15 评论盖楼迁移静态契约测试；真实 MySQL 迁移由 Docker 验证步骤覆盖。 */
class FlywayV15MigrationTest {

    @Test
    void testCommentReplyToSchema() throws IOException {
        String v15 = readMigration("/db/migration/V15__add_comment_reply_to.sql");

        assertTrue(v15.contains("ALTER TABLE comments"));
        assertTrue(v15.contains("ADD COLUMN reply_to_id BIGINT UNSIGNED NULL"));
        assertTrue(v15.contains("AFTER parent_id"));
        assertFalse(v15.contains("FOREIGN KEY"));
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
