package com.communitycleanup.service;

import com.communitycleanup.dto.common.PageResponse;
import com.communitycleanup.dto.user.UserDetailDto;
import com.communitycleanup.dto.user.UserDto;
import com.communitycleanup.dto.user.UserRequests.UpdateUserRequest;
import com.communitycleanup.entity.EventStatus;
import com.communitycleanup.entity.Role;
import com.communitycleanup.entity.User;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.mapper.DtoMapper;
import com.communitycleanup.repository.*;
import com.communitycleanup.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> SORTABLE = Set.of("createdAt", "name", "email", "points", "role");

    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final EventRepository eventRepository;
    private final EventParticipantRepository participantRepository;
    private final CertificateRepository certificateRepository;
    private final RewardService rewardService;

    @Transactional(readOnly = true)
    public PageResponse<UserDto> search(Role role, Boolean active, String q, int page, int size, String sort,
                                        String direction) {
        String like = q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
        String sortField = SORTABLE.contains(sort) ? sort : "createdAt";
        Sort.Direction dir = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return PageResponse.of(userRepository.search(role, active, like,
                        PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(dir, sortField))),
                DtoMapper::toUserDto);
    }

    @Transactional(readOnly = true)
    public UserDetailDto detail(Long id, UserPrincipal principal) {
        assertSelfOrAdmin(id, principal);
        User user = load(id);
        return new UserDetailDto(
                DtoMapper.toUserDto(user),
                reportRepository.countByUserId(id),
                participantRepository.countByUserId(id),
                participantRepository.countAttendedByUserAndEventStatus(id, EventStatus.COMPLETED),
                eventRepository.countByCreatedById(id),
                certificateRepository.countByUserId(id),
                rewardService.earnedBadges(id));
    }

    @Transactional
    public UserDto update(Long id, UpdateUserRequest request, UserPrincipal principal) {
        assertSelfOrAdmin(id, principal);
        User user = load(id);
        user.setName(request.name().trim());
        user.setPhone(request.phone().trim());
        if (user.getRole() == Role.NGO && (request.organizationName() == null || request.organizationName().isBlank())) {
            throw ApiException.badRequest("Organization name is required for NGO accounts");
        }
        user.setOrganizationName(request.organizationName() == null || request.organizationName().isBlank()
                ? null : request.organizationName().trim());
        return DtoMapper.toUserDto(user);
    }

    @Transactional
    public UserDto setActive(Long id, boolean active, UserPrincipal principal) {
        if (id.equals(principal.getId())) {
            throw ApiException.unprocessable("You cannot change the status of your own account");
        }
        User user = load(id);
        if (!active && user.getRole() == Role.ADMIN && userRepository.countByRole(Role.ADMIN) <= 1) {
            throw ApiException.unprocessable("The last administrator account cannot be deactivated");
        }
        user.setActive(active);
        return DtoMapper.toUserDto(user);
    }

    private void assertSelfOrAdmin(Long id, UserPrincipal principal) {
        if (!principal.isAdmin() && !principal.getId().equals(id)) {
            throw ApiException.forbidden("You can only access your own profile");
        }
    }

    private User load(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("User"));
    }
}
