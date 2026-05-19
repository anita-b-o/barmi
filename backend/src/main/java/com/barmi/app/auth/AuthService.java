package com.barmi.app.auth;

import com.barmi.app.security.AuthenticatedUser;
import com.barmi.app.security.JwtService;
import com.barmi.domain.auth.RefreshToken;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemMember;
import com.barmi.domain.ecosystem.EcosystemMemberStatus;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.EcosystemMemberRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final StoreRepository storeRepository;
    private final EcosystemMemberRepository ecosystemMemberRepository;
    private final EcosystemRepository ecosystemRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenCodec refreshTokenCodec;
    private final long refreshTtlDays;

    public AuthService(
            UserRepository userRepository,
            StoreMemberRepository storeMemberRepository,
            StoreRepository storeRepository,
            EcosystemMemberRepository ecosystemMemberRepository,
            EcosystemRepository ecosystemRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenCodec refreshTokenCodec,
            @Value("${app.security.refreshTtlDays:30}") long refreshTtlDays
    ) {
        this.userRepository = userRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.storeRepository = storeRepository;
        this.ecosystemMemberRepository = ecosystemMemberRepository;
        this.ecosystemRepository = ecosystemRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenCodec = refreshTokenCodec;
        this.refreshTtlDays = refreshTtlDays;
    }

    @Transactional
    public AuthTokens login(String email, String password) {
        Instant requestStartedAt = Instant.now();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "bad_request");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "invalid_credentials"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(FORBIDDEN, "user_inactive");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(UNAUTHORIZED, "invalid_credentials");
        }

        revokeActiveTokens(user.getId(), requestStartedAt);
        return issueTokens(user, CONFLICT, "concurrent_auth_request");
    }

    @Transactional
    public AuthTokens refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(UNAUTHORIZED, "invalid_refresh_token");
        }

        RefreshToken token = refreshTokenRepository.findByTokenHash(refreshTokenCodec.hash(refreshToken))
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "invalid_refresh_token"));

        Instant now = Instant.now();
        if (token.isExpired(now)) {
            throw new ResponseStatusException(UNAUTHORIZED, "refresh_token_expired");
        }
        if (token.isRevoked()) {
            throw new ResponseStatusException(UNAUTHORIZED, "invalid_refresh_token");
        }

        Instant revokedAt = Instant.now();
        int revokedRows = refreshTokenRepository.revokeIfActive(token.getId(), now, revokedAt);
        if (revokedRows != 1) {
            throw new ResponseStatusException(UNAUTHORIZED, "invalid_refresh_token");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "invalid_refresh_token"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(FORBIDDEN, "user_inactive");
        }

        return issueTokens(user, UNAUTHORIZED, "invalid_refresh_token");
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }

        refreshTokenRepository.revokeByTokenHashIfActive(refreshTokenCodec.hash(refreshToken), Instant.now());
    }

    public MeResponse me(AuthenticatedUser principal) {
        if (principal == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "unauthorized");
        }

        User user = userRepository.findById(principal.userId())
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "unauthorized"));

        List<StoreMember> storeMembers = storeMemberRepository.findByMemberEmail(user.getEmail());
        List<StoreMembershipView> stores = storeMembers.stream()
                .map(member -> {
                    Store store = storeRepository.findById(member.getStoreId()).orElse(null);
                    String slug = store == null ? null : store.getSlug();
                    return new StoreMembershipView(
                            member.getStoreId(),
                            slug,
                            member.getRole().name(),
                            member.getStatus().name()
                    );
                })
                .toList();

        List<EcosystemMember> ecosystemMembers = ecosystemMemberRepository.findByUserId(user.getId());
        List<EcosystemMembershipView> ecosystems = ecosystemMembers.stream()
                .map(member -> {
                    Ecosystem ecosystem = ecosystemRepository.findById(member.getEcosystemId()).orElse(null);
                    String slug = ecosystem == null ? null : ecosystem.getSlug();
                    return new EcosystemMembershipView(
                            member.getEcosystemId(),
                            slug,
                            member.getRole().name(),
                            member.getStatus().name()
                    );
                })
                .toList();

        return new MeResponse(
                user.getId(),
                user.getEmail(),
                new Memberships(stores, ecosystems)
        );
    }

    private AuthTokens issueTokens(User user, org.springframework.http.HttpStatus conflictStatus, String conflictCode) {
        Instant now = Instant.now();

        Map<String, Object> claims = Map.of(
                "email", user.getEmail(),
                "userId", user.getId().toString()
        );
        String accessToken = jwtService.issueToken(user.getId().toString(), claims);
        Instant accessTokenExpiresAt = jwtService.computeExpiry(now);
        String rawRefreshToken = refreshTokenCodec.generateOpaqueToken();
        String refreshTokenHash = refreshTokenCodec.hash(rawRefreshToken);
        Instant refreshTokenExpiresAt = now.plus(refreshTtlDays, ChronoUnit.DAYS);

        RefreshToken refreshToken = new RefreshToken(
                UUID.randomUUID(),
                user.getId(),
                refreshTokenHash,
                refreshTokenHash,
                refreshTokenExpiresAt
        );
        try {
            refreshTokenRepository.saveAndFlush(refreshToken);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(conflictStatus, conflictCode, ex);
        }

        return new AuthTokens(accessToken, accessTokenExpiresAt, rawRefreshToken, refreshTokenExpiresAt, "Bearer");
    }

    private void revokeActiveTokens(UUID userId, Instant requestStartedAt) {
        refreshTokenRepository.revokeActiveByUserId(userId, requestStartedAt, requestStartedAt);
    }

    public record AuthTokens(
            String accessToken,
            Instant accessTokenExpiresAt,
            String refreshToken,
            Instant refreshTokenExpiresAt,
            String tokenType
    ) {}

    public record MeResponse(
            UUID userId,
            String email,
            Memberships memberships
    ) {}

    public record Memberships(
            List<StoreMembershipView> stores,
            List<EcosystemMembershipView> ecosystems
    ) {}

    public record StoreMembershipView(
            UUID storeId,
            String storeSlug,
            String role,
            String status
    ) {}

    public record EcosystemMembershipView(
            UUID ecosystemId,
            String ecosystemSlug,
            String role,
            String status
    ) {}
}
