package com.communitycleanup.service;

import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.event.EventDtos.*;
import com.communitycleanup.dto.report.ReportDtos.PhotoDto;
import com.communitycleanup.entity.*;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.mapper.DtoMapper;
import com.communitycleanup.repository.*;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.storage.ImageValidator;
import com.communitycleanup.service.storage.StorageService;
import com.communitycleanup.service.storage.StoredFile;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {

    public static final Set<EventStatus> ACTIVE_STATUSES = EnumSet.of(EventStatus.UPCOMING, EventStatus.OPEN,
            EventStatus.FULL, EventStatus.IN_PROGRESS);
    private static final Set<EventStatus> REGISTRATION_VISIBLE = EnumSet.of(EventStatus.UPCOMING, EventStatus.OPEN,
            EventStatus.FULL);
    private static final Map<EventStatus, Set<EventStatus>> TRANSITIONS = Map.of(
            EventStatus.UPCOMING, EnumSet.of(EventStatus.OPEN, EventStatus.IN_PROGRESS, EventStatus.CANCELLED),
            EventStatus.OPEN, EnumSet.of(EventStatus.IN_PROGRESS, EventStatus.CANCELLED),
            EventStatus.FULL, EnumSet.of(EventStatus.IN_PROGRESS, EventStatus.CANCELLED),
            EventStatus.IN_PROGRESS, EnumSet.of(EventStatus.COMPLETED),
            EventStatus.COMPLETED, EnumSet.noneOf(EventStatus.class),
            EventStatus.CANCELLED, EnumSet.noneOf(EventStatus.class));
    private static final Set<Role> PARTICIPANT_ROLES = EnumSet.of(Role.VOLUNTEER, Role.RESIDENT);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("EEE, d MMM yyyy", Locale.ENGLISH);

    private final EventRepository eventRepository;
    private final EventParticipantRepository participantRepository;
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final FeedbackRepository feedbackRepository;
    private final CertificateRepository certificateRepository;
    private final ReportWorkflowService reportWorkflow;
    private final RewardService rewardService;
    private final EmailService emailService;
    private final StorageService storageService;
    private final ImageValidator imageValidator;

    public record EventFilter(String scope, EventStatus status, String q, int page, int size) {
    }

    // ---------------------------------------------------------------- queries

    @Transactional(readOnly = true)
    public PageResponse<EventSummaryDto> list(EventFilter filter, UserPrincipal principal) {
        String scope = filter.scope() == null ? "upcoming" : filter.scope().toLowerCase(Locale.ROOT);
        LocalDate today = LocalDate.now();
        Specification<Event> spec = switch (scope) {
            case "past" -> (root, q, cb) -> cb.or(root.get("status").in(EventStatus.COMPLETED),
                    cb.and(root.get("status").in(EventStatus.CANCELLED), cb.lessThan(root.get("eventDate"), today)));
            case "mine" -> {
                requireAuth(principal);
                yield (root, q, cb) -> cb.equal(root.get("createdBy").get("id"), principal.getId());
            }
            case "registered" -> {
                requireAuth(principal);
                yield (root, q, cb) -> {
                    var sub = q.subquery(Long.class);
                    var p = sub.from(EventParticipant.class);
                    sub.select(p.get("event").get("id")).where(cb.equal(p.get("user").get("id"), principal.getId()));
                    return root.get("id").in(sub);
                };
            }
            case "all" -> (root, q, cb) -> cb.conjunction();
            default -> (root, q, cb) -> cb.and(root.get("status").in(ACTIVE_STATUSES),
                    cb.greaterThanOrEqualTo(root.get("eventDate"), today));
        };
        if (filter.status() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), filter.status()));
        }
        if (filter.q() != null && !filter.q().isBlank()) {
            String like = "%" + filter.q().trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, q, cb) -> cb.or(cb.like(cb.lower(root.get("title")), like),
                    cb.like(cb.lower(root.get("location")), like)));
        }
        Sort sort = "upcoming".equals(scope) || "registered".equals(scope)
                ? Sort.by("eventDate").ascending().and(Sort.by("startTime").ascending())
                : Sort.by("eventDate").descending().and(Sort.by("id").descending());
        Pageable pageable = PageRequest.of(Math.max(filter.page(), 0), Math.min(Math.max(filter.size(), 1), 50), sort);
        Page<Event> page = eventRepository.findAll(spec, pageable);
        return PageResponse.of(page, toSummaries(page.getContent()));
    }

    @Transactional(readOnly = true)
    public List<EventSummaryDto> upcomingPublic(int limit) {
        return toSummaries(eventRepository.findUpcoming(EnumSet.of(EventStatus.UPCOMING, EventStatus.OPEN,
                EventStatus.FULL), LocalDate.now(), PageRequest.of(0, limit)));
    }

    @Transactional(readOnly = true)
    public List<EventSummaryDto> organizerEvents(Long organizerId, Set<EventStatus> statuses, int limit) {
        return toSummaries(eventRepository.findByOrganizerAndStatuses(organizerId, statuses, PageRequest.of(0, limit)));
    }

    @Transactional(readOnly = true)
    public EventDto get(Long id, UserPrincipal principal) {
        return toDto(loadEvent(id), principal);
    }

    @Transactional(readOnly = true)
    public List<ParticipantDto> participants(Long eventId, UserPrincipal principal) {
        Event event = loadEvent(eventId);
        assertCanManage(event, principal);
        return participantRepository.findByEventIdOrderByRegistrationDateAsc(eventId).stream()
                .map(DtoMapper::toParticipantDto).toList();
    }

    @Transactional(readOnly = true)
    public List<MyParticipationDto> myParticipations(Long userId) {
        List<EventParticipant> participations = participantRepository.findByUserIdOrderByRegistrationDateDesc(userId);
        if (participations.isEmpty()) {
            return List.of();
        }
        List<Event> events = participations.stream().map(EventParticipant::getEvent).toList();
        Map<Long, EventSummaryDto> summaries = toSummaries(events).stream()
                .collect(Collectors.toMap(EventSummaryDto::id, s -> s));
        Set<Long> eventIds = summaries.keySet();
        Set<Long> withFeedback = feedbackRepository.findEventIdsWithFeedback(userId, eventIds);
        Map<Long, Long> certificates = certificateRepository.findByUserIdOrderByIssuedAtDesc(userId).stream()
                .collect(Collectors.toMap(c -> c.getEvent().getId(), Certificate::getId, (a, b) -> a));
        return participations.stream().map(p -> new MyParticipationDto(p.getId(), summaries.get(p.getEvent().getId()),
                p.getRegistrationDate(), p.isAttendance(), certificates.get(p.getEvent().getId()),
                withFeedback.contains(p.getEvent().getId()))).toList();
    }

    // ---------------------------------------------------------------- commands

    @Transactional
    public EventDto create(EventRequest request, UserPrincipal principal) {
        assertOrganizerRole(principal);
        validateSchedule(request);
        User creator = loadUser(principal.getId());
        Report report = request.relatedReportId() == null ? null : loadSchedulableReport(request.relatedReportId());

        Event event = eventRepository.save(Event.builder()
                .createdBy(creator)
                .relatedReport(report)
                .title(request.title().trim())
                .description(request.description().trim())
                .eventDate(request.eventDate())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .location(request.location().trim())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .volunteersRequired(request.volunteersRequired())
                .status(Boolean.FALSE.equals(request.publish()) ? EventStatus.UPCOMING : EventStatus.OPEN)
                .build());

        if (report != null && report.getStatus() == ReportStatus.VERIFIED) {
            reportWorkflow.transition(report, ReportStatus.CLEANING_SCHEDULED, creator,
                    "Cleanup event scheduled: " + event.getTitle() + " on " + event.getEventDate().format(DATE));
        }
        return toDto(event, principal);
    }

    @Transactional
    public EventDto update(Long id, EventRequest request, UserPrincipal principal) {
        Event event = loadEvent(id);
        assertCanManage(event, principal);
        if (!event.getStatus().isActive() || event.getStatus() == EventStatus.IN_PROGRESS) {
            throw ApiException.unprocessable("Only events that have not started can be edited");
        }
        if (!request.eventDate().equals(event.getEventDate())) {
            validateSchedule(request);
        } else if (request.endTime() != null && !request.endTime().isAfter(request.startTime())) {
            throw ApiException.badRequest("End time must be after start time");
        }
        long registered = participantRepository.countByEventId(id);
        if (request.volunteersRequired() < registered) {
            throw ApiException.unprocessable("Capacity cannot be lower than the " + registered
                    + " volunteers already registered");
        }
        event.setTitle(request.title().trim());
        event.setDescription(request.description().trim());
        event.setEventDate(request.eventDate());
        event.setStartTime(request.startTime());
        event.setEndTime(request.endTime());
        event.setLocation(request.location().trim());
        event.setLatitude(request.latitude());
        event.setLongitude(request.longitude());
        event.setVolunteersRequired(request.volunteersRequired());

        if (event.getRelatedReport() == null && request.relatedReportId() != null) {
            Report report = loadSchedulableReport(request.relatedReportId());
            event.setRelatedReport(report);
            if (report.getStatus() == ReportStatus.VERIFIED) {
                reportWorkflow.transition(report, ReportStatus.CLEANING_SCHEDULED, loadUser(principal.getId()),
                        "Cleanup event scheduled: " + event.getTitle());
            }
        }
        if (event.getStatus() == EventStatus.UPCOMING && Boolean.TRUE.equals(request.publish())) {
            event.setStatus(EventStatus.OPEN);
        }
        refreshCapacityStatus(event, registered);
        return toDto(event, principal);
    }

    @Transactional
    public void delete(Long id, UserPrincipal principal) {
        Event event = loadEvent(id);
        assertCanManage(event, principal);
        long registered = participantRepository.countByEventId(id);
        if (!principal.isAdmin() && registered > 0) {
            throw ApiException.unprocessable("This event already has registered volunteers. Cancel it instead.");
        }
        if (event.getStatus() == EventStatus.COMPLETED) {
            throw ApiException.unprocessable("Completed events cannot be deleted because rewards were issued");
        }
        Report report = event.getRelatedReport();
        List<String> publicIds = event.getPhotos().stream().map(Photo::getPublicId).filter(Objects::nonNull).toList();
        eventRepository.delete(event);
        eventRepository.flush();
        if (report != null) {
            revertReportIfUnscheduled(report, loadUser(principal.getId()), "Cleanup event removed");
        }
        publicIds.forEach(storageService::delete);
    }

    @Transactional
    public EventDto changeStatus(Long id, EventStatusRequest request, UserPrincipal principal) {
        Event event = loadEvent(id);
        assertCanManage(event, principal);
        EventStatus current = event.getStatus();
        EventStatus target = request.status();
        if (target == EventStatus.FULL) {
            throw ApiException.unprocessable("FULL is set automatically when the event reaches capacity");
        }
        if (!TRANSITIONS.get(current).contains(target)) {
            throw ApiException.unprocessable("An event cannot move from " + current + " to " + target);
        }
        User actor = loadUser(principal.getId());
        event.setStatus(target);
        if (target == EventStatus.OPEN) {
            refreshCapacityStatus(event, participantRepository.countByEventId(id));
        }

        Report report = event.getRelatedReport();
        switch (target) {
            case IN_PROGRESS -> {
                if (report != null && report.getStatus() == ReportStatus.CLEANING_SCHEDULED) {
                    reportWorkflow.transition(report, ReportStatus.IN_PROGRESS, actor,
                            "Cleanup started: " + event.getTitle());
                }
            }
            case COMPLETED -> completeEvent(event, actor, request.comment());
            case CANCELLED -> {
                notifyParticipants(event, "Event cancelled: " + event.getTitle(), "This cleanup event has been cancelled",
                        "We're sorry — \"" + event.getTitle() + "\" scheduled for " + event.getEventDate().format(DATE)
                                + " has been cancelled by the organiser."
                                + (request.comment() != null && !request.comment().isBlank()
                                ? "\n\nReason: " + request.comment() : ""));
                if (report != null) {
                    revertReportIfUnscheduled(report, actor, "Cleanup event cancelled: " + event.getTitle());
                }
            }
            default -> {
            }
        }
        return toDto(event, principal);
    }

    @Transactional
    public EventDto register(Long eventId, UserPrincipal principal) {
        if (!PARTICIPANT_ROLES.contains(principal.getRole())) {
            throw ApiException.forbidden("Only volunteers and residents can register for cleanup events");
        }
        Event event = eventRepository.findByIdForUpdate(eventId).orElseThrow(() -> ApiException.notFound("Event"));
        if (participantRepository.existsByEventIdAndUserId(eventId, principal.getId())) {
            throw ApiException.conflict("You are already registered for this event");
        }
        String blocked = registrationBlockedReason(event, participantRepository.countByEventId(eventId));
        if (blocked != null) {
            throw ApiException.unprocessable(blocked);
        }
        User user = loadUser(principal.getId());
        participantRepository.save(EventParticipant.builder().event(event).user(user).attendance(false).build());
        refreshCapacityStatus(event, participantRepository.countByEventId(eventId));

        emailService.send(user.getEmail(), "Registration confirmed: " + event.getTitle(), "You're registered!",
                "You are registered for \"" + event.getTitle() + "\" on " + event.getEventDate().format(DATE)
                        + " at " + event.getStartTime() + ".\n\nMeeting point: " + event.getLocation()
                        + "\n\nPlease bring water and wear comfortable clothes. Gloves and bags are usually provided.",
                "View event", "/events/" + event.getId());
        return toDto(event, principal);
    }

    @Transactional
    public EventDto unregister(Long eventId, UserPrincipal principal) {
        Event event = eventRepository.findByIdForUpdate(eventId).orElseThrow(() -> ApiException.notFound("Event"));
        EventParticipant participant = participantRepository.findByEventIdAndUserId(eventId, principal.getId())
                .orElseThrow(() -> ApiException.notFound("Registration"));
        if (!REGISTRATION_VISIBLE.contains(event.getStatus())) {
            throw ApiException.unprocessable("You can no longer cancel your registration for this event");
        }
        event.getParticipants().remove(participant);
        participantRepository.delete(participant);
        participantRepository.flush();
        refreshCapacityStatus(event, participantRepository.countByEventId(eventId));
        return toDto(event, principal);
    }

    @Transactional
    public ParticipantDto markAttendance(Long eventId, Long participantId, boolean attended, UserPrincipal principal) {
        Event event = loadEvent(eventId);
        assertCanManage(event, principal);
        EventParticipant participant = participantRepository.findWithDetailsById(participantId)
                .filter(p -> p.getEvent().getId().equals(eventId))
                .orElseThrow(() -> ApiException.notFound("Participant"));
        if (participant.getUser().getId().equals(principal.getId())) {
            throw ApiException.forbidden("You cannot mark your own attendance");
        }
        if (event.getStatus() != EventStatus.IN_PROGRESS && event.getStatus() != EventStatus.COMPLETED) {
            throw ApiException.unprocessable("Attendance can be recorded once the event is in progress");
        }
        if (event.getStatus() == EventStatus.COMPLETED && participant.isAttendance() && !attended) {
            throw ApiException.conflict("Attendance is final after the event is completed and rewards were issued");
        }
        participant.setAttendance(attended);
        if (event.getStatus() == EventStatus.COMPLETED && attended) {
            rewardService.rewardAttendance(participant);
        }
        return DtoMapper.toParticipantDto(participant);
    }

    @Transactional
    public EventDto addPhotos(Long eventId, PhotoType type, List<MultipartFile> files, UserPrincipal principal) {
        Event event = loadEvent(eventId);
        assertCanManage(event, principal);
        if (type != PhotoType.BEFORE && type != PhotoType.AFTER) {
            throw ApiException.badRequest("Event photos must be BEFORE or AFTER photos");
        }
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw ApiException.unprocessable("Photos cannot be added to a cancelled event");
        }
        imageValidator.validateAll(files);
        if (photoRepository.countByEventId(eventId) + files.size() > 20) {
            throw ApiException.badRequest("An event can have at most 20 photos");
        }
        User uploader = loadUser(principal.getId());
        for (MultipartFile file : files) {
            StoredFile stored = storageService.upload(file, "events");
            Photo photo = photoRepository.save(Photo.builder().event(event).photoUrl(stored.url())
                    .publicId(stored.publicId()).photoType(type).uploadedBy(uploader).build());
            event.getPhotos().add(photo);
        }
        return toDto(event, principal);
    }

    // ---------------------------------------------------------------- internals

    private void completeEvent(Event event, User actor, String comment) {
        List<EventParticipant> participants = participantRepository.findByEventIdOrderByRegistrationDateAsc(event.getId());
        participants.stream().filter(EventParticipant::isAttendance).forEach(rewardService::rewardAttendance);

        Report report = event.getRelatedReport();
        if (report != null) {
            String note = comment != null && !comment.isBlank() ? comment : "Cleanup completed: " + event.getTitle();
            if (report.getStatus() == ReportStatus.CLEANING_SCHEDULED) {
                reportWorkflow.transition(report, ReportStatus.IN_PROGRESS, actor, "Cleanup started: " + event.getTitle());
            }
            if (report.getStatus() == ReportStatus.IN_PROGRESS) {
                reportWorkflow.transition(report, ReportStatus.COMPLETED, actor, note);
            }
        }
    }

    private void revertReportIfUnscheduled(Report report, User actor, String comment) {
        if (report.getStatus() == ReportStatus.CLEANING_SCHEDULED
                && eventRepository.countByRelatedReportIdAndStatusIn(report.getId(), ACTIVE_STATUSES) == 0) {
            reportWorkflow.transition(report, ReportStatus.VERIFIED, actor, comment);
        }
    }

    private void refreshCapacityStatus(Event event, long registered) {
        if (event.getStatus() == EventStatus.OPEN && registered >= event.getVolunteersRequired()) {
            event.setStatus(EventStatus.FULL);
        } else if (event.getStatus() == EventStatus.FULL && registered < event.getVolunteersRequired()) {
            event.setStatus(EventStatus.OPEN);
        }
    }

    private String registrationBlockedReason(Event event, long registered) {
        return switch (event.getStatus()) {
            case CANCELLED -> "This event has been cancelled";
            case COMPLETED -> "This event has already been completed";
            case IN_PROGRESS -> "This event is already in progress";
            case UPCOMING -> "Registration for this event has not opened yet";
            case FULL -> "This event is full";
            case OPEN -> {
                if (registered >= event.getVolunteersRequired()) {
                    yield "This event is full";
                }
                if (event.getEventDate().isBefore(LocalDate.now())) {
                    yield "This event date has passed";
                }
                yield null;
            }
        };
    }

    private void notifyParticipants(Event event, String subject, String heading, String body) {
        participantRepository.findByEventIdOrderByRegistrationDateAsc(event.getId()).forEach(p ->
                emailService.send(p.getUser().getEmail(), subject, heading, body, "Browse other events", "/events"));
    }

    private void validateSchedule(EventRequest request) {
        if (request.eventDate().isBefore(LocalDate.now())) {
            throw ApiException.badRequest("Event date cannot be in the past");
        }
        if (request.endTime() != null && !request.endTime().isAfter(request.startTime())) {
            throw ApiException.badRequest("End time must be after start time");
        }
    }

    private Report loadSchedulableReport(Long reportId) {
        Report report = reportRepository.findWithUserById(reportId).orElseThrow(() -> ApiException.notFound("Report"));
        if (report.getStatus() != ReportStatus.VERIFIED && report.getStatus() != ReportStatus.CLEANING_SCHEDULED) {
            throw ApiException.unprocessable("Cleanup events can only be linked to verified reports");
        }
        return report;
    }

    private void assertOrganizerRole(UserPrincipal principal) {
        if (principal.getRole() != Role.NGO && principal.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Only NGOs and administrators can organise cleanup events");
        }
    }

    boolean canManage(Event event, UserPrincipal principal) {
        return principal != null && (principal.isAdmin() || event.getCreatedBy().getId().equals(principal.getId()));
    }

    private void assertCanManage(Event event, UserPrincipal principal) {
        requireAuth(principal);
        if (!canManage(event, principal)) {
            throw ApiException.forbidden("Only the event organiser or an administrator can manage this event");
        }
    }

    private static void requireAuth(UserPrincipal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Authentication is required");
        }
    }

    Event loadEvent(Long id) {
        return eventRepository.findWithDetailsById(id).orElseThrow(() -> ApiException.notFound("Event"));
    }

    private User loadUser(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }

    List<EventSummaryDto> toSummaries(List<Event> events) {
        if (events.isEmpty()) {
            return List.of();
        }
        List<Long> eventIds = events.stream().map(Event::getId).toList();
        Map<Long, Long> counts = new HashMap<>();
        participantRepository.countByEventIds(eventIds).forEach(row -> counts.put((Long) row[0], (Long) row[1]));
        Map<Long, String> covers = coverImages(events);
        return events.stream().map(e -> DtoMapper.toEventSummary(e, counts.getOrDefault(e.getId(), 0L),
                covers.get(e.getId()))).toList();
    }

    /** Cover image: the latest AFTER photo for completed events, otherwise the related report's first photo. */
    private Map<Long, String> coverImages(List<Event> events) {
        Map<Long, String> covers = new HashMap<>();
        Map<Long, String> afterPhotos = new HashMap<>();
        Map<Long, String> beforePhotos = new HashMap<>();
        photoRepository.findByEventIds(events.stream().map(Event::getId).toList()).forEach(p -> {
            if (p.getPhotoType() == PhotoType.AFTER) {
                afterPhotos.put(p.getEvent().getId(), p.getPhotoUrl());
            } else {
                beforePhotos.putIfAbsent(p.getEvent().getId(), p.getPhotoUrl());
            }
        });
        List<Long> reportIds = events.stream().map(Event::getRelatedReport).filter(Objects::nonNull)
                .map(Report::getId).distinct().toList();
        Map<Long, String> reportPhotos = new HashMap<>();
        if (!reportIds.isEmpty()) {
            photoRepository.findByReportIds(reportIds)
                    .forEach(p -> reportPhotos.putIfAbsent(p.getReport().getId(), p.getPhotoUrl()));
        }
        for (Event e : events) {
            String cover = e.getStatus() == EventStatus.COMPLETED ? afterPhotos.get(e.getId()) : null;
            if (cover == null && e.getRelatedReport() != null) {
                cover = reportPhotos.get(e.getRelatedReport().getId());
            }
            if (cover == null) {
                cover = beforePhotos.getOrDefault(e.getId(), afterPhotos.get(e.getId()));
            }
            covers.put(e.getId(), cover);
        }
        return covers;
    }

    private EventDto toDto(Event event, UserPrincipal principal) {
        long registered = participantRepository.countByEventId(event.getId());
        List<EventParticipant> participants = participantRepository.findByEventIdOrderByRegistrationDateAsc(event.getId());
        long attended = participants.stream().filter(EventParticipant::isAttendance).count();
        List<PhotoDto> photos = photoRepository.findByEventIds(List.of(event.getId())).stream()
                .map(DtoMapper::toPhotoDto).toList();
        String cover = coverImages(List.of(event)).get(event.getId());
        boolean manage = canManage(event, principal);
        Set<EventStatus> transitions = manage ? TRANSITIONS.get(event.getStatus()) : Set.of();

        ViewerContext viewer = null;
        if (principal != null) {
            Optional<EventParticipant> mine = participants.stream()
                    .filter(p -> p.getUser().getId().equals(principal.getId())).findFirst();
            boolean registeredSelf = mine.isPresent();
            boolean attendedSelf = mine.map(EventParticipant::isAttendance).orElse(false);
            String blocked;
            if (!PARTICIPANT_ROLES.contains(principal.getRole())) {
                blocked = "Only volunteers and residents can register for events";
            } else if (registeredSelf) {
                blocked = "You are already registered";
            } else {
                blocked = registrationBlockedReason(event, registered);
            }
            boolean feedbackSubmitted = registeredSelf
                    && feedbackRepository.existsByUserIdAndEventId(principal.getId(), event.getId());
            Long certificateId = attendedSelf ? certificateRepository
                    .findByUserIdAndEventId(principal.getId(), event.getId()).map(Certificate::getId).orElse(null) : null;
            viewer = new ViewerContext(registeredSelf, attendedSelf, blocked == null, blocked, manage,
                    event.getStatus() == EventStatus.COMPLETED && attendedSelf && !feedbackSubmitted,
                    feedbackSubmitted, certificateId);
        }

        return new EventDto(event.getId(), event.getTitle(), event.getDescription(), event.getEventDate(),
                event.getStartTime(), event.getEndTime(), event.getLocation(), event.getLatitude(),
                event.getLongitude(), event.getVolunteersRequired(), registered,
                Math.max(0, event.getVolunteersRequired() - registered), attended, event.getStatus(),
                DtoMapper.toUserSummary(event.getCreatedBy()), DtoMapper.toRelatedReport(event.getRelatedReport()),
                event.getCreatedAt(), photos, cover, feedbackRepository.averageRatingForEvent(event.getId()),
                feedbackRepository.countByEventId(event.getId()), transitions, viewer);
    }
}
