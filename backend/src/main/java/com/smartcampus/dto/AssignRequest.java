package com.smartcampus.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AssignRequest {
    private Long assigneeId;
}
