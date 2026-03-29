package com.smartcampus.dto;

import com.smartcampus.model.enums.BookingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class BookingStatusUpdate {

    @NotNull(message = "Status is required")
    private BookingStatus status;

    private String reason;
}
