package com.communitycleanup.service;

import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.gallery.GalleryDtos.GalleryFromEventRequest;
import com.communitycleanup.dto.gallery.GalleryDtos.GalleryItemDto;
import com.communitycleanup.dto.gallery.GalleryDtos.GalleryRequest;
import com.communitycleanup.entity.*;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.mapper.DtoMapper;
import com.communitycleanup.repository.EventRepository;
import com.communitycleanup.repository.GalleryItemRepository;
import com.communitycleanup.repository.PhotoRepository;
import com.communitycleanup.repository.UserRepository;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.storage.ImageValidator;
import com.communitycleanup.service.storage.StorageService;
import com.communitycleanup.service.storage.StoredFile;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

/**
 * Before/after showcase. Public visitors only see approved items; NGO submissions wait for admin approval.
 */
@Service
@RequiredArgsConstructor
public class GalleryService {

    private final GalleryItemRepository galleryRepository;
    private final EventRepository eventRepository;
    private final PhotoRepository photoRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final ImageValidator imageValidator;

    @Transactional(readOnly = true)
    public PageResponse<GalleryItemDto> list(String filter, int page, int size, UserPrincipal principal) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by(Sort.Direction.DESC, "completionDate", "createdAt"));
        boolean admin = principal != null && principal.isAdmin();
        if (admin && "all".equalsIgnoreCase(filter)) {
            return PageResponse.of(galleryRepository.findAllBy(pageable), DtoMapper::toGalleryDto);
        }
        if (admin && "pending".equalsIgnoreCase(filter)) {
            return PageResponse.of(galleryRepository.findByApproved(false, pageable), DtoMapper::toGalleryDto);
        }
        return PageResponse.of(galleryRepository.findByApproved(true, pageable), DtoMapper::toGalleryDto);
    }

    @Transactional(readOnly = true)
    public GalleryItemDto get(Long id, UserPrincipal principal) {
        GalleryItem item = load(id);
        if (!item.isApproved() && (principal == null || !canModify(item, principal))) {
            throw ApiException.notFound("Gallery item");
        }
        return DtoMapper.toGalleryDto(item);
    }

    @Transactional
    public GalleryItemDto create(GalleryRequest request, MultipartFile before, MultipartFile after,
                                 UserPrincipal principal) {
        assertContributor(principal);
        imageValidator.validate(before);
        imageValidator.validate(after);
        Event event = request.eventId() == null ? null : loadEvent(request.eventId(), principal);
        StoredFile beforeFile = storageService.upload(before, "gallery");
        StoredFile afterFile = storageService.upload(after, "gallery");
        GalleryItem item = GalleryItem.builder()
                .event(event)
                .title(request.title().trim())
                .description(trimToNull(request.description()))
                .location(trimToNull(request.location()) != null ? request.location().trim()
                        : event != null ? event.getLocation() : null)
                .completionDate(request.completionDate() != null ? request.completionDate()
                        : event != null ? event.getEventDate() : LocalDate.now())
                .beforeImageUrl(beforeFile.url())
                .beforePublicId(beforeFile.publicId())
                .afterImageUrl(afterFile.url())
                .afterPublicId(afterFile.publicId())
                .approved(principal.isAdmin() && !Boolean.FALSE.equals(request.approved()))
                .createdBy(userRepository.getReferenceById(principal.getId()))
                .build();
        return DtoMapper.toGalleryDto(galleryRepository.save(item));
    }

    /** Builds a gallery entry from a completed event's own BEFORE and AFTER photos. */
    @Transactional
    public GalleryItemDto createFromEvent(Long eventId, GalleryFromEventRequest request, UserPrincipal principal) {
        assertContributor(principal);
        Event event = loadEvent(eventId, principal);
        if (event.getStatus() != EventStatus.COMPLETED) {
            throw ApiException.unprocessable("Only completed events can be added to the gallery");
        }
        if (galleryRepository.existsByEventId(eventId)) {
            throw ApiException.conflict("This event is already in the gallery");
        }
        List<Photo> before = photoRepository.findByEventIdAndPhotoTypeOrderByUploadedDateAsc(eventId, PhotoType.BEFORE);
        List<Photo> after = photoRepository.findByEventIdAndPhotoTypeOrderByUploadedDateAsc(eventId, PhotoType.AFTER);
        if (before.isEmpty() || after.isEmpty()) {
            throw ApiException.unprocessable("Upload at least one BEFORE and one AFTER photo for this event first");
        }
        GalleryItem item = GalleryItem.builder()
                .event(event)
                .title(request != null && trimToNull(request.title()) != null ? request.title().trim() : event.getTitle())
                .description(request != null && trimToNull(request.description()) != null
                        ? request.description().trim() : event.getDescription())
                .location(event.getLocation())
                .completionDate(event.getEventDate())
                .beforeImageUrl(before.getFirst().getPhotoUrl())
                .afterImageUrl(after.getLast().getPhotoUrl())
                .approved(principal.isAdmin())
                .createdBy(userRepository.getReferenceById(principal.getId()))
                .build();
        return DtoMapper.toGalleryDto(galleryRepository.save(item));
    }

    @Transactional
    public GalleryItemDto update(Long id, GalleryRequest request, UserPrincipal principal) {
        GalleryItem item = load(id);
        if (!principal.isAdmin()) {
            throw ApiException.forbidden("Only administrators can edit gallery entries");
        }
        item.setTitle(request.title().trim());
        item.setDescription(trimToNull(request.description()));
        item.setLocation(trimToNull(request.location()));
        if (request.completionDate() != null) {
            item.setCompletionDate(request.completionDate());
        }
        if (request.approved() != null) {
            item.setApproved(request.approved());
        }
        return DtoMapper.toGalleryDto(item);
    }

    @Transactional
    public GalleryItemDto setApproval(Long id, boolean approved) {
        GalleryItem item = load(id);
        item.setApproved(approved);
        return DtoMapper.toGalleryDto(item);
    }

    @Transactional
    public void delete(Long id, UserPrincipal principal) {
        GalleryItem item = load(id);
        if (!canModify(item, principal) || (!principal.isAdmin() && item.isApproved())) {
            throw ApiException.forbidden("You cannot delete this gallery entry");
        }
        galleryRepository.delete(item);
        storageService.delete(item.getBeforePublicId());
        storageService.delete(item.getAfterPublicId());
    }

    private boolean canModify(GalleryItem item, UserPrincipal principal) {
        return principal.isAdmin()
                || (item.getCreatedBy() != null && item.getCreatedBy().getId().equals(principal.getId()));
    }

    private void assertContributor(UserPrincipal principal) {
        if (principal.getRole() != Role.ADMIN && principal.getRole() != Role.NGO) {
            throw ApiException.forbidden("Only NGOs and administrators can add gallery entries");
        }
    }

    private Event loadEvent(Long eventId, UserPrincipal principal) {
        Event event = eventRepository.findWithDetailsById(eventId).orElseThrow(() -> ApiException.notFound("Event"));
        if (!principal.isAdmin() && !event.getCreatedBy().getId().equals(principal.getId())) {
            throw ApiException.forbidden("You can only add gallery entries for events you organised");
        }
        return event;
    }

    private GalleryItem load(Long id) {
        return galleryRepository.findWithDetailsById(id).orElseThrow(() -> ApiException.notFound("Gallery item"));
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
