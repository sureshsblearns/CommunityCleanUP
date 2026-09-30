package com.communitycleanup.service;

import com.communitycleanup.dto.common.LabelValue;
import com.communitycleanup.dto.dashboard.DashboardDtos.ActivityDto;
import com.communitycleanup.dto.dashboard.DashboardDtos.DashboardDto;
import com.communitycleanup.dto.dashboard.DashboardDtos.PublicStatsDto;
import com.communitycleanup.dto.event.EventDtos.EventSummaryDto;
import com.communitycleanup.dto.event.EventDtos.MyParticipationDto;
import com.communitycleanup.dto.report.ReportDtos.ReportSummaryDto;
import com.communitycleanup.dto.reward.RewardDtos.BadgeDto;
import com.communitycleanup.dto.reward.RewardDtos.RewardTransactionDto;
import com.communitycleanup.entity.*;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.repository.*;
import com.communitycleanup.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final Set<EventStatus> UPCOMING = EnumSet.of(EventStatus.UPCOMING, EventStatus.OPEN,
            EventStatus.FULL, EventStatus.IN_PROGRESS);

    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final EventRepository eventRepository;
    private final EventParticipantRepository participantRepository;
    private final BadgeRepository badgeRepository;
    private final CertificateRepository certificateRepository;
    private final ReportService reportService;
    private final EventService eventService;
    private final RewardService rewardService;

    @Transactional(readOnly = true)
    public DashboardDto forUser(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId()).orElseThrow(() -> ApiException.notFound("User"));
        Long id = user.getId();

        long reportsSubmitted = reportRepository.countByUserId(id);
        long reportsCompleted = reportRepository.countByUserIdAndStatus(id, ReportStatus.COMPLETED);
        long reportsPending = reportRepository.countByUserIdAndStatus(id, ReportStatus.PENDING);
        List<ReportSummaryDto> recentReports = reportService.recentForUser(id);
        List<LabelValue> breakdown = reportRepository.countGroupedByStatusForUser(id).stream()
                .map(r -> new LabelValue(String.valueOf(r[0]), (Long) r[1])).toList();

        long eventsJoined = 0;
        long eventsAttended = 0;
        long upcomingCount = 0;
        long eventsCreated = 0;
        long totalParticipants = 0;
        long totalAttendances = 0;
        long completedEvents = 0;
        List<EventSummaryDto> upcoming;
        List<EventSummaryDto> recentCompleted = List.of();
        List<ActivityDto> activity = new ArrayList<>();

        if (user.getRole() == Role.NGO || user.getRole() == Role.ADMIN) {
            eventsCreated = eventRepository.countByCreatedById(id);
            totalParticipants = participantRepository.countByOrganizer(id);
            totalAttendances = participantRepository.countAttendedByOrganizer(id);
            completedEvents = eventRepository.countByCreatedByIdAndStatus(id, EventStatus.COMPLETED);
            upcoming = eventService.organizerEvents(id, UPCOMING, 5);
            upcomingCount = eventRepository.countByCreatedByIdAndStatusIn(id, UPCOMING);
            recentCompleted = eventService.organizerEvents(id, EnumSet.of(EventStatus.COMPLETED), 5);
        } else {
            List<MyParticipationDto> participations = eventService.myParticipations(id);
            LocalDate today = LocalDate.now();
            eventsJoined = participations.size();
            eventsAttended = participantRepository.countAttendedByUserAndEventStatus(id, EventStatus.COMPLETED);
            List<EventSummaryDto> mine = participations.stream().map(MyParticipationDto::event)
                    .filter(e -> UPCOMING.contains(e.status()) && !e.eventDate().isBefore(today))
                    .sorted(Comparator.comparing(EventSummaryDto::eventDate)).toList();
            upcomingCount = mine.size();
            upcoming = mine.isEmpty() ? eventService.upcomingPublic(4) : mine.stream().limit(5).toList();
            recentCompleted = participations.stream()
                    .filter(p -> p.attendance() && p.event().status() == EventStatus.COMPLETED)
                    .map(MyParticipationDto::event).limit(5).toList();
            participations.stream().limit(5).forEach(p -> activity.add(new ActivityDto("EVENT",
                    p.attendance() ? "Attended " + p.event().title() : "Registered for " + p.event().title(),
                    p.event().location(), p.registrationDate(), "/events/" + p.event().id())));
        }

        recentReports.forEach(r -> activity.add(new ActivityDto("REPORT", "Reported " + r.title(),
                ReportWorkflowService.label(r.status()), r.createdDate(), "/reports/" + r.id())));
        for (RewardTransactionDto tx : rewardService.summary(id).transactions().stream().limit(5).toList()) {
            activity.add(new ActivityDto("REWARD", "+" + tx.points() + " points", tx.description(), tx.createdAt(),
                    "/rewards"));
        }
        List<BadgeDto> badges = rewardService.earnedBadges(id);
        badges.forEach(b -> activity.add(new ActivityDto("BADGE", "Earned the " + b.name() + " badge",
                b.description(), b.awardedDate(), "/rewards")));
        activity.sort(Comparator.comparing(ActivityDto::date, Comparator.nullsLast(Comparator.reverseOrder())));

        return new DashboardDto(user.getRole(), reportsSubmitted, reportsCompleted, reportsPending, eventsJoined,
                eventsAttended, upcomingCount, user.getPoints(), badgeRepository.countByUserId(id),
                rewardService.rankOf(user), certificateRepository.countByUserId(id), eventsCreated,
                totalParticipants, totalAttendances, completedEvents, recentReports, upcoming, recentCompleted,
                badges, breakdown, activity.stream().limit(8).toList());
    }

    /** Real, database-derived numbers for the public landing page. */
    @Transactional(readOnly = true)
    public PublicStatsDto publicStats() {
        return new PublicStatsDto(
                reportRepository.count(),
                reportRepository.countByStatus(ReportStatus.COMPLETED),
                eventRepository.countByStatus(EventStatus.COMPLETED),
                eventRepository.countByStatusIn(EnumSet.of(EventStatus.UPCOMING, EventStatus.OPEN, EventStatus.FULL)),
                userRepository.countByRole(Role.VOLUNTEER),
                participantRepository.countByAttendanceTrue());
    }
}
