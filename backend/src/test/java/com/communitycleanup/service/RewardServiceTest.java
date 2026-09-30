package com.communitycleanup.service;

import com.communitycleanup.config.AppProperties;
import com.communitycleanup.entity.*;
import com.communitycleanup.repository.BadgeRepository;
import com.communitycleanup.repository.EventParticipantRepository;
import com.communitycleanup.repository.RewardTransactionRepository;
import com.communitycleanup.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RewardServiceTest {

    @Mock RewardTransactionRepository rewardRepository;
    @Mock BadgeRepository badgeRepository;
    @Mock EventParticipantRepository participantRepository;
    @Mock UserRepository userRepository;
    @Mock CertificateService certificateService;
    @Mock EmailService emailService;

    private RewardService service;
    private User volunteer;
    private Event event;

    @BeforeEach
    void setUp() {
        AppProperties properties = new AppProperties(null, null, null, null, null, null, null, null,
                new AppProperties.Rewards(50));
        service = new RewardService(rewardRepository, badgeRepository, participantRepository, userRepository,
                certificateService, emailService, properties);
        volunteer = User.builder().id(7L).name("Test Volunteer").email("v@example.com").role(Role.VOLUNTEER).build();
        event = Event.builder().id(3L).title("Beach cleanup").status(EventStatus.COMPLETED).build();
        lenient().when(certificateService.issue(any(), any()))
                .thenReturn(Certificate.builder().certificateNumber("CCP-TEST").build());
    }

    @Test
    void awardsPointsOnlyForConfirmedAttendanceAtCompletedEvents() {
        EventParticipant absent = EventParticipant.builder().user(volunteer).event(event).attendance(false).build();
        service.rewardAttendance(absent);
        verifyNoInteractions(rewardRepository);
        assertThat(volunteer.getPoints()).isZero();

        event.setStatus(EventStatus.IN_PROGRESS);
        EventParticipant present = EventParticipant.builder().user(volunteer).event(event).attendance(true).build();
        service.rewardAttendance(present);
        verifyNoInteractions(rewardRepository);
    }

    @Test
    void awardsFiftyPointsAndFirstBadgeOnFirstAttendance() {
        EventParticipant present = EventParticipant.builder().user(volunteer).event(event).attendance(true).build();
        when(rewardRepository.existsByUserIdAndEventIdAndReason(7L, 3L, RewardReason.EVENT_ATTENDANCE)).thenReturn(false);
        when(participantRepository.countAttendedByUserAndEventStatus(7L, EventStatus.COMPLETED)).thenReturn(1L);
        when(badgeRepository.existsByUserIdAndBadgeName(eq(7L), any())).thenReturn(false);

        service.rewardAttendance(present);

        assertThat(volunteer.getPoints()).isEqualTo(50);
        verify(rewardRepository).save(argThat(tx -> tx.getPoints() == 50));
        verify(badgeRepository).save(argThat(b -> b.getBadgeName() == BadgeType.FIRST_CLEANUP));
        verify(certificateService).issue(volunteer, event);
    }

    @Test
    void doesNotAwardPointsTwiceForTheSameEvent() {
        EventParticipant present = EventParticipant.builder().user(volunteer).event(event).attendance(true).build();
        when(rewardRepository.existsByUserIdAndEventIdAndReason(7L, 3L, RewardReason.EVENT_ATTENDANCE)).thenReturn(true);
        when(participantRepository.countAttendedByUserAndEventStatus(7L, EventStatus.COMPLETED)).thenReturn(1L);
        when(badgeRepository.existsByUserIdAndBadgeName(7L, BadgeType.FIRST_CLEANUP)).thenReturn(true);

        service.rewardAttendance(present);

        assertThat(volunteer.getPoints()).isZero();
        verify(rewardRepository, never()).save(any());
        verify(emailService, never()).send(any(), any(), any(), any(), any(), any());
    }

    @Test
    void badgesAreNeverDuplicated() {
        when(badgeRepository.existsByUserIdAndBadgeName(7L, BadgeType.FIRST_CLEANUP)).thenReturn(true);
        assertThat(service.awardBadge(volunteer, BadgeType.FIRST_CLEANUP)).isFalse();
        verify(badgeRepository, never()).save(any());
    }

    @Test
    void unlocksEveryBadgeWhoseThresholdIsReached() {
        when(participantRepository.countAttendedByUserAndEventStatus(7L, EventStatus.COMPLETED)).thenReturn(5L);
        when(badgeRepository.existsByUserIdAndBadgeName(eq(7L), any())).thenReturn(false);

        List<BadgeType> awarded = service.evaluateAttendanceBadges(volunteer);

        assertThat(awarded).containsExactly(BadgeType.FIRST_CLEANUP, BadgeType.GREEN_VOLUNTEER,
                BadgeType.ACTIVE_PARTICIPANT);
    }
}
