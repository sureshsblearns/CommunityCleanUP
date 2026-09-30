package com.communitycleanup.dto.analytics;

import com.communitycleanup.dto.common.LabelValue;

import java.util.List;
import java.util.Map;

public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    public record OverviewDto(
            long totalUsers,
            long residents,
            long volunteers,
            long ngos,
            long admins,
            long totalReports,
            long pendingReports,
            long verifiedReports,
            long scheduledReports,
            long inProgressReports,
            long completedReports,
            long rejectedReports,
            long totalEvents,
            long upcomingEvents,
            long inProgressEvents,
            long completedEvents,
            long cancelledEvents,
            long totalParticipants,
            long totalAttendances,
            long pointsAwarded,
            long galleryItems,
            Double averageFeedbackRating
    ) {
    }

    /** Monthly time series: one label per month and one or more named series of equal length. */
    public record TimeSeriesDto(List<String> labels, Map<String, List<Long>> series) {
    }

    public record ReportAnalyticsDto(
            List<LabelValue> byStatus,
            List<LabelValue> byWasteType,
            List<LabelValue> byUrgency,
            TimeSeriesDto monthly,
            double completionRate
    ) {
    }

    public record EventAnalyticsDto(
            List<LabelValue> byStatus,
            TimeSeriesDto monthly,
            List<LabelValue> topOrganizers
    ) {
    }

    public record VolunteerAnalyticsDto(
            TimeSeriesDto participation,
            List<LabelValue> topVolunteers,
            List<LabelValue> badgesAwarded,
            long activeVolunteers,
            double attendanceRate,
            long pointsAwarded
    ) {
    }
}
