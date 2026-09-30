package com.communitycleanup.repository;

import com.communitycleanup.entity.RewardReason;
import com.communitycleanup.entity.RewardTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface RewardTransactionRepository extends JpaRepository<RewardTransaction, Long> {

    boolean existsByUserIdAndEventIdAndReason(Long userId, Long eventId, RewardReason reason);

    @EntityGraph(attributePaths = "event")
    List<RewardTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"user", "event"})
    Page<RewardTransaction> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("select coalesce(sum(r.points), 0) from RewardTransaction r")
    long sumAllPoints();

    @Query("select r.createdAt, r.points from RewardTransaction r where r.createdAt >= :since")
    List<Object[]> findPointsSince(@Param("since") Instant since);
}
