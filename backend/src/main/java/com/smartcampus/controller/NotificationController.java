package com.smartcampus.controller;

import com.smartcampus.dto.NotificationResponse;
import com.smartcampus.model.User;
import com.smartcampus.security.CurrentUser;
import com.smartcampus.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUser currentUser;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getMyNotifications() {
        User user = currentUser.get();
        return ResponseEntity.ok(notificationService.getUserNotifications(user));
    }

    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        User user = currentUser.get();
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(user)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(@PathVariable Long id) {
        User user = currentUser.get();
        return ResponseEntity.ok(notificationService.markAsRead(id, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        User user = currentUser.get();
        notificationService.deleteNotification(id, user);
        return ResponseEntity.noContent().build();
    }
}