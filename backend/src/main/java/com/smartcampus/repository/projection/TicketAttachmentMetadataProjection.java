package com.smartcampus.repository.projection;

import java.time.LocalDateTime;

public interface TicketAttachmentMetadataProjection {
    Long getId();
    String getFileName();
    String getFileType();
    LocalDateTime getUploadedAt();
}
