package com.buyershow.migration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** V16 运营位与话题运营迁移静态契约测试；真实 MySQL 迁移由 Docker 验证步骤覆盖。 */
class FlywayV16MigrationTest {

    @Test
    void testOperationsSchema() throws IOException {
        String v16 = readMigration("/db/migration/V16__add_operations.sql");

        assertTrue(v16.contains("CREATE TABLE site_banners"));
        assertTrue(v16.contains("link_type VARCHAR(20)"));
        assertTrue(v16.contains("CREATE TABLE topics"));
        assertTrue(v16.contains("UNIQUE KEY uk_name (name)"));
        assertTrue(v16.contains("ALTER TABLE posts"));
        assertTrue(v16.contains("ADD COLUMN is_featured TINYINT NOT NULL DEFAULT 0"));
        assertTrue(v16.contains("INDEX idx_featured"));
        assertFalse(v16.contains("FOREIGN KEY"));
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
