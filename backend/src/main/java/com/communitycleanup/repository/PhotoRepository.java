package com.communitycleanup.repository;

import com.communitycleanup.entity.Photo;
import com.communitycleanup.entity.PhotoType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PhotoRepository extends JpaRepository<Photo, Long> {

    long countByReportId(Long reportId);

    long countByEventId(Long eventId);

    List<Photo> findByEventIdAndPhotoTypeOrderByUploadedDateAsc(Long eventId, PhotoType type);

    @Query("select p from Photo p where p.report.id in :reportIds order by p.uploadedDate asc, p.id asc")
    List<Photo> findByReportIds(@Param("reportIds") Collection<Long> reportIds);

    @Query("select p from Photo p where p.event.id in :eventIds order by p.uploadedDate asc, p.id asc")
    List<Photo> findByEventIds(@Param("eventIds") Collection<Long> eventIds);
}
