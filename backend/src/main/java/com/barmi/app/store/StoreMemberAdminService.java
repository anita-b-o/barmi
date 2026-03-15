package com.barmi.app.store;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.infra.repo.StoreMemberRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class StoreMemberAdminService {

    private final StoreMemberRepository storeMemberRepository;
    private final StoreAuthorizationService storeAuthorizationService;

    public StoreMemberAdminService(
            StoreMemberRepository storeMemberRepository,
            StoreAuthorizationService storeAuthorizationService
    ) {
        this.storeMemberRepository = storeMemberRepository;
        this.storeAuthorizationService = storeAuthorizationService;
    }

    @Transactional(readOnly = true)
    public List<StoreMemberAdminDto> listMembers() {
        storeAuthorizationService.requireAdmin();
        Store store = storeAuthorizationService.requireCurrentStore();
        return storeMemberRepository.findAllByStoreIdOrderByCreatedAtAsc(store.getId()).stream()
                .map(member -> toDto(store, member))
                .toList();
    }

    public StoreMemberAdminDto createMember(String memberEmail, String roleValue) {
        StoreMember actor = storeAuthorizationService.requireCurrentActiveMember();
        requireAdminOrOwner(actor);

        Store store = storeAuthorizationService.requireCurrentStore();
        String normalizedEmail = normalizeEmail(memberEmail);
        StoreMemberRole role = parseRole(roleValue);

        if (actor.getRole() == StoreMemberRole.ADMIN && role == StoreMemberRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "cannot_assign_owner");
        }

        StoreMember existing = storeMemberRepository.findByStoreIdAndMemberEmail(store.getId(), normalizedEmail).orElse(null);
        if (actor.getRole() == StoreMemberRole.ADMIN && existing != null && existing.getRole() == StoreMemberRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "cannot_manage_owner");
        }
        if (existing == null) {
            StoreMember created = new StoreMember(
                    UUID.randomUUID(),
                    store.getId(),
                    normalizedEmail,
                    role,
                    StoreMemberStatus.ACTIVE
            );
            return toDto(store, storeMemberRepository.save(created));
        }

        if (existing.getStatus() == StoreMemberStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "member_already_exists");
        }

        existing.updateRole(role);
        existing.updateStatus(StoreMemberStatus.ACTIVE);
        return toDto(store, existing);
    }

    public StoreMemberAdminDto updateRole(UUID memberId, String roleValue) {
        if (memberId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "membership_not_found");
        }

        StoreMember actor = storeAuthorizationService.requireCurrentActiveMember();
        requireAdminOrOwner(actor);
        Store store = storeAuthorizationService.requireCurrentStore();
        StoreMember membership = findMembership(store, memberId);
        StoreMemberRole targetRole = parseRole(roleValue);

        if (actor.getRole() == StoreMemberRole.ADMIN) {
            if (membership.getRole() == StoreMemberRole.OWNER) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "cannot_manage_owner");
            }
            if (targetRole == StoreMemberRole.OWNER) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "cannot_assign_owner");
            }
        }

        ensureActiveOwnerRemains(store.getId(), membership, targetRole, membership.getStatus());

        membership.updateRole(targetRole);
        return toDto(store, membership);
    }

    public StoreMemberAdminDto updateStatus(UUID memberId, String statusValue) {
        if (memberId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "membership_not_found");
        }

        StoreMember actor = storeAuthorizationService.requireCurrentActiveMember();
        requireAdminOrOwner(actor);
        Store store = storeAuthorizationService.requireCurrentStore();
        StoreMember membership = findMembership(store, memberId);
        StoreMemberStatus targetStatus = parseStatus(statusValue);

        if (membership.getStatus() == targetStatus) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "membership_already_in_status");
        }

        if (actor.getRole() == StoreMemberRole.ADMIN && membership.getRole() == StoreMemberRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "cannot_manage_owner");
        }

        ensureActiveOwnerRemains(store.getId(), membership, membership.getRole(), targetStatus);

        membership.updateStatus(targetStatus);
        return toDto(store, membership);
    }

    private void requireAdminOrOwner(StoreMember actor) {
        if (actor.getRole() != StoreMemberRole.ADMIN && actor.getRole() != StoreMemberRole.OWNER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
        }
    }

    private StoreMember findMembership(Store store, UUID memberId) {
        return storeMemberRepository.findByIdAndStoreId(memberId, store.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "membership_not_found"));
    }

    private String normalizeEmail(String memberEmail) {
        if (memberEmail == null || memberEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "member_email_required");
        }
        return memberEmail.trim().toLowerCase();
    }

    private StoreMemberRole parseRole(String roleValue) {
        if (roleValue == null || roleValue.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_role");
        }
        try {
            return StoreMemberRole.valueOf(roleValue.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_role");
        }
    }

    private StoreMemberStatus parseStatus(String statusValue) {
        if (statusValue == null || statusValue.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_status");
        }
        try {
            return StoreMemberStatus.valueOf(statusValue.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_status");
        }
    }

    private void ensureActiveOwnerRemains(
            UUID storeId,
            StoreMember membership,
            StoreMemberRole targetRole,
            StoreMemberStatus targetStatus
    ) {
        boolean isActiveOwnerNow = membership.getRole() == StoreMemberRole.OWNER
                && membership.getStatus() == StoreMemberStatus.ACTIVE;
        boolean staysActiveOwner = targetRole == StoreMemberRole.OWNER && targetStatus == StoreMemberStatus.ACTIVE;

        if (!isActiveOwnerNow || staysActiveOwner) {
            return;
        }

        long activeOwners = storeMemberRepository.countByStoreIdAndRoleAndStatus(
                storeId,
                StoreMemberRole.OWNER,
                StoreMemberStatus.ACTIVE
        );
        if (activeOwners <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "cannot_remove_last_owner");
        }
    }

    private StoreMemberAdminDto toDto(Store store, StoreMember member) {
        return new StoreMemberAdminDto(
                member.getId(),
                member.getStoreId(),
                store.getSlug(),
                member.getMemberEmail(),
                member.getRole().name(),
                member.getStatus().name(),
                member.getCreatedAt()
        );
    }

    public record StoreMemberAdminDto(
            UUID memberId,
            UUID storeId,
            String storeSlug,
            String memberEmail,
            String role,
            String status,
            Instant createdAt
    ) {}
}
