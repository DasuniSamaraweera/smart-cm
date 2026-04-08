package com.smartcampus.service;

import com.smartcampus.dto.BookingRequest;
import com.smartcampus.dto.BookingResponse;
import com.smartcampus.dto.ResourceResponse;
import com.smartcampus.dto.UserDTO;
import com.smartcampus.exception.BadRequestException;
import com.smartcampus.exception.ForbiddenException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Booking;
import com.smartcampus.model.Resource;
import com.smartcampus.model.User;
import com.smartcampus.model.enums.BookingStatus;
import com.smartcampus.model.enums.ResourceStatus;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;

    // ------------------------------------------------------------------ //
    //  GET – list bookings                                                 //
    //  Users see their own; Admins can filter by userId/resourceId/status  //
    // ------------------------------------------------------------------ //
    public List<BookingResponse> getBookings(User currentUser,
                                             Long resourceId,
                                             BookingStatus status) {
        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        Long userId = isAdmin ? null : currentUser.getId();

        return bookingRepository.findWithFilters(userId, resourceId, status)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ------------------------------------------------------------------ //
    //  POST – create booking                                               //
    // ------------------------------------------------------------------ //
    @Transactional
    public BookingResponse createBooking(BookingRequest request, User currentUser) {

        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new BadRequestException("End time must be after start time");
        }

        Resource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", request.getResourceId()));

        if (resource.getStatus() == ResourceStatus.OUT_OF_SERVICE) {
            throw new BadRequestException("Resource '" + resource.getName() + "' is currently out of service");
        }

        // Check availability window if defined on the resource
        if (resource.getAvailabilityStart() != null && resource.getAvailabilityEnd() != null) {
            var reqStart = request.getStartTime().toLocalTime();
            var reqEnd   = request.getEndTime().toLocalTime();
            if (reqStart.isBefore(resource.getAvailabilityStart()) ||
                reqEnd.isAfter(resource.getAvailabilityEnd())) {
                throw new BadRequestException(
                        "Booking is outside resource availability window ("
                        + resource.getAvailabilityStart() + " – " + resource.getAvailabilityEnd() + ")"
                );
            }
        }

        // Conflict check – uses the custom JPQL query in BookingRepository
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                resource.getId(), request.getStartTime(), request.getEndTime());
        if (!conflicts.isEmpty()) {
            throw new BadRequestException(
                    "Time slot conflicts with an existing approved booking for this resource");
        }

        Booking booking = Booking.builder()
                .resource(resource)
                .user(currentUser)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .purpose(request.getPurpose())
                .expectedAttendees(request.getExpectedAttendees())
                .status(BookingStatus.PENDING)
                .build();

        return toResponse(bookingRepository.save(booking));
    }

    // ------------------------------------------------------------------ //
    //  PUT – approve or reject (Admin only)                               //
    // ------------------------------------------------------------------ //
    @Transactional
    public BookingResponse updateStatus(Long id, Map<String, String> body, User currentUser) {

        if (!currentUser.getRole().name().equals("ADMIN")) {
            throw new ForbiddenException("Only admins can approve or reject bookings");
        }

        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));

        String statusStr = body.get("status");
        String reason    = body.get("reason");

        if (statusStr == null) {
            throw new BadRequestException("status field is required");
        }

        BookingStatus newStatus;
        try {
            newStatus = BookingStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status value: " + statusStr);
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BadRequestException(
                    "Only PENDING bookings can be approved or rejected. Current status: "
                    + booking.getStatus());
        }

        if (newStatus == BookingStatus.REJECTED && (reason == null || reason.isBlank())) {
            throw new BadRequestException("A reason is required when rejecting a booking");
        }

        booking.setStatus(newStatus);
        booking.setAdminReason(reason);

        return toResponse(bookingRepository.save(booking));
    }

    // ------------------------------------------------------------------ //
    //  DELETE – cancel a booking                                           //
    //  Owner can cancel PENDING or APPROVED; Admin can cancel any         //
    // ------------------------------------------------------------------ //
    @Transactional
    public void cancelBooking(Long id, User currentUser) {

        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", id));

        boolean isAdmin = currentUser.getRole().name().equals("ADMIN");
        boolean isOwner = booking.getUser().getId().equals(currentUser.getId());

        if (!isAdmin && !isOwner) {
            throw new ForbiddenException("You can only cancel your own bookings");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BadRequestException("Booking is already cancelled");
        }

        if (booking.getStatus() == BookingStatus.REJECTED) {
            throw new BadRequestException("Rejected bookings cannot be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);
    }

    // ------------------------------------------------------------------ //
    //  Mapper                                                              //
    // ------------------------------------------------------------------ //
    private BookingResponse toResponse(Booking b) {
        Resource r = b.getResource();
        User u     = b.getUser();

        ResourceResponse resourceResponse = ResourceResponse.builder()
                .id(r.getId())
                .name(r.getName())
                .type(r.getType())
                .capacity(r.getCapacity())
                .location(r.getLocation())
                .description(r.getDescription())
                .availabilityStart(r.getAvailabilityStart())
                .availabilityEnd(r.getAvailabilityEnd())
                .status(r.getStatus())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();

        UserDTO userDTO = UserDTO.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .role(u.getRole())
                .build();

        return BookingResponse.builder()
                .id(b.getId())
                .resource(resourceResponse)
                .user(userDTO)
                .startTime(b.getStartTime())
                .endTime(b.getEndTime())
                .purpose(b.getPurpose())
                .expectedAttendees(b.getExpectedAttendees())
                .status(b.getStatus())
                .adminReason(b.getAdminReason())
                .createdAt(b.getCreatedAt())
                .build();
    }
}