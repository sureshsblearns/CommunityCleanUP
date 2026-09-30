package com.communitycleanup.entity;

import lombok.Getter;

/**
 * Badge catalogue. Attendance badges are awarded automatically once a volunteer has attended
 * the required number of completed cleanup events; ECO_REPORTER is awarded when a report the
 * user submitted reaches COMPLETED.
 */
@Getter
public enum BadgeType {
    FIRST_CLEANUP("First Cleanup", "Attended your first community cleanup event.", 1),
    GREEN_VOLUNTEER("Green Volunteer", "Attended 3 cleanup events.", 3),
    ACTIVE_PARTICIPANT("Active Participant", "Attended 5 cleanup events.", 5),
    COMMUNITY_HELPER("Community Helper", "Attended 10 cleanup events.", 10),
    CLEANUP_CHAMPION("Cleanup Champion", "Attended 20 cleanup events.", 20),
    ECO_REPORTER("Eco Reporter", "A dirty area you reported was cleaned up.", 0);

    private final String displayName;
    private final String description;
    private final int requiredAttendances;

    BadgeType(String displayName, String description, int requiredAttendances) {
        this.displayName = displayName;
        this.description = description;
        this.requiredAttendances = requiredAttendances;
    }

    public boolean isAttendanceBadge() {
        return requiredAttendances > 0;
    }
}
