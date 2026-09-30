package com.communitycleanup.dto.reward;

import com.communitycleanup.entity.BadgeType;
import com.communitycleanup.entity.RewardReason;
import com.communitycleanup.entity.Role;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public final class RewardDtos {

    private RewardDtos() {
    }

    public record BadgeDto(Long id, BadgeType type, String name, String description, int requiredAttendances,
                           boolean earned, Instant awardedDate) {
    }

    public record RewardTransactionDto(Long id, int points, RewardReason reason, String description,
                                       Long eventId, String eventTitle, Instant createdAt) {
    }

    public record NextBadgeDto(BadgeType type, String name, int required, long progress) {
    }

    public record RewardSummaryDto(
            int totalPoints,
            long rank,
            long eventsAttended,
            int pointsPerAttendance,
            List<BadgeDto> badges,
            List<RewardTransactionDto> transactions,
            NextBadgeDto nextBadge
    ) {
    }

    public record LeaderboardEntryDto(long rank, Long userId, String name, Role role, int points,
                                      long completedEvents, long badgeCount, boolean currentUser) {
    }

    public record AdminRewardTransactionDto(Long id, Long userId, String userName, int points, RewardReason reason,
                                            String description, Long eventId, String eventTitle, Instant createdAt) {
    }

    public record AdminBadgeDto(Long id, Long userId, String userName, BadgeType type, String name,
                                Instant awardedDate) {
    }

    public record AwardBadgeRequest(@NotNull(message = "User is required") Long userId,
                                    @NotNull(message = "Badge is required") BadgeType badge) {
    }
}
