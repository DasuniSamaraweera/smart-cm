package com.smartcampus.controller;

import com.smartcampus.dto.*;
import com.smartcampus.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(
            @Valid @RequestPart("ticket") TicketRequest request,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.createTicket(request, files));
    }

    @GetMapping("/my")
    public ResponseEntity<List<TicketSummaryResponse>> getMyTickets(
            @RequestParam(value = "status", required = false) com.smartcampus.model.enums.TicketStatus status,
            @RequestParam(value = "priority", required = false) com.smartcampus.model.enums.TicketPriority priority,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(ticketService.getMyTickets(status, priority, page, size));
    }

    @GetMapping
    public ResponseEntity<List<TicketSummaryResponse>> getTickets(
            @RequestParam(value = "my", required = false) Boolean my,
            @RequestParam(value = "status", required = false) com.smartcampus.model.enums.TicketStatus status,
            @RequestParam(value = "priority", required = false) com.smartcampus.model.enums.TicketPriority priority,
            @RequestParam(value = "reporterId", required = false) Long reporterId,
            @RequestParam(value = "assignedToId", required = false) Long assignedToId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        if (Boolean.TRUE.equals(my)) {
            return ResponseEntity.ok(ticketService.getMyTickets(status, priority, page, size));
        }
        return ResponseEntity.ok(ticketService.getTickets(status, priority, reporterId, assignedToId, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicketById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<TicketResponse> updateStatus(@PathVariable Long id, @Valid @RequestBody TicketStatusUpdate statusUpdate) {
        return ResponseEntity.ok(ticketService.updateStatus(id, statusUpdate));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TicketResponse> assignTicket(@PathVariable Long id, @Valid @RequestBody AssignRequest assignRequest) {
        return ResponseEntity.ok(ticketService.assignTicket(id, assignRequest.getAssigneeId()));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable Long id, 
            @Valid @RequestBody CommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.addComment(id, request));
    }

    @PutMapping("/{ticketId}/comments/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable Long ticketId,
            @PathVariable Long commentId,
            @Valid @RequestBody CommentRequest request) {
        // ticketId is included for REST shape; authorization is handled by service.
        return ResponseEntity.ok(ticketService.updateComment(commentId, request));
    }

    @PostMapping("/{id}/attachments")
    public ResponseEntity<List<AttachmentResponse>> addAttachments(
            @PathVariable Long id,
            @RequestPart("files") List<MultipartFile> files) {
        return ResponseEntity.ok(ticketService.addAttachments(id, files));
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long id,
            @PathVariable Long commentId) {
        // ID is not actually needed since we use commentId directly now
        ticketService.deleteComment(commentId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id) {
        ticketService.deleteTicket(id);
        return ResponseEntity.noContent().build();
    }
}
