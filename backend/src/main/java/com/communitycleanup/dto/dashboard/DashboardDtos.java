package com.communitycleanup.dto.dashboard;

import com.communitycleanup.dto.common.LabelValue;
import com.communitycleanup.dto.event.EventDtos.EventSummaryDto;
import com.communitycleanup.dto.report.ReportDtos.ReportSummaryDto;
import com.communitycleanup.dto.reward.RewardDtos.BadgeDto;
import com.communitycleanup.entity.Role;

import java.time.Instant;
import java.util.List;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record ActivityDto(String type, String title, String detail, Instant date, String link) {
    }

    public record DashboardDto(
            Role role,
            long reportsSubmitted,
            long reportsCompleted,
            long reportsPending,
            long eventsJoined,
            long eventsAttended,
            long upcomingEventsCount,
            int points,
            long badgesCount,
            long leaderboardRank,
            long certificatesCount,
            long eventsCreated,
            long totalParticipants,
            long totalAttendances,
            long completedEventsCount,
            List<ReportSummaryDto> recentReports,
            List<EventSummaryDto> upcomingEvents,
            List<EventSummaryDto> recentCompletedEvents,
            List<BadgeDto> badges,
            List<LabelValue> reportStatusBreakdown,
            List<ActivityDto> recentActivity
    ) {
    }

    public record PublicStatsDto(
            long reportsSubmitted,
            long areasCleaned,
            long eventsCompleted,
            long upcomingEvents,
            long volunteers,
            long attendances
    ) {
    }
}
