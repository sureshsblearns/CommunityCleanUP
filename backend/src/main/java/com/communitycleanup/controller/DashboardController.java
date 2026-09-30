package com.communitycleanup.controller;

import com.communitycleanup.dto.common.ApiResponse;
import com.communitycleanup.dto.dashboard.DashboardDtos.DashboardDto;
import com.communitycleanup.dto.dashboard.DashboardDtos.PublicStatsDto;
import com.communitycleanup.dto.event.EventDtos.EventSummaryDto;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.DashboardService;
import com.communitycleanup.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Dashboard")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final EventService eventService;

    @Operation(summary = "Role-aware dashboard for the current user")
    @GetMapping("/dashboard")
    public ApiResponse<DashboardDto> dashboard(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(dashboardService.forUser(principal));
    }

    @Operation(summary = "Live community statistics for the landing page")
    @GetMapping("/public/stats")
    public ApiResponse<PublicStatsDto> publicStats() {
        return ApiResponse.ok(dashboardService.publicStats());
    }

    @Operation(summary = "Next upcoming events for the landing page")
    @GetMapping("/public/upcoming-events")
    public ApiResponse<List<EventSummaryDto>> upcoming(@RequestParam(defaultValue = "3") int limit) {
        return ApiResponse.ok(eventService.upcomingPublic(Math.min(Math.max(limit, 1), 12)));
    }
}
