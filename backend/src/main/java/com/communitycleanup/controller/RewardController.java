package com.communitycleanup.controller;

import com.communitycleanup.dto.common.ApiResponse;
import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.reward.RewardDtos.BadgeDto;
import com.communitycleanup.dto.reward.RewardDtos.LeaderboardEntryDto;
import com.communitycleanup.dto.reward.RewardDtos.RewardSummaryDto;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.RewardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Rewards", description = "Points, badges and leaderboard")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;

    @Operation(summary = "Points, badges, history and next badge for the current user")
    @GetMapping("/rewards/me")
    public ApiResponse<RewardSummaryDto> myRewards(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(rewardService.summary(principal.getId()));
    }

    @Operation(summary = "Badge catalogue with the current user's earned/locked state")
    @GetMapping("/badges/me")
    public ApiResponse<List<BadgeDto>> myBadges(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(rewardService.badgeCatalogFor(principal.getId()));
    }

    @Operation(summary = "All badges that can be earned")
    @GetMapping("/badges/catalog")
    public ApiResponse<List<BadgeDto>> catalog() {
        return ApiResponse.ok(rewardService.catalog());
    }

    @Operation(summary = "Volunteer leaderboard (public profile data only)")
    @GetMapping("/leaderboard")
    public ApiResponse<PageResponse<LeaderboardEntryDto>> leaderboard(@RequestParam(defaultValue = "0") int page,
                                                                      @RequestParam(defaultValue = "20") int size,
                                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(rewardService.leaderboard(page, size, principal.getId()));
    }
}
