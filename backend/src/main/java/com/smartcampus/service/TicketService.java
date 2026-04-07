package com.smartcampus.service;

import com.smartcampus.dto.*;
import com.smartcampus.exception.BadRequestException;
import com.smartcampus.exception.ForbiddenException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.exception.UnauthorizedException;
import com.smartcampus.model.*;
import com.smartcampus.model.enums.TicketPriority;
import com.smartcampus.model.enums.TicketStatus;
import com.smartcampus.model.enums.UserRole;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.repository.TicketAttachmentRepository;
import com.smartcampus.repository.TicketCommentRepository;
import com.smartcampus.repository.TicketRepository;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketService {

    private static final int MAX_ATTACHMENTS_PER_TICKET = 3;
    private static final long MAX_ATTACHMENT_SIZE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
    );

    private final TicketRepository ticketRepository;
    private final TicketAttachmentRepository ticketAttachmentRepository;
    private final TicketCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final CurrentUser currentUser;

    @Transactional
    public TicketResponse createTicket(TicketRequest request, List<MultipartFile> files) {
        User reporter = requireUserEntity();

        Resource resource = null;
        if (request.getResourceId() != null) {
            resource = resourceRepository.findById(request.getResourceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        }

        Ticket ticket = Ticket.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .priority(request.getPriority())
                .contactEmail(request.getContactEmail())
                .contactPhone(request.getContactPhone())
                .status(TicketStatus.OPEN)
                .reporter(reporter)
                .resource(resource)
                .build();
        
            saveAttachments(ticket, files, 0);

        return mapToResponse(ticketRepository.save(ticket));
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getMyTickets() {
        Long userId = requireUserId();
        return ticketRepository.findByReporterId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> getTickets(TicketStatus status,
                                          TicketPriority priority,
                                          Long reporterId,
                                          Long assignedToId) {
        User user = requireUser();

        if (user.getRole() == UserRole.ADMIN) {
            return ticketRepository.findWithFilters(status, priority, reporterId, assignedToId)
                    .stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        if (user.getRole() == UserRole.TECHNICIAN) {
            // Technicians can only view tickets assigned to them.
            return ticketRepository.findWithFilters(status, priority, null, user.getId())
                    .stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        throw new ForbiddenException("Not authorized to view all tickets");
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketById(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
        assertCanView(ticket);
        return mapToResponse(ticket);
    }

    @Transactional
    public TicketResponse updateStatus(Long id, TicketStatusUpdate statusUpdate) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        User user = assertCanManage(ticket);
        validateStatusTransition(ticket.getStatus(), statusUpdate.getStatus(), user, statusUpdate.getRejectionReason());
        String incomingResolutionNotes = statusUpdate.getResolutionNotes();
        
        ticket.setStatus(statusUpdate.getStatus());
        if (statusUpdate.getStatus() == TicketStatus.REJECTED) {
            ticket.setRejectionReason(statusUpdate.getRejectionReason().trim());
            ticket.setResolutionNotes(null);
        } else {
            ticket.setRejectionReason(null);
            if (incomingResolutionNotes != null) {
                ticket.setResolutionNotes(incomingResolutionNotes);
            }
        }
        
        return mapToResponse(ticketRepository.save(ticket));
    }

    @Transactional
    public TicketResponse assignTicket(Long id, Long assigneeId) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));

        if (assignee.getRole() != UserRole.TECHNICIAN) {
            throw new BadRequestException("Ticket can only be assigned to a technician");
        }
        if (ticket.getStatus() == TicketStatus.CLOSED || ticket.getStatus() == TicketStatus.REJECTED) {
            throw new BadRequestException("Cannot assign a ticket that is already " + ticket.getStatus());
        }

        ticket.setAssignedTo(assignee);
        if (ticket.getStatus() == TicketStatus.OPEN) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }
        return mapToResponse(ticketRepository.save(ticket));
    }

    @Transactional
    public CommentResponse addComment(Long ticketId, CommentRequest request) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
        assertCanView(ticket);
        User author = requireUserEntity();

        TicketComment comment = TicketComment.builder()
                .content(request.getContent())
                .ticket(ticket)
                .author(author)
                .build();
        return mapCommentToResponse(commentRepository.save(comment));
    }

    @Transactional
    public CommentResponse updateComment(Long commentId, CommentRequest request) {
        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        Long userId = requireUserId();
        if (!comment.getAuthor().getId().equals(userId)) {
            throw new ForbiddenException("Only the author can edit this comment");
        }
        
        comment.setContent(request.getContent());
        return mapCommentToResponse(commentRepository.save(comment));
    }

    @Transactional
    public void deleteComment(Long commentId) {
        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        Long userId = requireUserId();
        if (!comment.getAuthor().getId().equals(userId) && !currentUser.isAdmin()) {
            throw new ForbiddenException("Not authorized to delete this comment");
        }
        commentRepository.delete(comment);
    }

    @Transactional
    public List<AttachmentResponse> addAttachments(Long ticketId, List<MultipartFile> files) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        assertCanView(ticket);
        
        long existingAttachmentCount = ticketAttachmentRepository.countByTicketId(ticketId);
        saveAttachments(ticket, files, existingAttachmentCount);
        ticketRepository.save(ticket);
        
        return ticket.getAttachments().stream().map(this::mapAttachmentToResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deleteTicket(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        User user = requireUser();
        boolean isReporter = ticket.getReporter() != null && ticket.getReporter().getId().equals(user.getId());

        if (user.getRole() == UserRole.ADMIN) {
            ticketRepository.delete(ticket);
            return;
        }

        // Reporter can delete only while still OPEN.
        if (isReporter && ticket.getStatus() == TicketStatus.OPEN) {
            ticketRepository.delete(ticket);
            return;
        }

        throw new ForbiddenException("Not authorized to delete this ticket");
    }

    private Long requireUserId() {
        Long userId = currentUser.getId();
        if (userId == null) {
            throw new UnauthorizedException("Not authenticated");
        }
        return userId;
    }

    private User requireUser() {
        User user = currentUser.get();
        if (user == null || user.getId() == null) {
            throw new UnauthorizedException("Not authenticated");
        }
        return user;
    }

    private User requireUserEntity() {
        Long userId = requireUserId();
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private void assertCanView(Ticket ticket) {
        User user = requireUser();
        if (user.getRole() == UserRole.ADMIN) return;

        if (user.getRole() == UserRole.TECHNICIAN) {
            if (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(user.getId())) return;
            throw new ForbiddenException("Not authorized to view this ticket");
        }

        if (ticket.getReporter() != null && ticket.getReporter().getId().equals(user.getId())) return;
        throw new ForbiddenException("Not authorized to view this ticket");
    }

    private User assertCanManage(Ticket ticket) {
        User user = requireUser();
        if (user.getRole() == UserRole.ADMIN) return user;
        if (user.getRole() == UserRole.TECHNICIAN) {
            if (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(user.getId())) return user;
        }
        throw new ForbiddenException("Not authorized to manage this ticket");
    }

    private void validateStatusTransition(TicketStatus currentStatus,
                                          TicketStatus requestedStatus,
                                          User actor,
                                          String rejectionReason) {
        if (currentStatus == requestedStatus) {
            if (requestedStatus == TicketStatus.REJECTED && isBlank(rejectionReason)) {
                throw new BadRequestException("Rejection reason is required when status is REJECTED");
            }
            return;
        }

        if (requestedStatus == TicketStatus.REJECTED) {
            if (actor.getRole() != UserRole.ADMIN) {
                throw new ForbiddenException("Only admins can reject tickets");
            }
            if (isBlank(rejectionReason)) {
                throw new BadRequestException("Rejection reason is required when status is REJECTED");
            }
            if (currentStatus == TicketStatus.CLOSED || currentStatus == TicketStatus.REJECTED) {
                throw new BadRequestException("Cannot reject a ticket that is already " + currentStatus);
            }
            return;
        }

        if (requestedStatus == TicketStatus.CLOSED && actor.getRole() != UserRole.ADMIN) {
            throw new ForbiddenException("Only admins can close tickets");
        }

        boolean validWorkflowTransition =
                (currentStatus == TicketStatus.OPEN && requestedStatus == TicketStatus.IN_PROGRESS)
                        || (currentStatus == TicketStatus.IN_PROGRESS && requestedStatus == TicketStatus.RESOLVED)
                        || (currentStatus == TicketStatus.RESOLVED && requestedStatus == TicketStatus.CLOSED);

        if (!validWorkflowTransition) {
            throw new BadRequestException("Invalid ticket status transition from " + currentStatus + " to " + requestedStatus);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void saveAttachments(Ticket ticket, List<MultipartFile> files, long existingAttachmentCount) {
        if (files == null || files.isEmpty()) {
            return;
        }

        List<MultipartFile> nonNullFiles = files.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (nonNullFiles.isEmpty()) {
            return;
        }

        if (existingAttachmentCount + nonNullFiles.size() > MAX_ATTACHMENTS_PER_TICKET) {
            throw new BadRequestException("A ticket can include up to " + MAX_ATTACHMENTS_PER_TICKET + " image attachments");
        }

        for (MultipartFile file : nonNullFiles) {
            String safeFileName = sanitizeFileName(file.getOriginalFilename());
            byte[] fileData = readFileBytes(file, safeFileName);
            String resolvedFileType = validateAndResolveImageType(file, fileData, safeFileName);

            TicketAttachment attachment = TicketAttachment.builder()
                    .ticket(ticket)
                    .fileName(safeFileName)
                    .fileType(resolvedFileType)
                    .fileData(fileData)
                    .build();

            ticket.getAttachments().add(attachment);
        }
    }

    private byte[] readFileBytes(MultipartFile file, String safeFileName) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("Failed to process attachment '" + safeFileName + "'");
        }
    }

    private String validateAndResolveImageType(MultipartFile file, byte[] fileData, String safeFileName) {
        if (file.isEmpty() || fileData.length == 0) {
            throw new BadRequestException("Attachment '" + safeFileName + "' is empty");
        }

        if (fileData.length > MAX_ATTACHMENT_SIZE_BYTES) {
            throw new BadRequestException("Attachment '" + safeFileName + "' exceeds the maximum size of 5MB");
        }

        String providedType = normalizeContentType(file.getContentType());
        if (!providedType.isBlank() && !ALLOWED_IMAGE_CONTENT_TYPES.contains(providedType)) {
            throw new BadRequestException("Only JPG, PNG, GIF, and WEBP images are allowed");
        }

        String detectedType = detectImageContentType(fileData);
        if (detectedType == null) {
            throw new BadRequestException("Attachment '" + safeFileName + "' is not a valid image file");
        }

        if (!providedType.isBlank() && !providedType.equals(detectedType)) {
            throw new BadRequestException("Attachment '" + safeFileName + "' type does not match file content");
        }

        validateFileExtension(safeFileName, detectedType);
        return detectedType;
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }

        String normalized = contentType.split(";")[0].trim().toLowerCase(Locale.ROOT);
        if ("image/jpg".equals(normalized)) {
            return "image/jpeg";
        }
        return normalized;
    }

    private String sanitizeFileName(String originalFileName) {
        String cleaned = StringUtils.cleanPath(originalFileName == null ? "" : originalFileName.trim());
        String safe = cleaned.replace("\\", "/");

        int lastSlash = safe.lastIndexOf('/');
        if (lastSlash >= 0) {
            safe = safe.substring(lastSlash + 1);
        }

        safe = safe.replaceAll("[\\r\\n]", "");

        if (safe.contains("..")) {
            throw new BadRequestException("Invalid attachment file name");
        }

        if (safe.isBlank()) {
            safe = "attachment";
        }

        if (safe.length() > 255) {
            int extensionIndex = safe.lastIndexOf('.');
            if (extensionIndex > 0 && extensionIndex < safe.length() - 1) {
                String extension = safe.substring(extensionIndex);
                int baseLength = Math.max(1, 255 - extension.length());
                safe = safe.substring(0, baseLength) + extension;
            } else {
                safe = safe.substring(0, 255);
            }
        }

        return safe;
    }

    private void validateFileExtension(String fileName, String detectedType) {
        String extension = extractExtension(fileName);
        if (extension.isEmpty()) {
            return;
        }

        boolean valid = switch (detectedType) {
            case "image/jpeg" -> extension.equals("jpg") || extension.equals("jpeg");
            case "image/png" -> extension.equals("png");
            case "image/gif" -> extension.equals("gif");
            case "image/webp" -> extension.equals("webp");
            default -> false;
        };

        if (!valid) {
            throw new BadRequestException("Attachment '" + fileName + "' has an invalid file extension");
        }
    }

    private String extractExtension(String fileName) {
        int index = fileName.lastIndexOf('.');
        if (index < 0 || index == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(index + 1).toLowerCase(Locale.ROOT);
    }

    private String detectImageContentType(byte[] data) {
        if (isJpeg(data)) return "image/jpeg";
        if (isPng(data)) return "image/png";
        if (isGif(data)) return "image/gif";
        if (isWebp(data)) return "image/webp";
        return null;
    }

    private boolean isJpeg(byte[] data) {
        return data.length >= 3
                && (data[0] & 0xFF) == 0xFF
                && (data[1] & 0xFF) == 0xD8
                && (data[2] & 0xFF) == 0xFF;
    }

    private boolean isPng(byte[] data) {
        return data.length >= 8
                && (data[0] & 0xFF) == 0x89
                && data[1] == 0x50
                && data[2] == 0x4E
                && data[3] == 0x47
                && data[4] == 0x0D
                && data[5] == 0x0A
                && data[6] == 0x1A
                && data[7] == 0x0A;
    }

    private boolean isGif(byte[] data) {
        return data.length >= 6
                && data[0] == 'G'
                && data[1] == 'I'
                && data[2] == 'F'
                && data[3] == '8'
                && (data[4] == '7' || data[4] == '9')
                && data[5] == 'a';
    }

    private boolean isWebp(byte[] data) {
        return data.length >= 12
                && data[0] == 'R'
                && data[1] == 'I'
                && data[2] == 'F'
                && data[3] == 'F'
                && data[8] == 'W'
                && data[9] == 'E'
                && data[10] == 'B'
                && data[11] == 'P';
    }

    private UserDTO mapUserToDTO(User user) {
        if (user == null) return null;
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private CommentResponse mapCommentToResponse(TicketComment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .author(mapUserToDTO(comment.getAuthor()))
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    private AttachmentResponse mapAttachmentToResponse(TicketAttachment attachment) {
        return AttachmentResponse.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .fileType(attachment.getFileType())
                .uploadedAt(attachment.getUploadedAt())
                .build();
    }

    private TicketResponse mapToResponse(Ticket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .title(ticket.getTitle())
                .description(ticket.getDescription())
                .category(ticket.getCategory())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .reporter(mapUserToDTO(ticket.getReporter()))
                .assignedTo(mapUserToDTO(ticket.getAssignedTo()))
                .contactEmail(ticket.getContactEmail())
                .contactPhone(ticket.getContactPhone())
                .resolutionNotes(ticket.getResolutionNotes())
                .rejectionReason(ticket.getRejectionReason())
                .attachments(ticket.getAttachments() != null ? ticket.getAttachments().stream().map(this::mapAttachmentToResponse).collect(Collectors.toList()) : null)
                .comments(ticket.getComments() != null ? ticket.getComments().stream().map(this::mapCommentToResponse).collect(Collectors.toList()) : null)
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }
}
