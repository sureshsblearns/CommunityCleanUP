package com.communitycleanup.repository;

import com.communitycleanup.entity.EventParticipant;
import com.communitycleanup.entity.EventStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EventParticipantRepository extends JpaRepository<EventParticipant, Long> {

    boolean existsByEventIdAndUserId(Long eventId, Long userId);

    Optional<EventParticipant> findByEventIdAndUserId(Long eventId, Long userId);

    long countByEventId(Long eventId);

    long countByUserId(Long userId);

    long countByAttendanceTrue();

    @EntityGraph(attributePaths = "user")
    List<EventParticipant> findByEventIdOrderByRegistrationDateAsc(Long eventId);

    @EntityGraph(attributePaths = {"event", "event.createdBy"})
    List<EventParticipant> findByUserIdOrderByRegistrationDateDesc(Long userId);

    @EntityGraph(attributePaths = {"user", "event"})
    Optional<EventParticipant> findWithDetailsById(Long id);

    @Query("""
            select count(p) from EventParticipant p
            where p.user.id = :userId and p.attendance = true and p.event.status = :status
            """)
    long countAttendedByUserAndEventStatus(@Param("userId") Long userId, @Param("status") EventStatus status);

    @Query("select p.event.id, count(p) from EventParticipant p where p.event.id in :eventIds group by p.event.id")
    List<Object[]> countByEventIds(@Param("eventIds") Collection<Long> eventIds);

    @Query("select p.event.id from EventParticipant p where p.user.id = :userId and p.event.id in :eventIds")
    List<Long> findRegisteredEventIds(@Param("userId") Long userId, @Param("eventIds") Collection<Long> eventIds);

    @Query("select count(p) from EventParticipant p where p.event.createdBy.id = :organizerId")
    long countByOrganizer(@Param("organizerId") Long organizerId);

    @Query("select count(p) from EventParticipant p where p.event.createdBy.id = :organizerId and p.attendance = true")
    long countAttendedByOrganizer(@Param("organizerId") Long organizerId);

    @Query("""
            select count(p) from EventParticipant p
            where p.user.id = :userId and p.event.status in :statuses and p.event.eventDate >= :from
            """)
    long countUpcomingForUser(@Param("userId") Long userId, @Param("statuses") Collection<EventStatus> statuses, @Param("from") LocalDate from);

    @Query("select p.registrationDate, p.attendance, p.event.eventDate from EventParticipant p where p.registrationDate >= :since")
    List<Object[]> findParticipationSince(@Param("since") Instant since);

    @Query("select count(distinct p.user.id) from EventParticipant p where p.attendance = true")
    long countDistinctAttendingVolunteers();
}
