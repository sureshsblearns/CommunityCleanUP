package com.communitycleanup.dto.report;

import com.communitycleanup.dto.event.EventDtos.EventSummaryDto;
import com.communitycleanup.dto.user.UserSummaryDto;
import com.communitycleanup.entity.PhotoType;
import com.communitycleanup.entity.ReportStatus;
import com.communitycleanup.entity.Urgency;
import com.communitycleanup.entity.WasteType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

public final class ReportDtos {

    private ReportDtos() {
    }

    public record ReportRequest(
            @NotBlank(message = "Title is required")
            @Size(min = 5, max = 150, message = "Title must be between 5 and 150 characters")
            String title,

            @NotBlank(message = "Description is required")
            @Size(min = 10, max = 2000, message = "Description must be between 10 and 2000 characters")
            String description,

            @NotNull(message = "Waste type is required")
            WasteType wasteType,

            @NotNull(message = "Urgency is required")
            Urgency urgency,

            @NotBlank(message = "Location is required")
            @Size(max = 255, message = "Location must be at most 255 characters")
            String location,

            @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
            @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
            BigDecimal latitude,

            @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
            @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
            BigDecimal longitude
    ) {
    }

    public record StatusUpdateRequest(
            @NotNull(message = "Status is required") ReportStatus status,
            @Size(max = 500, message = "Comment must be at most 500 characters") String comment
    ) {
    }

    public record PhotoDto(Long id, String url, PhotoType type, Instant uploadedDate) {
    }

    public record StatusHistoryDto(Long id, ReportStatus oldStatus, ReportStatus newStatus, String changedBy,
                                   String comment, Instant changedAt) {
    }

    public record ReportSummaryDto(
            Long id,
            String title,
            WasteType wasteType,
            Urgency urgency,
            ReportStatus status,
            String location,
            BigDecimal latitude,
            BigDecimal longitude,
            String reporterName,
            Instant createdDate,
            String thumbnailUrl,
            int photoCount
    ) {
    }

    public record ReportDto(
            Long id,
            String title,
            String description,
            WasteType wasteType,
            Urgency urgency,
            ReportStatus status,
            String location,
            BigDecimal latitude,
            BigDecimal longitude,
            String adminComment,
            UserSummaryDto reporter,
            Instant createdDate,
            Instant updatedDate,
            List<PhotoDto> photos,
            List<PhotoDto> cleanupPhotos,
            List<StatusHistoryDto> statusHistory,
            List<EventSummaryDto> relatedEvents,
            Set<ReportStatus> allowedTransitions,
            boolean canEdit,
            boolean canDelete
    ) {
    }

    public record MapPointDto(Long id, String title, ReportStatus status, Urgency urgency,
                              BigDecimal latitude, BigDecimal longitude) {
    }
}
