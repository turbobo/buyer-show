package com.buyershow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.buyershow.entity.Topic;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface TopicMapper extends BaseMapper<Topic> {

    /** 启用中的话题（按排序升序）。 */
    @Select("SELECT id, name, cover_url AS coverUrl, description, sort_order AS sortOrder, " +
            "status, created_at AS createdAt, updated_at AS updatedAt " +
            "FROM topics WHERE status = 0 ORDER BY sort_order ASC, id ASC")
    List<Topic> selectActiveTopics();

    /** 全部话题（管理端，按排序升序）。 */
    @Select("SELECT id, name, cover_url AS coverUrl, description, sort_order AS sortOrder, " +
            "status, created_at AS createdAt, updated_at AS updatedAt " +
            "FROM topics ORDER BY sort_order ASC, id ASC")
    List<Topic> selectAllTopics();

    /** 同名词条计数（排除指定 id，用于查重）。 */
    @Select("<script>SELECT COUNT(*) FROM topics WHERE name = #{name}" +
            "<if test='excludeId != null'> AND id != #{excludeId}</if>" +
            "</script>")
    int countByName(@Param("name") String name, @Param("excludeId") Long excludeId);

    /** 话题帖子数（含待审，运营侧口径：全部未删除帖子）。 */
    @Select("SELECT COUNT(*) FROM posts WHERE status = 0 AND JSON_CONTAINS(tags, JSON_QUOTE(#{name}))")
    int countPostsByName(@Param("name") String name);

    /** 各话题帖子数映射（topicName -> postCount）。 */
    @Select("SELECT jt.tag AS tag, COUNT(*) AS postCount " +
            "FROM posts p JOIN JSON_TABLE(p.tags, '$[*]' COLUMNS (tag VARCHAR(50) PATH '$')) jt " +
            "WHERE p.status = 0 GROUP BY jt.tag")
    List<Map<String, Object>> countPostsByTags();
}
