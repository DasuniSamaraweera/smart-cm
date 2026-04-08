package com.smartcampus.service;

import com.smartcampus.dto.TicketResponse;
import com.smartcampus.dto.TicketStatusUpdate;
import com.smartcampus.exception.BadRequestException;
import com.smartcampus.exception.ForbiddenException;
import com.smartcampus.model.Ticket;
import com.smartcampus.model.User;
import com.smartcampus.model.enums.TicketStatus;
import com.smartcampus.model.enums.UserRole;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.repository.TicketAttachmentRepository;
import com.smartcampus.repository.TicketCommentRepository;
import com.smartcampus.repository.TicketRepository;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketServiceStatusWorkflowTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private TicketCommentRepository commentRepository;

    @Mock
    private TicketAttachmentRepository ticketAttachmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private CurrentUser currentUser;

    @InjectMocks
    private TicketService ticketService;

    @Test
    void shouldAllowSequentialTransitionOpenToInProgress() {
        Ticket ticket = ticketWithStatus(TicketStatus.OPEN);
        User admin = user(1L, UserRole.ADMIN);

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(currentUser.get()).thenReturn(admin);

        TicketStatusUpdate request = TicketStatusUpdate.builder()
                .status(TicketStatus.IN_PROGRESS)
                .build();

        TicketResponse response = ticketService.updateStatus(100L, request);

        assertEquals(TicketStatus.IN_PROGRESS, response.getStatus());
        verify(ticketRepository).save(ticket);
    }

    @Test
    void shouldRejectInvalidTransitionOpenToResolved() {
        Ticket ticket = ticketWithStatus(TicketStatus.OPEN);
        User admin = user(1L, UserRole.ADMIN);

        when(ticketRepository.findById(101L)).thenReturn(Optional.of(ticket));
        when(currentUser.get()).thenReturn(admin);

        TicketStatusUpdate request = TicketStatusUpdate.builder()
                .status(TicketStatus.RESOLVED)
                .build();

        assertThrows(BadRequestException.class, () -> ticketService.updateStatus(101L, request));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    @Test
    void shouldAllowAdminToRejectWithReason() {
        Ticket ticket = ticketWithStatus(TicketStatus.OPEN);
        User admin = user(1L, UserRole.ADMIN);

        when(ticketRepository.findById(102L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(currentUser.get()).thenReturn(admin);

        TicketStatusUpdate request = TicketStatusUpdate.builder()
                .status(TicketStatus.REJECTED)
                .rejectionReason("Insufficient details")
                .build();

        TicketResponse response = ticketService.updateStatus(102L, request);

        assertEquals(TicketStatus.REJECTED, response.getStatus());
        assertEquals("Insufficient details", response.getRejectionReason());
        verify(ticketRepository).save(ticket);
    }

    @Test
    void shouldRequireRejectionReasonForRejectedStatus() {
        Ticket ticket = ticketWithStatus(TicketStatus.OPEN);
        User admin = user(1L, UserRole.ADMIN);

        when(ticketRepository.findById(103L)).thenReturn(Optional.of(ticket));
        when(currentUser.get()).thenReturn(admin);

        TicketStatusUpdate request = TicketStatusUpdate.builder()
                .status(TicketStatus.REJECTED)
                .rejectionReason("   ")
                .build();

        assertThrows(BadRequestException.class, () -> ticketService.updateStatus(103L, request));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    @Test
    void shouldForbidTechnicianFromRejectingTicket() {
        User technician = user(2L, UserRole.TECHNICIAN);
        Ticket ticket = ticketWithStatus(TicketStatus.OPEN);
        ticket.setAssignedTo(technician);

        when(ticketRepository.findById(104L)).thenReturn(Optional.of(ticket));
        when(currentUser.get()).thenReturn(technician);

        TicketStatusUpdate request = TicketStatusUpdate.builder()
                .status(TicketStatus.REJECTED)
                .rejectionReason("Invalid request")
                .build();

        assertThrows(ForbiddenException.class, () -> ticketService.updateStatus(104L, request));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    @Test
    void shouldSetInProgressWhenAssignedFromOpen() {
        Ticket ticket = ticketWithStatus(TicketStatus.OPEN);
        User technician = user(10L, UserRole.TECHNICIAN);
        User admin = user(1L, UserRole.ADMIN);

        when(currentUser.get()).thenReturn(admin);
        when(ticketRepository.findById(105L)).thenReturn(Optional.of(ticket));
        when(userRepository.findById(10L)).thenReturn(Optional.of(technician));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TicketResponse response = ticketService.assignTicket(105L, 10L);

        assertEquals(TicketStatus.IN_PROGRESS, response.getStatus());
        assertEquals(10L, response.getAssignedTo().getId());
        verify(ticketRepository).save(ticket);
    }

    @Test
    void shouldRejectAssignmentToNonTechnician() {
        Ticket ticket = ticketWithStatus(TicketStatus.OPEN);
        User admin = user(1L, UserRole.ADMIN);
        User notTechnician = user(11L, UserRole.ADMIN);

        when(currentUser.get()).thenReturn(admin);
        when(ticketRepository.findById(106L)).thenReturn(Optional.of(ticket));
        when(userRepository.findById(11L)).thenReturn(Optional.of(notTechnician));

        assertThrows(BadRequestException.class, () -> ticketService.assignTicket(106L, 11L));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    @Test
    void shouldForbidNonAdminFromAssigningTicket() {
        Ticket ticket = ticketWithStatus(TicketStatus.OPEN);
        User technician = user(10L, UserRole.TECHNICIAN);

        when(currentUser.get()).thenReturn(technician);

        assertThrows(ForbiddenException.class, () -> ticketService.assignTicket(108L, 10L));
        verify(ticketRepository, never()).findById(any(Long.class));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    @Test
    void shouldResetResolvedTicketToInProgressWhenAssigned() {
        Ticket ticket = ticketWithStatus(TicketStatus.RESOLVED);
        ticket.setResolutionNotes("Previous resolution");
        User technician = user(10L, UserRole.TECHNICIAN);
        User admin = user(1L, UserRole.ADMIN);

        when(currentUser.get()).thenReturn(admin);
        when(ticketRepository.findById(109L)).thenReturn(Optional.of(ticket));
        when(userRepository.findById(10L)).thenReturn(Optional.of(technician));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TicketResponse response = ticketService.assignTicket(109L, 10L);

        assertEquals(TicketStatus.IN_PROGRESS, response.getStatus());
        assertNull(response.getResolutionNotes());
        verify(ticketRepository).save(ticket);
    }

    @Test
    void shouldAllowAssignedTechnicianToResolveWithNotes() {
        User technician = user(12L, UserRole.TECHNICIAN);
        Ticket ticket = ticketWithStatus(TicketStatus.IN_PROGRESS);
        ticket.setAssignedTo(technician);

        when(ticketRepository.findById(110L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(currentUser.get()).thenReturn(technician);

        TicketStatusUpdate request = TicketStatusUpdate.builder()
                .status(TicketStatus.RESOLVED)
                .resolutionNotes("Moved students to Lab 402 and issue resolved")
                .build();

        TicketResponse response = ticketService.updateStatus(110L, request);

        assertEquals(TicketStatus.RESOLVED, response.getStatus());
        assertEquals("Moved students to Lab 402 and issue resolved", response.getResolutionNotes());
        verify(ticketRepository).save(ticket);
    }

    @Test
    void shouldAllowAdminToCloseResolvedTicket() {
        Ticket ticket = ticketWithStatus(TicketStatus.RESOLVED);
        User admin = user(1L, UserRole.ADMIN);

        when(ticketRepository.findById(111L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(currentUser.get()).thenReturn(admin);

        TicketStatusUpdate request = TicketStatusUpdate.builder()
                .status(TicketStatus.CLOSED)
                .build();

        TicketResponse response = ticketService.updateStatus(111L, request);

        assertEquals(TicketStatus.CLOSED, response.getStatus());
        verify(ticketRepository).save(ticket);
    }

    @Test
    void shouldForbidTechnicianFromClosingTicket() {
        User technician = user(12L, UserRole.TECHNICIAN);
        Ticket ticket = ticketWithStatus(TicketStatus.RESOLVED);
        ticket.setAssignedTo(technician);

        when(ticketRepository.findById(107L)).thenReturn(Optional.of(ticket));
        when(currentUser.get()).thenReturn(technician);

        TicketStatusUpdate request = TicketStatusUpdate.builder()
                .status(TicketStatus.CLOSED)
                .build();

        assertThrows(ForbiddenException.class, () -> ticketService.updateStatus(107L, request));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    private Ticket ticketWithStatus(TicketStatus status) {
        return Ticket.builder()
                .id(500L)
                .title("Broken AC")
                .description("AC is not working")
                .status(status)
                .build();
    }

    private User user(Long id, UserRole role) {
        return User.builder()
                .id(id)
                .email("user@example.com")
                .name("Test User")
                .role(role)
                .build();
    }
}
