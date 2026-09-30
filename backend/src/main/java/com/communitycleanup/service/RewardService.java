package com.communitycleanup.service;

import com.communitycleanup.config.AppProperties;
import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.reward.LeaderboardRow;
import com.communitycleanup.dto.reward.RewardDtos.*;
import com.communitycleanup.entity.*;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.mapper.DtoMapper;
import com.communitycleanup.repository.BadgeRepository;
import com.communitycleanup.repository.EventParticipantRepository;
import com.communitycleanup.repository.RewardTransactionRepository;
import com.communitycleanup.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Points, badges and leaderboard. All point values are computed here on the server: points are only ever
 * granted for confirmed attendance at a COMPLETED event, and each (user, event, reason) pair is rewarded once.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RewardService {

    public static final Set<Role> LEADERBOARD_ROLES = EnumSet.of(Role.VOLUNTEER, Role.RESIDENT);

    private final RewardTransactionRepository rewardRepository;
    private final BadgeRepository badgeRepository;
    private final EventParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final CertificateService certificateService;
    private final EmailService emailService;
    private final AppProperties properties;

    /**
     * Grants attendance rewards for one participant of a completed event: points, badge evaluation and a
     * certificate. Safe to call repeatedly — rewards are only created once.
     */
    @Transactional
    public void rewardAttendance(EventParticipant participant) {
        Event event = participant.getEvent();
        User user = participant.getUser();
        if (!participant.isAttendance() || event.getStatus() != EventStatus.COMPLETED) {
            return;
        }
        boolean newlyRewarded = !rewardRepository.existsByUserIdAndEventIdAndReason(user.getId(), event.getId(),
                RewardReason.EVENT_ATTENDANCE);
        if (newlyRewarded) {
            int points = properties.rewards().attendancePoints();
            rewardRepository.save(RewardTransaction.builder()
                    .user(user)
                    .event(event)
                    .points(points)
                    .reason(RewardReason.EVENT_ATTENDANCE)
                    .description("Attended \"" + event.getTitle() + "\"")
                    .build());
            user.setPoints(user.getPoints() + points);
            log.debug("Awarded {} points to user {} for event {}", points, user.getId(), event.getId());
        }
        List<BadgeType> newBadges = evaluateAttendanceBadges(user);
        Certificate certificate = certificateService.issue(user, event);
        if (!newlyRewarded) {
            return;
        }

        String badgeText = newBadges.isEmpty() ? "" : "\n\nNew badge unlocked: "
                + newBadges.stream().map(BadgeType::getDisplayName).collect(Collectors.joining(", ")) + ".";
        emailService.send(user.getEmail(), "Thank you for cleaning up \"" + event.getTitle() + "\"",
                "Your participation certificate is ready",
                "Thank you for attending \"" + event.getTitle() + "\". You earned "
                        + properties.rewards().attendancePoints() + " points." + badgeText
                        + "\n\nCertificate number: " + certificate.getCertificateNumber(),
                "View certificates", "/certificates");
    }

    /** Awards every attendance badge whose threshold the user has reached. Returns badges newly awarded. */
    @Transactional
    public List<BadgeType> evaluateAttendanceBadges(User user) {
        long attended = participantRepository.countAttendedByUserAndEventStatus(user.getId(), EventStatus.COMPLETED);
        List<BadgeType> awarded = new ArrayList<>();
        for (BadgeType type : BadgeType.values()) {
            if (type.isAttendanceBadge() && attended >= type.getRequiredAttendances() && awardBadge(user, type)) {
                awarded.add(type);
            }
        }
        return awarded;
    }

    /** Idempotently awards a badge. Returns true if the badge was newly created. */
    @Transactional
    public boolean awardBadge(User user, BadgeType type) {
        if (badgeRepository.existsByUserIdAndBadgeName(user.getId(), type)) {
            return false;
        }
        badgeRepository.save(Badge.builder().user(user).badgeName(type).build());
        return true;
    }

    @Transactional(readOnly = true)
    public RewardSummaryDto summary(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        long attended = participantRepository.countAttendedByUserAndEventStatus(userId, EventStatus.COMPLETED);
        List<BadgeDto> badges = badgeCatalogFor(userId);
        List<RewardTransactionDto> transactions = rewardRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(DtoMapper::toRewardDto).toList();
        NextBadgeDto next = Arrays.stream(BadgeType.values())
                .filter(BadgeType::isAttendanceBadge)
                .filter(t -> t.getRequiredAttendances() > attended)
                .min(Comparator.comparingInt(BadgeType::getRequiredAttendances))
                .map(t -> new NextBadgeDto(t, t.getDisplayName(), t.getRequiredAttendances(), attended))
                .orElse(null);
        return new RewardSummaryDto(user.getPoints(), rankOf(user), attended,
                properties.rewards().attendancePoints(), badges, transactions, next);
    }

    /** Full badge catalogue for a user: earned badges first (with award dates), then locked ones. */
    @Transactional(readOnly = true)
    public List<BadgeDto> badgeCatalogFor(Long userId) {
        Map<BadgeType, Badge> earned = badgeRepository.findByUserIdOrderByAwardedDateAsc(userId).stream()
                .collect(Collectors.toMap(Badge::getBadgeName, Function.identity()));
        List<BadgeDto> result = new ArrayList<>();
        earned.values().stream().sorted(Comparator.comparing(Badge::getAwardedDate))
                .map(DtoMapper::toBadgeDto).forEach(result::add);
        Arrays.stream(BadgeType.values()).filter(t -> !earned.containsKey(t))
                .map(DtoMapper::toLockedBadgeDto).forEach(result::add);
        return result;
    }

    public List<BadgeDto> catalog() {
        return Arrays.stream(BadgeType.values()).map(DtoMapper::toLockedBadgeDto).toList();
    }

    @Transactional(readOnly = true)
    public List<BadgeDto> earnedBadges(Long userId) {
        return badgeRepository.findByUserIdOrderByAwardedDateAsc(userId).stream().map(DtoMapper::toBadgeDto).toList();
    }

    @Transactional(readOnly = true)
    public long rankOf(User user) {
        if (!LEADERBOARD_ROLES.contains(user.getRole())) {
            return 0;
        }
        return userRepository.countRankedAbove(LEADERBOARD_ROLES, user.getPoints()) + 1;
    }

    /** Leaderboard with competition ranking (equal points share a rank). Exposes no personal contact data. */
    @Transactional(readOnly = true)
    public PageResponse<LeaderboardEntryDto> leaderboard(int page, int size, Long currentUserId) {
        Page<LeaderboardRow> rows = userRepository.leaderboard(LEADERBOARD_ROLES,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        List<LeaderboardEntryDto> entries = new ArrayList<>();
        Map<Integer, Long> rankCache = new HashMap<>();
        for (LeaderboardRow row : rows.getContent()) {
            long rank = rankCache.computeIfAbsent(row.points(),
                    p -> userRepository.countRankedAbove(LEADERBOARD_ROLES, p) + 1);
            entries.add(new LeaderboardEntryDto(rank, row.userId(), row.name(), row.role(), row.points(),
                    row.completedEvents(), row.badgeCount(), row.userId().equals(currentUserId)));
        }
        return PageResponse.of(rows, entries);
    }

    // ---- Admin ----

    @Transactional(readOnly = true)
    public PageResponse<AdminRewardTransactionDto> allTransactions(int page, int size) {
        return PageResponse.of(rewardRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size)),
                tx -> new AdminRewardTransactionDto(tx.getId(), tx.getUser().getId(), tx.getUser().getName(),
                        tx.getPoints(), tx.getReason(), tx.getDescription(),
                        tx.getEvent() != null ? tx.getEvent().getId() : null,
                        tx.getEvent() != null ? tx.getEvent().getTitle() : null, tx.getCreatedAt()));
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminBadgeDto> allBadges(int page, int size) {
        return PageResponse.of(badgeRepository.findAllByOrderByAwardedDateDesc(PageRequest.of(page, size)),
                b -> new AdminBadgeDto(b.getId(), b.getUser().getId(), b.getUser().getName(), b.getBadgeName(),
                        b.getBadgeName().getDisplayName(), b.getAwardedDate()));
    }

    @Transactional
    public void adminAwardBadge(AwardBadgeRequest request) {
        User user = userRepository.findById(request.userId()).orElseThrow(() -> ApiException.notFound("User"));
        if (user.getRole() == Role.ADMIN) {
            throw ApiException.badRequest("Badges cannot be awarded to administrators");
        }
        if (!awardBadge(user, request.badge())) {
            throw ApiException.conflict(user.getName() + " already has the " + request.badge().getDisplayName()
                    + " badge");
        }
        emailService.send(user.getEmail(), "You earned a new badge", "New badge: " + request.badge().getDisplayName(),
                request.badge().getDescription(), "View rewards", "/rewards");
    }

    @Transactional
    public void revokeBadge(Long badgeId) {
        Badge badge = badgeRepository.findById(badgeId).orElseThrow(() -> ApiException.notFound("Badge"));
        badgeRepository.delete(badge);
    }
}
