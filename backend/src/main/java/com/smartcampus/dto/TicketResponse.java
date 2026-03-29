package com.smartcampus.dto;

import com.smartcampus.model.enums.TicketPriority;
import com.smartcampus.model.enums.TicketStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TicketResponse {
    private Long id;
    private String title;
    private String description;
    private String category;
    private TicketPriority priority;
    private TicketStatus status;
    private ResourceResponse resource;
    private UserDTO reporter;
    private UserDTO assignedTo;
    private String contactEmail;
    private String contactPhone;
    private String resolutionNotes;
    private String rejectionReason;
    private List<AttachmentResponse> attachments;
    private List<CommentResponse> comments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
