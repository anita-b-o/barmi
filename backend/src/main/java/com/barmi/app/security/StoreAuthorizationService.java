package com.barmi.app.security;

import com.barmi.app.tenant.TenantContext;
import com.barmi.app.security.AuthenticatedUser;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StoreAuthorizationService {

    private final StoreRepository storeRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final boolean allowDevIdentityHeader;

    public StoreAuthorizationService(
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            @Value("${app.security.allowDevIdentityHeader}") boolean allowDevIdentityHeader
    ) {
        this.storeRepository = storeRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.allowDevIdentityHeader = allowDevIdentityHeader;
    }

    public void requireStaff() {
        requireRole(StoreMemberRole.STAFF);
    }

    public void requireAdmin() {
        requireRole(StoreMemberRole.ADMIN);
    }

    public void requireOwner() {
        requireRole(StoreMemberRole.OWNER);
    }

    public Store requireCurrentStore() {
        String storeSlug = TenantContext.getStoreSlug();
        if (storeSlug == null || storeSlug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_context_required");
        }

        return storeRepository.findBySlug(storeSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));
    }

    public StoreMember requireCurrentActiveMember() {
        String email = resolveCurrentEmail();
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
        }

        Store store = requireCurrentStore();

        return storeMemberRepository
                .findByStoreIdAndMemberEmailAndStatus(store.getId(), email, StoreMemberStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden"));
    }

    public String currentEmail() {
        return resolveCurrentEmail();
    }

    private void requireRole(StoreMemberRole required) {
        StoreMember member = requireCurrentActiveMember();

        if (roleRank(member.getRole()) < roleRank(required)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
        }
    }

    private int roleRank(StoreMemberRole role) {
        return switch (role) {
            case OWNER -> 3;
            case ADMIN -> 2;
            case STAFF -> 1;
        };
    }

    private String resolveCurrentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            Object principal = auth.getPrincipal();
            if (principal instanceof AuthenticatedUser user) {
                return user.email();
            }
            if (auth.getName() != null && !"anonymousUser".equals(auth.getName())) {
                return auth.getName();
            }
        }

        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return null;
        HttpServletRequest request = attrs.getRequest();
        if (request == null) return null;

        if (!allowDevIdentityHeader) {
            return null;
        }

        String email = request.getHeader("X-User-Email");
        if (email == null || email.isBlank()) return null;
        return email;
    }
}
