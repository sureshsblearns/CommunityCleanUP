package com.communitycleanup.mapper;

import com.communitycleanup.dto.certificate.CertificateDto;
import com.communitycleanup.dto.event.EventDtos.EventSummaryDto;
import com.communitycleanup.dto.event.EventDtos.ParticipantDto;
import com.communitycleanup.dto.event.EventDtos.RelatedReportDto;
import com.communitycleanup.dto.feedback.FeedbackDtos.FeedbackDto;
import com.communitycleanup.dto.gallery.GalleryDtos.GalleryItemDto;
import com.communitycleanup.dto.report.ReportDtos.PhotoDto;
import com.communitycleanup.dto.report.ReportDtos.ReportSummaryDto;
import com.communitycleanup.dto.report.ReportDtos.StatusHistoryDto;
import com.communitycleanup.dto.reward.RewardDtos.BadgeDto;
import com.communitycleanup.dto.reward.RewardDtos.RewardTransactionDto;
import com.communitycleanup.dto.user.UserDto;
import com.communitycleanup.dto.user.UserSummaryDto;
import com.communitycleanup.entity.*;

/** Converts entities to API DTOs so JPA entities are never serialized directly. */
public final class DtoMapper {

    private DtoMapper() {
    }

    public static UserDto toUserDto(User user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getPhone(), user.getRole(),
                user.getOrganizationName(), user.getPoints(), user.isActive(), user.getCreatedAt());
    }

    public static UserSummaryDto toUserSummary(User user) {
        if (user == null) {
            return null;
        }
        return new UserSummaryDto(user.getId(), user.getName(), user.getRole(), user.getOrganizationName());
    }

    public static PhotoDto toPhotoDto(Photo photo) {
        return new PhotoDto(photo.getId(), photo.getPhotoUrl(), photo.getPhotoType(), photo.getUploadedDate());
    }

    public static StatusHistoryDto toHistoryDto(ReportStatusHistory history) {
        return new StatusHistoryDto(history.getId(), history.getOldStatus(), history.getNewStatus(),
                history.getChangedBy() != null ? history.getChangedBy().getName() : "System",
                history.getComment(), history.getChangedAt());
    }

    public static ReportSummaryDto toReportSummary(Report report, String thumbnailUrl, int photoCount) {
        return new ReportSummaryDto(report.getId(), report.getTitle(), report.getWasteType(), report.getUrgency(),
                report.getStatus(), report.getLocation(), report.getLatitude(), report.getLongitude(),
                report.getUser().getName(), report.getCreatedDate(), thumbnailUrl, photoCount);
    }

    public static RelatedReportDto toRelatedReport(Report report) {
        if (report == null) {
            return null;
        }
        return new RelatedReportDto(report.getId(), report.getTitle(), report.getStatus(), report.getLocation());
    }

    public static EventSummaryDto toEventSummary(Event event, long registeredCount, String coverImageUrl) {
        return new EventSummaryDto(event.getId(), event.getTitle(), event.getEventDate(), event.getStartTime(),
                event.getEndTime(), event.getLocation(), event.getStatus(), event.getVolunteersRequired(),
                registeredCount, event.getCreatedBy().getDisplayOrganization(),
                event.getRelatedReport() != null ? event.getRelatedReport().getId() : null, coverImageUrl);
    }

    public static ParticipantDto toParticipantDto(EventParticipant participant) {
        User user = participant.getUser();
        return new ParticipantDto(participant.getId(), user.getId(), user.getName(), user.getEmail(), user.getPhone(),
                participant.getRegistrationDate(), participant.isAttendance());
    }

    public static FeedbackDto toFeedbackDto(Feedback feedback) {
        return new FeedbackDto(feedback.getId(), feedback.getUser().getId(), feedback.getUser().getName(),
                feedback.getRating(), feedback.getComments(), feedback.getSubmittedDate());
    }

    public static BadgeDto toBadgeDto(Badge badge) {
        BadgeType type = badge.getBadgeName();
        return new BadgeDto(badge.getId(), type, type.getDisplayName(), type.getDescription(),
                type.getRequiredAttendances(), true, badge.getAwardedDate());
    }

    public static BadgeDto toLockedBadgeDto(BadgeType type) {
        return new BadgeDto(null, type, type.getDisplayName(), type.getDescription(), type.getRequiredAttendances(),
                false, null);
    }

    public static RewardTransactionDto toRewardDto(RewardTransaction tx) {
        return new RewardTransactionDto(tx.getId(), tx.getPoints(), tx.getReason(), tx.getDescription(),
                tx.getEvent() != null ? tx.getEvent().getId() : null,
                tx.getEvent() != null ? tx.getEvent().getTitle() : null, tx.getCreatedAt());
    }

    public static CertificateDto toCertificateDto(Certificate certificate) {
        Event event = certificate.getEvent();
        return new CertificateDto(certificate.getId(), certificate.getCertificateNumber(), event.getId(),
                event.getTitle(), event.getEventDate(), event.getLocation(),
                event.getCreatedBy().getDisplayOrganization(), certificate.getUser().getName(),
                certificate.getIssuedAt());
    }

    public static GalleryItemDto toGalleryDto(GalleryItem item) {
        return new GalleryItemDto(item.getId(), item.getTitle(), item.getDescription(), item.getLocation(),
                item.getBeforeImageUrl(), item.getAfterImageUrl(), item.getCompletionDate(), item.isApproved(),
                item.getEvent() != null ? item.getEvent().getId() : null,
                item.getEvent() != null ? item.getEvent().getTitle() : null,
                item.getCreatedBy() != null ? item.getCreatedBy().getDisplayOrganization() : null,
                item.getCreatedAt());
    }
}
