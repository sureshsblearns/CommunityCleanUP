package com.communitycleanup.dto.reward;

import com.communitycleanup.entity.Role;

public record LeaderboardRow(Long userId, String name, Role role, int points, long completedEvents, long badgeCount) {
}
