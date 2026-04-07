package com.smartcampus.controller;

import com.smartcampus.exception.ForbiddenException;
import com.smartcampus.model.User;
import com.smartcampus.model.enums.UserRole;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class DevAuthController {

    private static final String DEV_ADMIN_EMAIL = "dev_loggin@smartcampus.local";
    private static final String DEV_ADMIN_NAME = "DEV_Loggin";

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.dev-login.enabled:false}")
    private boolean devLoginEnabled;

    @PostMapping("/dev-login")
    public ResponseEntity<Map<String, String>> devLogin() {
        if (!devLoginEnabled) {
            throw new ForbiddenException("Development login is disabled");
        }

        User user = userRepository.findByEmail(DEV_ADMIN_EMAIL)
                .orElseGet(() -> userRepository.save(
                        User.builder()
                                .email(DEV_ADMIN_EMAIL)
                                .name(DEV_ADMIN_NAME)
                                .role(UserRole.ADMIN)
                                .build()
                ));

        if (user.getRole() != UserRole.ADMIN || !DEV_ADMIN_NAME.equals(user.getName())) {
            user.setRole(UserRole.ADMIN);
            user.setName(DEV_ADMIN_NAME);
            user = userRepository.save(user);
        }

        String token = jwtTokenProvider.generateToken(user.getEmail(), user.getRole().name());
        return ResponseEntity.ok(Map.of("token", token));
    }
}
