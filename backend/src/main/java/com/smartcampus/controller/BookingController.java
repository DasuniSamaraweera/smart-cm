package com.smartcampus.controller;

import com.smartcampus.dto.BookingRequest;
import com.smartcampus.dto.BookingResponse;
import com.smartcampus.model.enums.BookingStatus;
import com.smartcampus.security.CurrentUser;
import com.smartcampus.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final CurrentUser currentUser;

    /**
     * GET /api/bookings
     * Users: returns their own bookings.
     * Admins: returns all bookings, optionally filtered by resourceId and/or status.
     */
    @GetMapping
    public ResponseEntity<List<BookingResponse>> getBookings(
            @RequestParam(required = false) Long resourceId,
            @RequestParam(required = false) BookingStatus status) {

        List<BookingResponse> bookings = bookingService.getBookings(
                currentUser.get(), resourceId, status);
        return ResponseEntity.ok(bookings);
    }

    /**
     * POST /api/bookings
     * Any authenticated user can create a booking request.
     */
    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody BookingRequest request) {

        BookingResponse response = bookingService.createBooking(request, currentUser.get());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * PUT /api/bookings/{id}/status
     * Admin only – approve or reject a PENDING booking.
     * Body: { "status": "APPROVED" | "REJECTED", "reason": "optional reason" }
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookingResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        BookingResponse response = bookingService.updateStatus(id, body, currentUser.get());
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/bookings/{id}
     * Owner can cancel their own PENDING or APPROVED booking.
     * Admin can cancel any booking.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelBooking(@PathVariable Long id) {
        bookingService.cancelBooking(id, currentUser.get());
        return ResponseEntity.noContent().build();
    }
}