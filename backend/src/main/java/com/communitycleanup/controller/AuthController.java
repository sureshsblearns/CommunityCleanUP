package com.communitycleanup.controller;

import com.communitycleanup.dto.auth.AuthDtos.*;
import com.communitycleanup.dto.common.ApiResponse;
import com.communitycleanup.dto.user.UserDto;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Authentication")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Register a RESIDENT, VOLUNTEER or NGO account (ADMIN is rejected)")
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok("Account created successfully", authService.register(request));
    }

    @Operation(summary = "Log in and receive a JWT access token")
    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok("Logged in successfully", authService.login(request));
    }

    @Operation(summary = "Current authenticated user")
    @GetMapping("/me")
    public ApiResponse<UserDto> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(authService.me(principal.getId()));
    }

    @Operation(summary = "Request a password reset email")
    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ApiResponse.message("If an account exists for that email, a reset link has been sent.");
    }

    @Operation(summary = "Reset password using the emailed token")
    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.message("Your password has been reset. You can now log in.");
    }

    @Operation(summary = "Change password for the signed-in user")
    @PutMapping("/password")
    public ApiResponse<Void> changePassword(@AuthenticationPrincipal UserPrincipal principal,
                                            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(principal.getId(), request);
        return ApiResponse.message("Password updated successfully");
    }
}
