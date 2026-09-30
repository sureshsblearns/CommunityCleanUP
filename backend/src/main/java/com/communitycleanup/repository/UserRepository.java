package com.communitycleanup.repository;

import com.communitycleanup.dto.reward.LeaderboardRow;
import com.communitycleanup.entity.Role;
import com.communitycleanup.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByRole(Role role);

    long countByRole(Role role);

    long countByActiveTrue();

    @Query("""
            select u from User u
            where (:role is null or u.role = :role)
              and (:active is null or u.active = :active)
              and (:q is null or lower(u.name) like :q or lower(u.email) like :q or lower(u.organizationName) like :q)
            """)
    Page<User> search(@Param("role") Role role, @Param("active") Boolean active, @Param("q") String q, Pageable pageable);

    @Query(value = """
            select new com.communitycleanup.dto.reward.LeaderboardRow(
                u.id, u.name, u.role, u.points,
                (select count(p) from EventParticipant p
                   where p.user = u and p.attendance = true
                     and p.event.status = com.communitycleanup.entity.EventStatus.COMPLETED),
                (select count(b) from Badge b where b.user = u))
            from User u
            where u.active = true and u.role in :roles
            order by u.points desc, u.name asc
            """,
            countQuery = "select count(u) from User u where u.active = true and u.role in :roles")
    Page<LeaderboardRow> leaderboard(@Param("roles") Collection<Role> roles, Pageable pageable);

    @Query("select count(u) from User u where u.active = true and u.role in :roles and u.points > :points")
    long countRankedAbove(@Param("roles") Collection<Role> roles, @Param("points") int points);

    @Query("select u.role, count(u) from User u group by u.role")
    List<Object[]> countGroupedByRole();

    @Query("select u.createdAt from User u where u.createdAt >= :since")
    List<java.time.Instant> findCreatedSince(@Param("since") java.time.Instant since);
}
