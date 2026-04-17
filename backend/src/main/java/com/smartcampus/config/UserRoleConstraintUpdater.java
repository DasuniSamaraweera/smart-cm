package com.smartcampus.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserRoleConstraintUpdater {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureLecturerRoleConstraint() {
        try {
            String version = jdbcTemplate.queryForObject("select version()", String.class);
            if (version == null || !version.toLowerCase().contains("postgresql")) {
                return;
            }

            List<Map<String, Object>> constraints = jdbcTemplate.queryForList(
                    """
                    SELECT c.conname AS name, pg_get_constraintdef(c.oid) AS definition
                    FROM pg_constraint c
                    JOIN pg_class t ON c.conrelid = t.oid
                    WHERE t.relname = 'users' AND c.contype = 'c'
                    """
            );

            for (Map<String, Object> row : constraints) {
                String name = String.valueOf(row.get("name"));
                String definition = String.valueOf(row.get("definition"));
                if (definition != null && definition.toLowerCase().contains("role")) {
                    String safeName = name.replace("\"", "\"\"");
                    jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS \"" + safeName + "\"");
                }
            }

            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            jdbcTemplate.execute(
                    "ALTER TABLE users ADD CONSTRAINT users_role_check "
                            + "CHECK (role IN ('USER','ADMIN','TECHNICIAN','LECTURER'))"
            );
        } catch (Exception ex) {
            log.warn("Could not update users.role constraint for lecturer role support: {}", ex.getMessage());
        }
    }
}
