package com.communitycleanup.dto.user;

import com.communitycleanup.dto.reward.RewardDtos.BadgeDto;

import java.util.List;

public record UserDetailDto(
        UserDto user,
        long reportsSubmitted,
        long eventsJoined,
        long eventsAttended,
        long eventsCreated,
        long certificates,
        List<BadgeDto> badges
) {
}
