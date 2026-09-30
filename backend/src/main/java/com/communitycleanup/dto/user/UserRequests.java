package com.communitycleanup.dto.user;

import com.communitycleanup.util.ValidationPatterns;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class UserRequests {

    private UserRequests() {
    }

    public record UpdateUserRequest(
            @NotBlank(message = "Full name is required")
            @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
            String name,

            @NotBlank(message = "Phone number is required")
            @Pattern(regexp = ValidationPatterns.PHONE, message = "Enter a valid phone number (10-15 digits, optional +)")
            String phone,

            @Size(max = 150, message = "Organization name must be at most 150 characters")
            String organizationName
    ) {
    }

    public record UserStatusRequest(@NotNull(message = "Active flag is required") Boolean active) {
    }
}
