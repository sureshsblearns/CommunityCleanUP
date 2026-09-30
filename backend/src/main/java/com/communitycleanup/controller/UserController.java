package com.communitycleanup.controller;

import com.communitycleanup.dto.common.ApiResponse;
import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.user.UserDetailDto;
import com.communitycleanup.dto.user.UserDto;
import com.communitycleanup.dto.user.UserRequests.UpdateUserRequest;
import com.communitycleanup.dto.user.UserRequests.UserStatusRequest;
import com.communitycleanup.entity.Role;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Users")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "Search users (ADMIN)")
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ApiResponse<PageResponse<UserDto>> list(@RequestParam(required = false) Role role,
                                                   @RequestParam(required = false) Boolean active,
                                                   @RequestParam(required = false) String q,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "10") int size,
                                                   @RequestParam(defaultValue = "createdAt") String sort,
                                                   @RequestParam(defaultValue = "desc") String direction) {
        return ApiResponse.ok(userService.search(role, active, q, page, size, sort, direction));
    }

    @Operation(summary = "User details with participation statistics (self or ADMIN)")
    @GetMapping("/{id}")
    public ApiResponse<UserDetailDto> get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(userService.detail(id, principal));
    }

    @Operation(summary = "Update profile (self or ADMIN)")
    @PutMapping("/{id}")
    public ApiResponse<UserDto> update(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest request,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Profile updated", userService.update(id, request, principal));
    }

    @Operation(summary = "Activate or deactivate a user (ADMIN, not self)")
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/status")
    public ApiResponse<UserDto> setStatus(@PathVariable Long id, @Valid @RequestBody UserStatusRequest request,
                                          @AuthenticationPrincipal UserPrincipal principal) {
        UserDto user = userService.setActive(id, request.active(), principal);
        return ApiResponse.ok(user.active() ? "User activated" : "User deactivated", user);
    }
}
