package com.communitycleanup.service;

import com.communitycleanup.dto.auth.AuthDtos.*;
import com.communitycleanup.dto.user.UserDto;
import com.communitycleanup.entity.PasswordResetToken;
import com.communitycleanup.entity.Role;
import com.communitycleanup.entity.User;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.mapper.DtoMapper;
import com.communitycleanup.repository.PasswordResetTokenRepository;
import com.communitycleanup.repository.UserRepository;
import com.communitycleanup.security.JwtService;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.util.TokenHasher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Duration RESET_TOKEN_TTL = Duration.ofMinutes(30);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailService emailService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.role() == null || !request.role().isSelfRegistrable()) {
            throw ApiException.forbidden("Administrator accounts cannot be created through public registration");
        }
        if (!request.password().equals(request.confirmPassword())) {
            throw ApiException.badRequest("Passwords do not match");
        }
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists");
        }
        if (request.role() == Role.NGO && (request.organizationName() == null || request.organizationName().isBlank())) {
            throw ApiException.badRequest("Organization name is required for NGO accounts");
        }

        User user = userRepository.save(User.builder()
                .name(request.name().trim())
                .email(email)
                .phone(request.phone().trim())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .organizationName(blankToNull(request.organizationName()))
                .active(true)
                .build());
        log.info("New {} account registered (id={})", user.getRole(), user.getId());

        emailService.send(user.getEmail(), "Welcome to Community Clean-Up Portal", "Welcome, " + user.getName() + "!",
                "Your " + user.getRole().name().toLowerCase(Locale.ROOT) + " account has been created.\n\n"
                        + "Together we can keep our neighbourhoods clean — report dirty areas, join cleanup events "
                        + "and earn recognition for your contribution.",
                "Open your dashboard", "/dashboard");

        return buildAuthResponse(new UserPrincipal(user), user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizeEmail(request.email()), request.password()));
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(principal.getId()).orElseThrow(() -> ApiException.notFound("User"));
        return buildAuthResponse(principal, user);
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        return userRepository.findById(userId).map(DtoMapper::toUserDto)
                .orElseThrow(() -> ApiException.notFound("User"));
    }

    /** Always succeeds from the caller's perspective so the endpoint cannot be used to discover accounts. */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .filter(User::isActive)
                .ifPresent(user -> {
                    resetTokenRepository.invalidateAllForUser(user.getId());
                    byte[] bytes = new byte[32];
                    RANDOM.nextBytes(bytes);
                    String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
                    resetTokenRepository.save(PasswordResetToken.builder()
                            .user(user)
                            .tokenHash(TokenHasher.sha256(rawToken))
                            .expiresAt(Instant.now().plus(RESET_TOKEN_TTL))
                            .build());
                    emailService.send(user.getEmail(), "Reset your password", "Password reset requested",
                            "We received a request to reset your password. The link below is valid for 30 minutes.\n\n"
                                    + "If you did not request this, you can safely ignore this email.",
                            "Reset password", "/reset-password?token=" + rawToken);
                });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw ApiException.badRequest("Passwords do not match");
        }
        PasswordResetToken token = resetTokenRepository.findByTokenHash(TokenHasher.sha256(request.token()))
                .filter(t -> !t.isUsed() && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> ApiException.badRequest("This reset link is invalid or has expired"));
        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(request.password()));
        token.setUsed(true);
        resetTokenRepository.invalidateAllForUser(user.getId());
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw ApiException.badRequest("Passwords do not match");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
    }

    private AuthResponse buildAuthResponse(UserPrincipal principal, User user) {
        return new AuthResponse(jwtService.generateToken(principal), "Bearer", jwtService.getExpirationMs(),
                DtoMapper.toUserDto(user));
    }

    private static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
