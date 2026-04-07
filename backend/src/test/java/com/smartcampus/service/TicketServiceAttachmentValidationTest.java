package com.smartcampus.service;

import com.smartcampus.dto.TicketRequest;
import com.smartcampus.dto.TicketResponse;
import com.smartcampus.exception.BadRequestException;
import com.smartcampus.model.Ticket;
import com.smartcampus.model.User;
import com.smartcampus.model.enums.TicketPriority;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketServiceAttachmentValidationTest {

    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private TicketAttachmentRepository ticketAttachmentRepository;

    @Mock
    private TicketCommentRepository commentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private CurrentUser currentUser;

    @InjectMocks
    private TicketService ticketService;

    @Test
    void shouldRejectWhenMoreThanThreeAttachments() {
        mockAuthenticatedReporter();

        List<MultipartFile> files = List.of(
                pngFile("one.png"),
                pngFile("two.png"),
                pngFile("three.png"),
                pngFile("four.png")
        );

        assertThrows(BadRequestException.class, () -> ticketService.createTicket(validRequest(), files));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    @Test
    void shouldRejectUnsupportedFileType() {
        mockAuthenticatedReporter();

        MultipartFile file = new MockMultipartFile(
                "files",
                "evidence.txt",
                "text/plain",
                "not an image".getBytes()
        );

        assertThrows(BadRequestException.class, () -> ticketService.createTicket(validRequest(), List.of(file)));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    @Test
    void shouldRejectOversizedAttachment() {
        mockAuthenticatedReporter();

        byte[] content = new byte[(int) (MAX_FILE_SIZE_BYTES + 1)];
        content[0] = (byte) 0x89;
        content[1] = 0x50;
        content[2] = 0x4E;
        content[3] = 0x47;
        content[4] = 0x0D;
        content[5] = 0x0A;
        content[6] = 0x1A;
        content[7] = 0x0A;

        MultipartFile file = new MockMultipartFile("files", "large.png", "image/png", content);

        assertThrows(BadRequestException.class, () -> ticketService.createTicket(validRequest(), List.of(file)));
        verify(ticketRepository, never()).save(any(Ticket.class));
    }

    @Test
    void shouldCreateTicketWithValidImageAttachment() {
        mockAuthenticatedReporter();
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TicketResponse response = ticketService.createTicket(validRequest(), List.of(jpegFile("projector.jpg")));

        assertEquals(1, response.getAttachments().size());
        assertEquals("projector.jpg", response.getAttachments().get(0).getFileName());
        assertEquals("image/jpeg", response.getAttachments().get(0).getFileType());
        verify(ticketRepository).save(any(Ticket.class));
    }

    private void mockAuthenticatedReporter() {
        User reporter = User.builder()
                .id(1L)
                .email("reporter@example.com")
                .name("Reporter")
                .role(UserRole.USER)
                .build();

        when(currentUser.getId()).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(reporter));
    }

    private TicketRequest validRequest() {
        return TicketRequest.builder()
                .title("Broken projector")
                .description("Projector displays error screen")
                .priority(TicketPriority.MEDIUM)
                .build();
    }

    private MultipartFile pngFile(String name) {
        byte[] content = new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47,
                0x0D, 0x0A, 0x1A, 0x0A,
                0x00
        };
        return new MockMultipartFile("files", name, "image/png", content);
    }

    private MultipartFile jpegFile(String name) {
        byte[] content = new byte[]{
                (byte) 0xFF, (byte) 0xD8, (byte) 0xFF,
                0x00, 0x00
        };
        return new MockMultipartFile("files", name, "image/jpeg", content);
    }
}
