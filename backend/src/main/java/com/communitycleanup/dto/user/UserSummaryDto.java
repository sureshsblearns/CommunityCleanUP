package com.communitycleanup.dto.user;

import com.communitycleanup.entity.Role;

/** Public-safe view of a user: never contains email, phone or other personal data. */
public record UserSummaryDto(Long id, String name, Role role, String organizationName) {
}
