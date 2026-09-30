package com.communitycleanup.dto.user;

import com.communitycleanup.entity.Role;

import java.time.Instant;

public record UserDto(
        Long id,
        String name,
        String email,
        String phone,
        Role role,
        String organizationName,
        int points,
        boolean active,
        Instant createdAt
) {
}
