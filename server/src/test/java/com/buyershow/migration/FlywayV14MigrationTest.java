package com.buyershow.migration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** V14 收藏夹迁移静态契约测试；真实 MySQL 迁移由 Docker 验证步骤覆盖。 */
class FlywayV14MigrationTest {

    @Test
    void testFavoriteFoldersSchema() throws IOException {
        String v14 = readMigration("/db/migration/V14__add_favorite_folders.sql");

        assertTrue(v14.contains("CREATE TABLE favorite_folders"));
        assertTrue(v14.contains("UNIQUE KEY uk_user_name (user_id, name)"));
        assertTrue(v14.contains("INDEX idx_user_folder (user_id, id)"));
        assertTrue(v14.contains("ADD COLUMN folder_id BIGINT UNSIGNED NULL"));
        assertTrue(v14.contains("ADD INDEX idx_user_folder_feed (user_id, folder_id, created_at DESC, id DESC)"));
        assertFalse(v14.contains("FOREIGN KEY"));
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
