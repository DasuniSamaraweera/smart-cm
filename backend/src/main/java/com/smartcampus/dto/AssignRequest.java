package com.smartcampus.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AssignRequest {
    @NotNull(message = "Assignee is required")
    private Long assigneeId;
}
