package com.smartcampus.dto;

import com.smartcampus.model.enums.NotificationType;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class NotificationResponse {
    private Long id;
    private String message;
    private NotificationType type;
    private boolean read;
    private Long referenceId;
    private LocalDateTime createdAt;
}
