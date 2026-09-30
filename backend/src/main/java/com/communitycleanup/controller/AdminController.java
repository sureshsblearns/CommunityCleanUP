package com.communitycleanup.controller;

import com.communitycleanup.dto.analytics.AnalyticsDtos.*;
import com.communitycleanup.dto.common.ApiResponse;
import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.reward.RewardDtos.AdminBadgeDto;
import com.communitycleanup.dto.reward.RewardDtos.AdminRewardTransactionDto;
import com.communitycleanup.dto.reward.RewardDtos.AwardBadgeRequest;
import com.communitycleanup.service.AnalyticsService;
import com.communitycleanup.service.RewardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin", description = "Analytics and reward management (ADMIN only)")
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AnalyticsService analyticsService;
    private final RewardService rewardService;

    @GetMapping("/analytics/overview")
    public ApiResponse<OverviewDto> overview() {
        return ApiResponse.ok(analyticsService.overview());
    }

    @GetMapping("/analytics/reports")
    public ApiResponse<ReportAnalyticsDto> reports() {
        return ApiResponse.ok(analyticsService.reports());
    }

    @GetMapping("/analytics/events")
    public ApiResponse<EventAnalyticsDto> events() {
        return ApiResponse.ok(analyticsService.events());
    }

    @GetMapping("/analytics/volunteers")
    public ApiResponse<VolunteerAnalyticsDto> volunteers() {
        return ApiResponse.ok(analyticsService.volunteers());
    }

    @Operation(summary = "All point transactions")
    @GetMapping("/rewards/transactions")
    public ApiResponse<PageResponse<AdminRewardTransactionDto>> transactions(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(rewardService.allTransactions(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
    }

    @Operation(summary = "All awarded badges")
    @GetMapping("/badges")
    public ApiResponse<PageResponse<AdminBadgeDto>> badges(@RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(rewardService.allBadges(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
    }

    @Operation(summary = "Manually award a badge (no duplicates)")
    @PostMapping("/badges")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> awardBadge(@Valid @RequestBody AwardBadgeRequest request) {
        rewardService.adminAwardBadge(request);
        return ApiResponse.message("Badge awarded");
    }

    @DeleteMapping("/badges/{id}")
    public ApiResponse<Void> revokeBadge(@PathVariable Long id) {
        rewardService.revokeBadge(id);
        return ApiResponse.message("Badge revoked");
    }
}
