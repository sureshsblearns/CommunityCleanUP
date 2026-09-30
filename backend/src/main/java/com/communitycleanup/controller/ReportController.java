package com.communitycleanup.controller;

import com.communitycleanup.dto.common.ApiResponse;
import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.report.ReportDtos.*;
import com.communitycleanup.entity.ReportStatus;
import com.communitycleanup.entity.Urgency;
import com.communitycleanup.entity.WasteType;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.ReportService;
import com.communitycleanup.service.ReportService.ReportFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Reports", description = "Dirty-area reports and their status workflow")
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @Operation(summary = "Submit a report with 1-6 photos (multipart: 'data' JSON part + 'photos' files)")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ReportDto> create(@Valid @RequestPart("data") ReportRequest request,
                                         @RequestPart("photos") List<MultipartFile> photos,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Report submitted successfully", reportService.create(request, photos, principal));
    }

    @Operation(summary = "List reports. scope=mine for own reports; admins see all, others see verified+ and their own")
    @GetMapping
    public ApiResponse<PageResponse<ReportSummaryDto>> list(@RequestParam(required = false) String scope,
                                                            @RequestParam(required = false) ReportStatus status,
                                                            @RequestParam(required = false) Urgency urgency,
                                                            @RequestParam(required = false) WasteType wasteType,
                                                            @RequestParam(required = false) String q,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "10") int size,
                                                            @RequestParam(defaultValue = "createdDate") String sort,
                                                            @RequestParam(defaultValue = "desc") String direction,
                                                            @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(reportService.list(
                new ReportFilter(scope, status, urgency, wasteType, q, page, size, sort, direction), principal));
    }

    @Operation(summary = "Report locations for map visualisation")
    @GetMapping("/map")
    public ApiResponse<List<MapPointDto>> map(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(reportService.mapPoints(principal));
    }

    @GetMapping("/{id}")
    public ApiResponse<ReportDto> get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(reportService.get(id, principal));
    }

    @Operation(summary = "Edit a report (author while PENDING/REJECTED, or ADMIN)")
    @PutMapping("/{id}")
    public ApiResponse<ReportDto> update(@PathVariable Long id, @Valid @RequestBody ReportRequest request,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Report updated", reportService.update(id, request, principal));
    }

    @Operation(summary = "Change report status (validated against the workflow and the caller's role)")
    @PatchMapping("/{id}/status")
    public ApiResponse<ReportDto> changeStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Report status updated", reportService.changeStatus(id, request, principal));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        reportService.delete(id, principal);
        return ApiResponse.message("Report deleted");
    }

    @Operation(summary = "Add photos to a report")
    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ReportDto> addPhotos(@PathVariable Long id, @RequestPart("photos") List<MultipartFile> photos,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Photos uploaded", reportService.addPhotos(id, photos, principal));
    }
}
