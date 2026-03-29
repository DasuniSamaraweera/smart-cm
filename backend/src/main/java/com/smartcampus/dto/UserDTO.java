package com.smartcampus.dto;

import com.smartcampus.model.enums.UserRole;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class UserDTO {
    private Long id;
    private String email;
    private String name;
    private String avatarUrl;
    private UserRole role;
    private LocalDateTime createdAt;
}
