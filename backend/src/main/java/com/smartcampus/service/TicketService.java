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
import com.smartcampus.repository.TicketCommentRepository;
import com.smartcampus.repository.TicketRepository;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
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
        
        saveAttachments(ticket, files);

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
        
        ticket.setStatus(statusUpdate.getStatus());
        if (statusUpdate.getStatus() == TicketStatus.REJECTED) {
            ticket.setRejectionReason(statusUpdate.getRejectionReason().trim());
            ticket.setResolutionNotes(null);
        } else {
            ticket.setRejectionReason(null);
            ticket.setResolutionNotes(statusUpdate.getResolutionNotes());
        }
        
        return mapToResponse(ticketRepository.save(ticket));
    }

    @Transactional
    public TicketResponse assignTicket(Long id, Long assigneeId) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));

        ticket.setAssignedTo(assignee);
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
        
        saveAttachments(ticket, files);
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

    private void saveAttachments(Ticket ticket, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return;
        try {
            for (MultipartFile file : files) {
                TicketAttachment attachment = TicketAttachment.builder()
                        .ticket(ticket)
                        .fileName(file.getOriginalFilename())
                        .fileType(file.getContentType())
                        .fileData(file.getBytes())
                        .build();
                ticket.getAttachments().add(attachment);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to store files", e);
        }
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
