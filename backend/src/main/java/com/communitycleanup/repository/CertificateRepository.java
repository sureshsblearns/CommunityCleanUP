package com.communitycleanup.repository;

import com.communitycleanup.entity.Certificate;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    @EntityGraph(attributePaths = {"event", "user"})
    List<Certificate> findByUserIdOrderByIssuedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"event", "user"})
    Optional<Certificate> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"event", "user"})
    Optional<Certificate> findByCertificateNumber(String certificateNumber);

    Optional<Certificate> findByUserIdAndEventId(Long userId, Long eventId);

    boolean existsByUserIdAndEventId(Long userId, Long eventId);

    long countByUserId(Long userId);
}
