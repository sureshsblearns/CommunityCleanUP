package com.communitycleanup.repository;

import com.communitycleanup.entity.Event;
import com.communitycleanup.entity.EventStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long>, JpaSpecificationExecutor<Event> {

    @EntityGraph(attributePaths = {"createdBy", "relatedReport"})
    Optional<Event> findWithDetailsById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Event e where e.id = :id")
    Optional<Event> findByIdForUpdate(@Param("id") Long id);

    long countByStatus(EventStatus status);

    long countByStatusIn(Collection<EventStatus> statuses);

    long countByCreatedById(Long userId);

    long countByCreatedByIdAndStatus(Long userId, EventStatus status);

    long countByCreatedByIdAndStatusIn(Long userId, Collection<EventStatus> statuses);

    List<Event> findByRelatedReportIdOrderByEventDateAsc(Long reportId);

    long countByRelatedReportIdAndStatusIn(Long reportId, Collection<EventStatus> statuses);

    @EntityGraph(attributePaths = {"createdBy", "relatedReport"})
    @Query("""
            select e from Event e
            where e.status in :statuses and e.eventDate >= :from
            order by e.eventDate asc, e.startTime asc
            """)
    List<Event> findUpcoming(@Param("statuses") Collection<EventStatus> statuses, @Param("from") LocalDate from, Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy", "relatedReport"})
    @Query("""
            select e from Event e
            where e.createdBy.id = :userId and e.status in :statuses
            order by e.eventDate asc, e.startTime asc
            """)
    List<Event> findByOrganizerAndStatuses(@Param("userId") Long userId, @Param("statuses") Collection<EventStatus> statuses, Pageable pageable);

    @Query("select e.status, count(e) from Event e group by e.status")
    List<Object[]> countGroupedByStatus();

    @Query("select e.eventDate from Event e where e.eventDate >= :since")
    List<LocalDate> findEventDatesSince(@Param("since") LocalDate since);

    @Query("""
            select e.createdBy.id, e.createdBy.name, e.createdBy.organizationName, count(e)
            from Event e group by e.createdBy.id, e.createdBy.name, e.createdBy.organizationName
            order by count(e) desc
            """)
    List<Object[]> countByOrganizer(Pageable pageable);
}
