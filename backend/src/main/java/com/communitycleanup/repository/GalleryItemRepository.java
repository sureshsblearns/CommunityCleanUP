package com.communitycleanup.repository;

import com.communitycleanup.entity.GalleryItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GalleryItemRepository extends JpaRepository<GalleryItem, Long> {

    @EntityGraph(attributePaths = {"event", "createdBy"})
    Page<GalleryItem> findByApproved(boolean approved, Pageable pageable);

    @EntityGraph(attributePaths = {"event", "createdBy"})
    Page<GalleryItem> findAllBy(Pageable pageable);

    @EntityGraph(attributePaths = {"event", "createdBy"})
    Optional<GalleryItem> findWithDetailsById(Long id);

    boolean existsByEventId(Long eventId);

    long countByApprovedTrue();
}
