package com.smartcampus.dto;

import com.smartcampus.model.enums.TicketStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TicketStatusUpdate {

    @NotNull(message = "Status is required")
    private TicketStatus status;

    private String resolutionNotes;

    private String rejectionReason;
}
