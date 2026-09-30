package com.communitycleanup.repository;

import com.communitycleanup.entity.Report;
import com.communitycleanup.entity.ReportStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long>, JpaSpecificationExecutor<Report> {

    @EntityGraph(attributePaths = "user")
    Optional<Report> findWithUserById(Long id);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, ReportStatus status);

    long countByStatus(ReportStatus status);

    long countByStatusIn(Collection<ReportStatus> statuses);

    @EntityGraph(attributePaths = "user")
    List<Report> findTop5ByUserIdOrderByCreatedDateDesc(Long userId);

    @Query("select r.status, count(r) from Report r group by r.status")
    List<Object[]> countGroupedByStatus();

    @Query("select r.wasteType, count(r) from Report r group by r.wasteType")
    List<Object[]> countGroupedByWasteType();

    @Query("select r.urgency, count(r) from Report r group by r.urgency")
    List<Object[]> countGroupedByUrgency();

    @Query("select r.status, count(r) from Report r where r.user.id = :userId group by r.status")
    List<Object[]> countGroupedByStatusForUser(@Param("userId") Long userId);

    @Query("select r.createdDate from Report r where r.createdDate >= :since")
    List<Instant> findCreatedSince(@Param("since") Instant since);

    @Query("""
            select r from Report r
            where r.latitude is not null and r.longitude is not null and r.status in :statuses
            order by r.createdDate desc
            """)
    List<Report> findMappable(@Param("statuses") Collection<ReportStatus> statuses, Pageable pageable);
}
