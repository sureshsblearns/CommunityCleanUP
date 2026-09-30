package com.communitycleanup.repository;

import com.communitycleanup.entity.ReportStatusHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportStatusHistoryRepository extends JpaRepository<ReportStatusHistory, Long> {

    @EntityGraph(attributePaths = "changedBy")
    List<ReportStatusHistory> findByReportIdOrderByChangedAtAscIdAsc(Long reportId);
}
