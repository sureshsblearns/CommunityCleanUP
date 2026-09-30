package com.communitycleanup.controller;

import com.communitycleanup.dto.common.ApiResponse;
import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.event.EventDtos.*;
import com.communitycleanup.dto.feedback.FeedbackDtos.EventFeedbackDto;
import com.communitycleanup.dto.feedback.FeedbackDtos.FeedbackDto;
import com.communitycleanup.dto.feedback.FeedbackDtos.FeedbackRequest;
import com.communitycleanup.entity.EventStatus;
import com.communitycleanup.entity.PhotoType;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.EventService;
import com.communitycleanup.service.EventService.EventFilter;
import com.communitycleanup.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Events", description = "Cleanup events, registrations, attendance and feedback")
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final FeedbackService feedbackService;

    @Operation(summary = "List events. scope = upcoming (default) | past | all | mine (organiser) | registered")
    @GetMapping
    public ApiResponse<PageResponse<EventSummaryDto>> list(@RequestParam(required = false) String scope,
                                                           @RequestParam(required = false) EventStatus status,
                                                           @RequestParam(required = false) String q,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "9") int size,
                                                           @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(eventService.list(new EventFilter(scope, status, q, page, size), principal));
    }

    @Operation(summary = "Create a cleanup event (NGO or ADMIN)")
    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<EventDto> create(@Valid @RequestBody EventRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Event created successfully", eventService.create(request, principal));
    }

    @Operation(summary = "My event registrations")
    @GetMapping("/my-registrations")
    public ApiResponse<List<MyParticipationDto>> myRegistrations(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(eventService.myParticipations(principal.getId()));
    }

    @GetMapping("/{id}")
    public ApiResponse<EventDto> get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(eventService.get(id, principal));
    }

    @Operation(summary = "Update an event (organiser or ADMIN, before it starts)")
    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @PutMapping("/{id}")
    public ApiResponse<EventDto> update(@PathVariable Long id, @Valid @RequestBody EventRequest request,
                                        @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Event updated", eventService.update(id, request, principal));
    }

    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        eventService.delete(id, principal);
        return ApiResponse.message("Event deleted");
    }

    @Operation(summary = "Change event status: OPEN, IN_PROGRESS, COMPLETED (awards points) or CANCELLED")
    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @PatchMapping("/{id}/status")
    public ApiResponse<EventDto> changeStatus(@PathVariable Long id, @Valid @RequestBody EventStatusRequest request,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Event status updated", eventService.changeStatus(id, request, principal));
    }

    @Operation(summary = "Register the current volunteer/resident for an event")
    @PostMapping("/{id}/register")
    public ApiResponse<EventDto> register(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Your event registration is confirmed", eventService.register(id, principal));
    }

    @DeleteMapping("/{id}/register")
    public ApiResponse<EventDto> unregister(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Your registration has been cancelled", eventService.unregister(id, principal));
    }

    @Operation(summary = "Participants of an event (organiser or ADMIN)")
    @GetMapping("/{id}/participants")
    public ApiResponse<List<ParticipantDto>> participants(@PathVariable Long id,
                                                          @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(eventService.participants(id, principal));
    }

    @Operation(summary = "Mark attendance (organiser or ADMIN, once the event is in progress)")
    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @PatchMapping("/{id}/participants/{participantId}/attendance")
    public ApiResponse<ParticipantDto> attendance(@PathVariable Long id, @PathVariable Long participantId,
                                                  @Valid @RequestBody AttendanceRequest request,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Attendance updated",
                eventService.markAttendance(id, participantId, request.attended(), principal));
    }

    @Operation(summary = "Upload BEFORE/AFTER cleanup photos (organiser or ADMIN)")
    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<EventDto> addPhotos(@PathVariable Long id, @RequestParam PhotoType type,
                                           @RequestPart("photos") List<MultipartFile> photos,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Photos uploaded", eventService.addPhotos(id, type, photos, principal));
    }

    @Operation(summary = "Submit feedback (attended participants of COMPLETED events, once)")
    @PostMapping("/{id}/feedback")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<FeedbackDto> submitFeedback(@PathVariable Long id, @Valid @RequestBody FeedbackRequest request,
                                                   @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Thank you for your feedback", feedbackService.submit(id, request, principal));
    }

    @GetMapping("/{id}/feedback")
    public ApiResponse<EventFeedbackDto> feedback(@PathVariable Long id) {
        return ApiResponse.ok(feedbackService.forEvent(id));
    }
}
