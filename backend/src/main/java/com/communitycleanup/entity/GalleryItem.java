package com.communitycleanup.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "gallery_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GalleryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gallery_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(length = 255)
    private String location;

    @Column(name = "before_image_url", nullable = false, length = 500)
    private String beforeImageUrl;

    @Column(name = "before_public_id", length = 255)
    private String beforePublicId;

    @Column(name = "after_image_url", nullable = false, length = 500)
    private String afterImageUrl;

    @Column(name = "after_public_id", length = 255)
    private String afterPublicId;

    @Column(name = "completion_date")
    private LocalDate completionDate;

    @Builder.Default
    @Column(nullable = false)
    private boolean approved = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
