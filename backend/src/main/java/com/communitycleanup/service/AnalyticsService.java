package com.communitycleanup.service;

import com.communitycleanup.dto.analytics.AnalyticsDtos.*;
import com.communitycleanup.dto.common.LabelValue;
import com.communitycleanup.dto.reward.LeaderboardRow;
import com.communitycleanup.entity.*;
import com.communitycleanup.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;

/** Aggregations are computed in the database (GROUP BY / COUNT) or over narrow projections — never full entities. */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final int MONTHS = 6;
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final EventRepository eventRepository;
    private final EventParticipantRepository participantRepository;
    private final RewardTransactionRepository rewardRepository;
    private final BadgeRepository badgeRepository;
    private final GalleryItemRepository galleryRepository;
    private final FeedbackRepository feedbackRepository;

    @Transactional(readOnly = true)
    public OverviewDto overview() {
        Map<String, Long> roles = toMap(userRepository.countGroupedByRole());
        Map<String, Long> reports = toMap(reportRepository.countGroupedByStatus());
        Map<String, Long> events = toMap(eventRepository.countGroupedByStatus());
        long totalUsers = roles.values().stream().mapToLong(Long::longValue).sum();
        long totalReports = reports.values().stream().mapToLong(Long::longValue).sum();
        long totalEvents = events.values().stream().mapToLong(Long::longValue).sum();
        return new OverviewDto(
                totalUsers,
                roles.getOrDefault("RESIDENT", 0L), roles.getOrDefault("VOLUNTEER", 0L),
                roles.getOrDefault("NGO", 0L), roles.getOrDefault("ADMIN", 0L),
                totalReports,
                reports.getOrDefault("PENDING", 0L), reports.getOrDefault("VERIFIED", 0L),
                reports.getOrDefault("CLEANING_SCHEDULED", 0L), reports.getOrDefault("IN_PROGRESS", 0L),
                reports.getOrDefault("COMPLETED", 0L), reports.getOrDefault("REJECTED", 0L),
                totalEvents,
                events.getOrDefault("UPCOMING", 0L) + events.getOrDefault("OPEN", 0L) + events.getOrDefault("FULL", 0L),
                events.getOrDefault("IN_PROGRESS", 0L), events.getOrDefault("COMPLETED", 0L),
                events.getOrDefault("CANCELLED", 0L),
                participantRepository.count(),
                participantRepository.countByAttendanceTrue(),
                rewardRepository.sumAllPoints(),
                galleryRepository.countByApprovedTrue(),
                round(feedbackRepository.averageRating()));
    }

    @Transactional(readOnly = true)
    public ReportAnalyticsDto reports() {
        List<LabelValue> byStatus = ordered(reportRepository.countGroupedByStatus(), ReportStatus.values());
        long total = byStatus.stream().mapToLong(LabelValue::value).sum();
        long completed = byStatus.stream().filter(l -> l.label().equals("COMPLETED")).mapToLong(LabelValue::value).sum();
        List<Instant> created = reportRepository.findCreatedSince(monthStart(MONTHS - 1));
        return new ReportAnalyticsDto(
                byStatus,
                ordered(reportRepository.countGroupedByWasteType(), WasteType.values()),
                ordered(reportRepository.countGroupedByUrgency(), Urgency.values()),
                monthlySeries(Map.of("Reports", created.stream().map(this::toMonth).toList())),
                total == 0 ? 0 : Math.round(completed * 1000.0 / total) / 10.0);
    }

    @Transactional(readOnly = true)
    public EventAnalyticsDto events() {
        LocalDate since = monthStart(MONTHS - 1).atZone(ZoneOffset.UTC).toLocalDate();
        List<YearMonth> months = eventRepository.findEventDatesSince(since).stream().map(YearMonth::from).toList();
        List<LabelValue> organizers = eventRepository.countByOrganizer(PageRequest.of(0, 5)).stream()
                .map(r -> new LabelValue(r[2] != null ? (String) r[2] : (String) r[1], (Long) r[3])).toList();
        return new EventAnalyticsDto(
                ordered(eventRepository.countGroupedByStatus(), EventStatus.values()),
                monthlySeries(Map.of("Events", months)),
                organizers);
    }

    @Transactional(readOnly = true)
    public VolunteerAnalyticsDto volunteers() {
        List<Object[]> rows = participantRepository.findParticipationSince(monthStart(MONTHS - 1));
        List<YearMonth> registrations = new ArrayList<>();
        List<YearMonth> attendances = new ArrayList<>();
        for (Object[] row : rows) {
            registrations.add(toMonth((Instant) row[0]));
            if (Boolean.TRUE.equals(row[1])) {
                attendances.add(YearMonth.from((LocalDate) row[2]));
            }
        }
        Map<String, List<YearMonth>> series = new LinkedHashMap<>();
        series.put("Registrations", registrations);
        series.put("Attendances", attendances);

        List<LabelValue> top = userRepository.leaderboard(RewardService.LEADERBOARD_ROLES, PageRequest.of(0, 5))
                .getContent().stream().filter(r -> r.points() > 0)
                .map((LeaderboardRow r) -> new LabelValue(r.name(), r.points())).toList();
        List<LabelValue> badges = ordered(badgeRepository.countByBadgeName(), BadgeType.values());

        long totalParticipants = participantRepository.count();
        long attended = participantRepository.countByAttendanceTrue();
        return new VolunteerAnalyticsDto(
                monthlySeries(series),
                top,
                badges,
                participantRepository.countDistinctAttendingVolunteers(),
                totalParticipants == 0 ? 0 : Math.round(attended * 1000.0 / totalParticipants) / 10.0,
                rewardRepository.sumAllPoints());
    }

    // ---- helpers ----

    private TimeSeriesDto monthlySeries(Map<String, List<YearMonth>> data) {
        YearMonth current = YearMonth.now(ZoneOffset.UTC);
        List<YearMonth> months = new ArrayList<>();
        for (int i = MONTHS - 1; i >= 0; i--) {
            months.add(current.minusMonths(i));
        }
        Map<String, List<Long>> series = new LinkedHashMap<>();
        data.forEach((name, values) -> {
            Map<YearMonth, Long> counts = new HashMap<>();
            values.forEach(m -> counts.merge(m, 1L, Long::sum));
            series.put(name, months.stream().map(m -> counts.getOrDefault(m, 0L)).toList());
        });
        return new TimeSeriesDto(months.stream().map(m -> m.format(MONTH_LABEL)).toList(), series);
    }

    private YearMonth toMonth(Instant instant) {
        return YearMonth.from(instant.atZone(ZoneOffset.UTC));
    }

    private Instant monthStart(int monthsAgo) {
        return YearMonth.now(ZoneOffset.UTC).minusMonths(monthsAgo).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    private static Map<String, Long> toMap(List<Object[]> rows) {
        Map<String, Long> map = new HashMap<>();
        rows.forEach(r -> map.put(String.valueOf(r[0]), (Long) r[1]));
        return map;
    }

    /** Returns one entry per enum constant (in declaration order), filling missing groups with zero. */
    private static <E extends Enum<E>> List<LabelValue> ordered(List<Object[]> rows, E[] values) {
        Map<String, Long> map = toMap(rows);
        return Arrays.stream(values).map(Enum::name)
                .map((Function<String, LabelValue>) name -> new LabelValue(name, map.getOrDefault(name, 0L)))
                .toList();
    }

    private static Double round(Double value) {
        return value == null ? null : Math.round(value * 10.0) / 10.0;
    }
}
