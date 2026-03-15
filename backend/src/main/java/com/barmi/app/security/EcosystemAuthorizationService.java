package com.barmi.app.security;

import com.barmi.domain.ecosystem.EcosystemMember;
import com.barmi.domain.ecosystem.EcosystemMemberRole;
import com.barmi.domain.ecosystem.EcosystemMemberStatus;
import com.barmi.infra.repo.EcosystemMemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class EcosystemAuthorizationService {

    private final boolean allowDevIdentityHeader;
    private final EcosystemMemberRepository ecosystemMemberRepository;

    public EcosystemAuthorizationService(
            EcosystemMemberRepository ecosystemMemberRepository,
            @Value("${app.security.allowDevIdentityHeader}") boolean allowDevIdentityHeader
    ) {
        this.ecosystemMemberRepository = ecosystemMemberRepository;
        this.allowDevIdentityHeader = allowDevIdentityHeader;
    }

    public void requireAdmin(java.util.UUID ecosystemId) {
        requireRole(ecosystemId, EcosystemMemberRole.ECOSYSTEM_ADMIN);
    }

    public void requireStaff(java.util.UUID ecosystemId) {
        requireRole(ecosystemId, EcosystemMemberRole.ECOSYSTEM_STAFF);
    }

    private void requireRole(java.util.UUID ecosystemId, EcosystemMemberRole required) {
        if (ecosystemId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ecosystem_id_required");
        }
        UUID userId = resolveUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
        }

        EcosystemMember member = ecosystemMemberRepository
                .findByEcosystemIdAndUserIdAndStatus(ecosystemId, userId, EcosystemMemberStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden"));

        if (roleRank(member.getRole()) < roleRank(required)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
        }
    }

    private int roleRank(EcosystemMemberRole role) {
        return switch (role) {
            case ECOSYSTEM_ADMIN -> 2;
            case ECOSYSTEM_STAFF -> 1;
        };
    }

    private UUID resolveUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            Object principal = auth.getPrincipal();
            if (principal instanceof AuthenticatedUser user) {
                return user.userId();
            }
        }

        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return null;
        HttpServletRequest request = attrs.getRequest();
        if (request == null) return null;

        if (!allowDevIdentityHeader) {
            return null;
        }

        String raw = request.getHeader("X-User-Id");
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
