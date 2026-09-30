package com.communitycleanup.dto.event;

import com.communitycleanup.dto.report.ReportDtos.PhotoDto;
import com.communitycleanup.dto.user.UserSummaryDto;
import com.communitycleanup.entity.EventStatus;
import com.communitycleanup.entity.ReportStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

public final class EventDtos {

    private EventDtos() {
    }

    public record EventRequest(
            @NotBlank(message = "Title is required")
            @Size(min = 5, max = 150, message = "Title must be between 5 and 150 characters")
            String title,

            @NotBlank(message = "Description is required")
            @Size(min = 10, max = 2000, message = "Description must be between 10 and 2000 characters")
            String description,

            @NotNull(message = "Date is required")
            LocalDate eventDate,

            @NotNull(message = "Start time is required")
            @JsonFormat(pattern = "HH:mm[:ss]")
            LocalTime startTime,

            @JsonFormat(pattern = "HH:mm[:ss]")
            LocalTime endTime,

            @NotBlank(message = "Meeting point / location is required")
            @Size(max = 255, message = "Location must be at most 255 characters")
            String location,

            @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
            @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
            BigDecimal latitude,

            @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
            @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
            BigDecimal longitude,

            @NotNull(message = "Volunteers required is required")
            @Min(value = 1, message = "At least 1 volunteer is required")
            @Max(value = 1000, message = "At most 1000 volunteers are allowed")
            Integer volunteersRequired,

            Long relatedReportId,

            Boolean publish
    ) {
    }

    public record EventStatusRequest(
            @NotNull(message = "Status is required") EventStatus status,
            @Size(max = 500, message = "Comment must be at most 500 characters") String comment
    ) {
    }

    public record AttendanceRequest(@NotNull(message = "Attendance flag is required") Boolean attended) {
    }

    public record RelatedReportDto(Long id, String title, ReportStatus status, String location) {
    }

    public record EventSummaryDto(
            Long id,
            String title,
            LocalDate eventDate,
            @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            String location,
            EventStatus status,
            int volunteersRequired,
            long registeredCount,
            String organizerName,
            Long relatedReportId,
            String coverImageUrl
    ) {
    }

    public record ViewerContext(
            boolean registered,
            boolean attended,
            boolean canRegister,
            String registrationBlockedReason,
            boolean canManage,
            boolean canSubmitFeedback,
            boolean feedbackSubmitted,
            Long certificateId
    ) {
    }

    public record EventDto(
            Long id,
            String title,
            String description,
            LocalDate eventDate,
            @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @JsonFormat(pattern = "HH:mm") LocalTime endTime,
            String location,
            BigDecimal latitude,
            BigDecimal longitude,
            int volunteersRequired,
            long registeredCount,
            long remainingSlots,
            long attendedCount,
            EventStatus status,
            UserSummaryDto organizer,
            RelatedReportDto relatedReport,
            Instant createdAt,
            List<PhotoDto> photos,
            String coverImageUrl,
            Double averageRating,
            long feedbackCount,
            Set<EventStatus> allowedTransitions,
            ViewerContext viewer
    ) {
    }

    public record ParticipantDto(
            Long id,
            Long userId,
            String name,
            String email,
            String phone,
            Instant registrationDate,
            boolean attendance
    ) {
    }

    public record MyParticipationDto(
            Long participantId,
            EventSummaryDto event,
            Instant registrationDate,
            boolean attendance,
            Long certificateId,
            boolean feedbackSubmitted
    ) {
    }
}
