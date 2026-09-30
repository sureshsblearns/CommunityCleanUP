package com.communitycleanup.controller;

import com.communitycleanup.dto.common.ApiResponse;
import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.gallery.GalleryDtos.GalleryFromEventRequest;
import com.communitycleanup.dto.gallery.GalleryDtos.GalleryItemDto;
import com.communitycleanup.dto.gallery.GalleryDtos.GalleryRequest;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.GalleryService;
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

@Tag(name = "Gallery", description = "Before/after showcase of completed cleanups")
@RestController
@RequestMapping("/api/gallery")
@RequiredArgsConstructor
public class GalleryController {

    private final GalleryService galleryService;

    @Operation(summary = "Approved gallery items. Admins may pass filter=all|pending")
    @GetMapping
    public ApiResponse<PageResponse<GalleryItemDto>> list(@RequestParam(required = false) String filter,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "9") int size,
                                                          @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(galleryService.list(filter, page, size, principal));
    }

    @GetMapping("/{id}")
    public ApiResponse<GalleryItemDto> get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(galleryService.get(id, principal));
    }

    @Operation(summary = "Create a gallery item with before/after images (ADMIN, or NGO pending approval)")
    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<GalleryItemDto> create(@Valid @RequestPart("data") GalleryRequest request,
                                              @RequestPart("before") MultipartFile before,
                                              @RequestPart("after") MultipartFile after,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        GalleryItemDto item = galleryService.create(request, before, after, principal);
        return ApiResponse.ok(item.approved() ? "Gallery item published" : "Gallery item submitted for approval", item);
    }

    @Operation(summary = "Create a gallery item from a completed event's BEFORE/AFTER photos")
    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @PostMapping("/from-event/{eventId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<GalleryItemDto> fromEvent(@PathVariable Long eventId,
                                                 @Valid @RequestBody(required = false) GalleryFromEventRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        GalleryItemDto item = galleryService.createFromEvent(eventId, request, principal);
        return ApiResponse.ok(item.approved() ? "Gallery item published" : "Gallery item submitted for approval", item);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ApiResponse<GalleryItemDto> update(@PathVariable Long id, @Valid @RequestBody GalleryRequest request,
                                              @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok("Gallery item updated", galleryService.update(id, request, principal));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{id}/approval")
    public ApiResponse<GalleryItemDto> approve(@PathVariable Long id, @RequestParam boolean approved) {
        return ApiResponse.ok(approved ? "Gallery item approved" : "Gallery item hidden",
                galleryService.setApproval(id, approved));
    }

    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        galleryService.delete(id, principal);
        return ApiResponse.message("Gallery item deleted");
    }
}
