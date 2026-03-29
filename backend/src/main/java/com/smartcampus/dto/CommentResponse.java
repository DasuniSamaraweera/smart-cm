package com.smartcampus.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CommentResponse {
    private Long id;
    private UserDTO author;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
