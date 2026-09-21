package com.buyershow.migration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** V13 拉黑表静态迁移契约测试；真实 MySQL 迁移由 Docker 验证步骤覆盖。 */
class FlywayV13MigrationTest {

    @Test
    void testUserBlocksSchema() throws IOException {
        String v13 = readMigration("/db/migration/V13__add_user_blocks.sql");

        assertTrue(v13.contains("CREATE TABLE user_blocks"));
        assertTrue(v13.contains("blocker_id BIGINT UNSIGNED NOT NULL"));
        assertTrue(v13.contains("blocked_id BIGINT UNSIGNED NOT NULL"));
        assertTrue(v13.contains("UNIQUE KEY uk_blocker_blocked (blocker_id, blocked_id)"));
        assertTrue(v13.contains("INDEX idx_blocked (blocked_id)"));
        assertFalse(v13.contains("FOREIGN KEY"));
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
