package com.communitycleanup.dto.auth;

import com.communitycleanup.dto.user.UserDto;
import com.communitycleanup.entity.Role;
import com.communitycleanup.util.ValidationPatterns;
import jakarta.validation.constraints.*;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank(message = "Full name is required")
            @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
            String name,

            @NotBlank(message = "Email is required")
            @Email(message = "Enter a valid email address")
            @Size(max = 150)
            String email,

            @NotBlank(message = "Phone number is required")
            @Pattern(regexp = ValidationPatterns.PHONE, message = "Enter a valid phone number (10-15 digits, optional +)")
            String phone,

            @NotBlank(message = "Password is required")
            @Pattern(regexp = ValidationPatterns.PASSWORD, message = ValidationPatterns.PASSWORD_MESSAGE)
            String password,

            @NotBlank(message = "Please confirm your password")
            String confirmPassword,

            @NotNull(message = "Role is required")
            Role role,

            @Size(max = 150, message = "Organization name must be at most 150 characters")
            String organizationName
    ) {
        @Override
        public String toString() {
            return "RegisterRequest[email=" + email + ", role=" + role + "]";
        }
    }

    public record LoginRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email,
            @NotBlank(message = "Password is required") String password
    ) {
        @Override
        public String toString() {
            return "LoginRequest[email=" + email + "]";
        }
    }

    public record AuthResponse(String accessToken, String tokenType, long expiresIn, UserDto user) {
    }

    public record ForgotPasswordRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email
    ) {
    }

    public record ResetPasswordRequest(
            @NotBlank(message = "Reset token is required") String token,
            @NotBlank(message = "Password is required")
            @Pattern(regexp = ValidationPatterns.PASSWORD, message = ValidationPatterns.PASSWORD_MESSAGE)
            String password,
            @NotBlank(message = "Please confirm your password") String confirmPassword
    ) {
        @Override
        public String toString() {
            return "ResetPasswordRequest[]";
        }
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Current password is required") String currentPassword,
            @NotBlank(message = "New password is required")
            @Pattern(regexp = ValidationPatterns.PASSWORD, message = ValidationPatterns.PASSWORD_MESSAGE)
            String newPassword,
            @NotBlank(message = "Please confirm your password") String confirmPassword
    ) {
        @Override
        public String toString() {
            return "ChangePasswordRequest[]";
        }
    }
}
