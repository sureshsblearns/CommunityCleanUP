package com.communitycleanup.service;

import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.event.EventDtos.EventSummaryDto;
import com.communitycleanup.dto.report.ReportDtos.*;
import com.communitycleanup.entity.*;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.mapper.DtoMapper;
import com.communitycleanup.repository.*;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.storage.ImageValidator;
import com.communitycleanup.service.storage.StorageService;
import com.communitycleanup.service.storage.StoredFile;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    /** Statuses that are visible to every signed-in user (community reports). */
    public static final Set<ReportStatus> PUBLIC_STATUSES = EnumSet.of(ReportStatus.VERIFIED,
            ReportStatus.CLEANING_SCHEDULED, ReportStatus.IN_PROGRESS, ReportStatus.COMPLETED);
    private static final Set<String> SORTABLE = Set.of("createdDate", "updatedDate", "urgency", "status", "title");
    private static final Set<EventStatus> ACTIVE_EVENT_STATUSES = EnumSet.of(EventStatus.UPCOMING, EventStatus.OPEN,
            EventStatus.FULL, EventStatus.IN_PROGRESS);

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final EventRepository eventRepository;
    private final EventParticipantRepository participantRepository;
    private final ReportStatusHistoryRepository historyRepository;
    private final ReportWorkflowService workflow;
    private final StorageService storageService;
    private final ImageValidator imageValidator;
    private final EmailService emailService;

    public record ReportFilter(String scope, ReportStatus status, Urgency urgency, WasteType wasteType, String q,
                               int page, int size, String sort, String direction) {
    }

    @Transactional
    public ReportDto create(ReportRequest request, List<MultipartFile> photos, UserPrincipal principal) {
        imageValidator.validateAll(photos);
        User reporter = loadUser(principal.getId());
        Report report = Report.builder()
                .user(reporter)
                .title(request.title().trim())
                .description(request.description().trim())
                .wasteType(request.wasteType())
                .urgency(request.urgency())
                .location(request.location().trim())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .status(ReportStatus.PENDING)
                .build();
        report = reportRepository.save(report);
        workflow.recordInitial(report, reporter);
        storePhotos(report, photos, reporter);

        emailService.send(reporter.getEmail(), "Report received: " + report.getTitle(), "Thanks for your report!",
                "We received your report \"" + report.getTitle() + "\". An administrator will review it shortly "
                        + "and you will be notified when its status changes.",
                "Track your report", "/reports/" + report.getId());
        return toDto(report, principal);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReportSummaryDto> list(ReportFilter filter, UserPrincipal principal) {
        Specification<Report> spec = visibility(filter.scope(), principal)
                .and(equal("status", filter.status()))
                .and(equal("urgency", filter.urgency()))
                .and(equal("wasteType", filter.wasteType()))
                .and(search(filter.q()));
        String sortField = SORTABLE.contains(filter.sort()) ? filter.sort() : "createdDate";
        Sort.Direction direction = "asc".equalsIgnoreCase(filter.direction()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(filter.page(), 0), Math.min(Math.max(filter.size(), 1), 50),
                Sort.by(direction, sortField).and(Sort.by(Sort.Direction.DESC, "id")));
        Page<Report> page = reportRepository.findAll(spec, pageable);
        return PageResponse.of(page, toSummaries(page.getContent()));
    }

    @Transactional(readOnly = true)
    public List<ReportSummaryDto> recentForUser(Long userId) {
        return toSummaries(reportRepository.findTop5ByUserIdOrderByCreatedDateDesc(userId));
    }

    @Transactional(readOnly = true)
    public List<MapPointDto> mapPoints(UserPrincipal principal) {
        Set<ReportStatus> statuses = principal.isAdmin() ? EnumSet.complementOf(EnumSet.of(ReportStatus.CANCELLED))
                : PUBLIC_STATUSES;
        return reportRepository.findMappable(statuses, PageRequest.of(0, 300)).stream()
                .map(r -> new MapPointDto(r.getId(), r.getTitle(), r.getStatus(), r.getUrgency(), r.getLatitude(),
                        r.getLongitude()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ReportDto get(Long id, UserPrincipal principal) {
        Report report = loadReport(id);
        assertCanView(report, principal);
        return toDto(report, principal);
    }

    @Transactional
    public ReportDto update(Long id, ReportRequest request, UserPrincipal principal) {
        Report report = loadReport(id);
        if (!canEdit(report, principal)) {
            throw ApiException.forbidden(isOwner(report, principal)
                    ? "Reports can only be edited while they are pending review or after rejection"
                    : "You can only edit your own reports");
        }
        report.setTitle(request.title().trim());
        report.setDescription(request.description().trim());
        report.setWasteType(request.wasteType());
        report.setUrgency(request.urgency());
        report.setLocation(request.location().trim());
        report.setLatitude(request.latitude());
        report.setLongitude(request.longitude());
        if (report.getStatus() == ReportStatus.REJECTED && isOwner(report, principal)) {
            workflow.transition(report, ReportStatus.PENDING, loadUser(principal.getId()),
                    "Report updated and resubmitted for review");
        }
        return toDto(report, principal);
    }

    @Transactional
    public void delete(Long id, UserPrincipal principal) {
        Report report = loadReport(id);
        boolean ownerPending = isOwner(report, principal) && report.getStatus() == ReportStatus.PENDING;
        if (!principal.isAdmin() && !ownerPending) {
            throw ApiException.forbidden("Only pending reports can be deleted by their author");
        }
        eventRepository.findByRelatedReportIdOrderByEventDateAsc(report.getId())
                .forEach(event -> event.setRelatedReport(null));
        List<String> publicIds = report.getPhotos().stream().map(Photo::getPublicId).filter(Objects::nonNull).toList();
        reportRepository.delete(report);
        publicIds.forEach(storageService::delete);
    }

    @Transactional
    public ReportDto changeStatus(Long id, StatusUpdateRequest request, UserPrincipal principal) {
        Report report = loadReport(id);
        ReportStatus target = request.status();
        if (!allowedTransitionsFor(report, principal).contains(target)) {
            if (!report.getStatus().canTransitionTo(target)) {
                throw ApiException.unprocessable("A report cannot move from "
                        + ReportWorkflowService.label(report.getStatus()) + " to "
                        + ReportWorkflowService.label(target));
            }
            throw ApiException.forbidden("You are not allowed to change this report to "
                    + ReportWorkflowService.label(target));
        }
        if (target == ReportStatus.REJECTED && (request.comment() == null || request.comment().isBlank())) {
            throw ApiException.badRequest("Please provide a reason when rejecting a report");
        }
        if (target == ReportStatus.CLEANING_SCHEDULED
                && eventRepository.countByRelatedReportIdAndStatusIn(report.getId(), ACTIVE_EVENT_STATUSES) == 0) {
            throw ApiException.unprocessable("Create a cleanup event for this report before marking it as scheduled");
        }
        workflow.transition(report, target, loadUser(principal.getId()), request.comment());
        return toDto(report, principal);
    }

    @Transactional
    public ReportDto addPhotos(Long id, List<MultipartFile> files, UserPrincipal principal) {
        Report report = loadReport(id);
        if (!canEdit(report, principal)) {
            throw ApiException.forbidden("You cannot add photos to this report");
        }
        imageValidator.validateAll(files);
        if (photoRepository.countByReportId(id) + files.size() > 10) {
            throw ApiException.badRequest("A report can have at most 10 photos");
        }
        storePhotos(report, files, loadUser(principal.getId()));
        return toDto(report, principal);
    }

    // ---- helpers shared with other services ----

    Report loadReport(Long id) {
        return reportRepository.findWithUserById(id).orElseThrow(() -> ApiException.notFound("Report"));
    }

    boolean isOwner(Report report, UserPrincipal principal) {
        return report.getUser().getId().equals(principal.getId());
    }

    boolean canEdit(Report report, UserPrincipal principal) {
        if (principal.isAdmin()) {
            return report.getStatus() != ReportStatus.COMPLETED && report.getStatus() != ReportStatus.CANCELLED;
        }
        return isOwner(report, principal)
                && (report.getStatus() == ReportStatus.PENDING || report.getStatus() == ReportStatus.REJECTED);
    }

    private void assertCanView(Report report, UserPrincipal principal) {
        if (!principal.isAdmin() && !isOwner(report, principal) && !PUBLIC_STATUSES.contains(report.getStatus())) {
            throw ApiException.forbidden("This report is not publicly visible yet");
        }
    }

    /** Status changes the given user may request right now, combining the state machine with role rules. */
    Set<ReportStatus> allowedTransitionsFor(Report report, UserPrincipal principal) {
        Set<ReportStatus> possible = report.getStatus().allowedTransitions();
        Set<ReportStatus> allowed = EnumSet.noneOf(ReportStatus.class);
        for (ReportStatus target : possible) {
            if (principal.isAdmin()) {
                if (target != ReportStatus.PENDING && target != ReportStatus.CANCELLED) {
                    allowed.add(target);
                }
            } else if (principal.getRole() == Role.NGO && organizesEventFor(report, principal)) {
                if (target == ReportStatus.IN_PROGRESS || target == ReportStatus.COMPLETED) {
                    allowed.add(target);
                }
            } else if (isOwner(report, principal) && target == ReportStatus.CANCELLED) {
                allowed.add(target);
            }
        }
        return allowed;
    }

    private boolean organizesEventFor(Report report, UserPrincipal principal) {
        return eventRepository.findByRelatedReportIdOrderByEventDateAsc(report.getId()).stream()
                .anyMatch(e -> e.getCreatedBy().getId().equals(principal.getId())
                        && e.getStatus() != EventStatus.CANCELLED);
    }

    private void storePhotos(Report report, List<MultipartFile> files, User uploader) {
        for (MultipartFile file : files) {
            StoredFile stored = storageService.upload(file, "reports");
            Photo photo = Photo.builder()
                    .photoUrl(stored.url())
                    .publicId(stored.publicId())
                    .photoType(PhotoType.REPORT)
                    .uploadedBy(uploader)
                    .build();
            report.addPhoto(photo);
            photoRepository.save(photo);
        }
    }

    private User loadUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }

    private List<ReportSummaryDto> toSummaries(List<Report> reports) {
        if (reports.isEmpty()) {
            return List.of();
        }
        Map<Long, List<Photo>> photos = photoRepository.findByReportIds(reports.stream().map(Report::getId).toList())
                .stream().collect(Collectors.groupingBy(p -> p.getReport().getId()));
        return reports.stream().map(r -> {
            List<Photo> list = photos.getOrDefault(r.getId(), List.of());
            return DtoMapper.toReportSummary(r, list.isEmpty() ? null : list.getFirst().getPhotoUrl(), list.size());
        }).toList();
    }

    private ReportDto toDto(Report report, UserPrincipal principal) {
        List<Event> events = eventRepository.findByRelatedReportIdOrderByEventDateAsc(report.getId());
        Map<Long, Long> counts = new HashMap<>();
        Map<Long, String> afterPhotos = new HashMap<>();
        List<PhotoDto> cleanupPhotos = List.of();
        if (!events.isEmpty()) {
            List<Long> eventIds = events.stream().map(Event::getId).toList();
            participantRepository.countByEventIds(eventIds)
                    .forEach(row -> counts.put((Long) row[0], (Long) row[1]));
            List<Photo> eventPhotos = photoRepository.findByEventIds(eventIds);
            eventPhotos.stream().filter(p -> p.getPhotoType() == PhotoType.AFTER)
                    .forEach(p -> afterPhotos.put(p.getEvent().getId(), p.getPhotoUrl()));
            cleanupPhotos = eventPhotos.stream().map(DtoMapper::toPhotoDto).toList();
        }
        List<Photo> reportPhotos = report.getPhotos();
        String reportCover = reportPhotos.isEmpty() ? null : reportPhotos.getFirst().getPhotoUrl();
        List<EventSummaryDto> related = events.stream()
                .map(e -> DtoMapper.toEventSummary(e, counts.getOrDefault(e.getId(), 0L),
                        e.getStatus() == EventStatus.COMPLETED
                                ? afterPhotos.getOrDefault(e.getId(), reportCover) : reportCover))
                .toList();
        boolean owner = isOwner(report, principal);
        return new ReportDto(
                report.getId(), report.getTitle(), report.getDescription(), report.getWasteType(),
                report.getUrgency(), report.getStatus(), report.getLocation(), report.getLatitude(),
                report.getLongitude(), report.getAdminComment(), DtoMapper.toUserSummary(report.getUser()),
                report.getCreatedDate(), report.getUpdatedDate(),
                reportPhotos.stream().map(DtoMapper::toPhotoDto).toList(),
                cleanupPhotos,
                historyRepository.findByReportIdOrderByChangedAtAscIdAsc(report.getId()).stream()
                        .map(DtoMapper::toHistoryDto).toList(),
                related,
                allowedTransitionsFor(report, principal),
                canEdit(report, principal),
                principal.isAdmin() || (owner && report.getStatus() == ReportStatus.PENDING));
    }

    // ---- specifications ----

    private Specification<Report> visibility(String scope, UserPrincipal principal) {
        if ("mine".equalsIgnoreCase(scope)) {
            return (root, query, cb) -> cb.equal(root.get("user").get("id"), principal.getId());
        }
        if (principal.isAdmin()) {
            return (root, query, cb) -> cb.conjunction();
        }
        return (root, query, cb) -> cb.or(root.get("status").in(PUBLIC_STATUSES),
                cb.equal(root.get("user").get("id"), principal.getId()));
    }

    private static Specification<Report> equal(String field, Object value) {
        return (root, query, cb) -> value == null ? cb.conjunction() : cb.equal(root.get(field), value);
    }

    private static Specification<Report> search(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) {
                return cb.conjunction();
            }
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            Predicate title = cb.like(cb.lower(root.get("title")), like);
            Predicate location = cb.like(cb.lower(root.get("location")), like);
            return cb.or(title, location);
        };
    }
}
