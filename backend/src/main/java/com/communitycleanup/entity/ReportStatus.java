package com.communitycleanup.entity;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Report lifecycle. Allowed transitions are defined here so every service enforces the same workflow:
 * PENDING -> VERIFIED -> CLEANING_SCHEDULED -> IN_PROGRESS -> COMPLETED, with REJECTED/CANCELLED side exits.
 */
public enum ReportStatus {
    PENDING, VERIFIED, CLEANING_SCHEDULED, IN_PROGRESS, COMPLETED, REJECTED, CANCELLED;

    private static final Map<ReportStatus, Set<ReportStatus>> TRANSITIONS = Map.of(
            PENDING, EnumSet.of(VERIFIED, REJECTED, CANCELLED),
            VERIFIED, EnumSet.of(CLEANING_SCHEDULED, REJECTED),
            CLEANING_SCHEDULED, EnumSet.of(IN_PROGRESS, VERIFIED),
            IN_PROGRESS, EnumSet.of(COMPLETED, CLEANING_SCHEDULED),
            COMPLETED, EnumSet.noneOf(ReportStatus.class),
            REJECTED, EnumSet.of(PENDING),
            CANCELLED, EnumSet.noneOf(ReportStatus.class)
    );

    public boolean canTransitionTo(ReportStatus target) {
        return TRANSITIONS.getOrDefault(this, Set.of()).contains(target);
    }

    public Set<ReportStatus> allowedTransitions() {
        return TRANSITIONS.getOrDefault(this, Set.of());
    }
}
