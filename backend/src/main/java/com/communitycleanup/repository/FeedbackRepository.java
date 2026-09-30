package com.communitycleanup.repository;

import com.communitycleanup.entity.Feedback;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Set;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    boolean existsByUserIdAndEventId(Long userId, Long eventId);

    @EntityGraph(attributePaths = "user")
    List<Feedback> findByEventIdOrderBySubmittedDateDesc(Long eventId);

    @Query("select avg(f.rating) from Feedback f where f.event.id = :eventId")
    Double averageRatingForEvent(@Param("eventId") Long eventId);

    long countByEventId(Long eventId);

    @Query("select f.event.id from Feedback f where f.user.id = :userId and f.event.id in :eventIds")
    Set<Long> findEventIdsWithFeedback(@Param("userId") Long userId, @Param("eventIds") Collection<Long> eventIds);

    @Query("select avg(f.rating) from Feedback f")
    Double averageRating();
}
