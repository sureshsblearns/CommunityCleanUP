package com.communitycleanup.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "badges",
        uniqueConstraints = @UniqueConstraint(name = "uk_badges_user_name", columnNames = {"user_id", "badge_name"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Badge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "badge_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "badge_name", nullable = false, length = 40)
    private BadgeType badgeName;

    @CreationTimestamp
    @Column(name = "awarded_date", nullable = false, updatable = false)
    private Instant awardedDate;
}
