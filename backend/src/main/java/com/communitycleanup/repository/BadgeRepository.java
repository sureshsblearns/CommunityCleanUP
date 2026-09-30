package com.communitycleanup.repository;

import com.communitycleanup.entity.Badge;
import com.communitycleanup.entity.BadgeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface BadgeRepository extends JpaRepository<Badge, Long> {

    List<Badge> findByUserIdOrderByAwardedDateAsc(Long userId);

    boolean existsByUserIdAndBadgeName(Long userId, BadgeType badgeName);

    long countByUserId(Long userId);

    @EntityGraph(attributePaths = "user")
    Page<Badge> findAllByOrderByAwardedDateDesc(Pageable pageable);

    @Query("select b.badgeName, count(b) from Badge b group by b.badgeName")
    List<Object[]> countByBadgeName();
}
