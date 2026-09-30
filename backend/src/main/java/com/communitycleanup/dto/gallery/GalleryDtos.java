package com.communitycleanup.dto.gallery;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

public final class GalleryDtos {

    private GalleryDtos() {
    }

    public record GalleryRequest(
            @NotBlank(message = "Title is required")
            @Size(min = 3, max = 150, message = "Title must be between 3 and 150 characters")
            String title,

            @Size(max = 1000, message = "Description must be at most 1000 characters")
            String description,

            @Size(max = 255, message = "Location must be at most 255 characters")
            String location,

            LocalDate completionDate,

            Long eventId,

            Boolean approved
    ) {
    }

    public record GalleryFromEventRequest(
            @Size(max = 150, message = "Title must be at most 150 characters") String title,
            @Size(max = 1000, message = "Description must be at most 1000 characters") String description
    ) {
    }

    public record GalleryItemDto(
            Long id,
            String title,
            String description,
            String location,
            String beforeImageUrl,
            String afterImageUrl,
            LocalDate completionDate,
            boolean approved,
            Long eventId,
            String eventTitle,
            String createdByName,
            Instant createdAt
    ) {
    }
}
