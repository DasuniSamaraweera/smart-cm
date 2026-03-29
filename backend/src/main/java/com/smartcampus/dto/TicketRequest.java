package com.smartcampus.dto;

import com.smartcampus.model.enums.TicketPriority;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TicketRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    private String category;

    private TicketPriority priority;

    private Long resourceId;

    private String contactEmail;

    private String contactPhone;
}
