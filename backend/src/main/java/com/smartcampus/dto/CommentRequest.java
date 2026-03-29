package com.smartcampus.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class CommentRequest {

    @NotBlank(message = "Content is required")
    private String content;
}
