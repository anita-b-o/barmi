package com.barmi.infra.repo;

import com.barmi.domain.auth.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    List<RefreshToken> findAllByUserIdAndRevokedAtIsNull(UUID userId);

    @Modifying
    @Query("""
            update RefreshToken t
               set t.revokedAt = :revokedAt
             where t.id = :tokenId
               and t.revokedAt is null
               and t.expiresAt >= :now
            """)
    int revokeIfActive(UUID tokenId, Instant now, Instant revokedAt);

    @Modifying
    @Query("""
            update RefreshToken t
               set t.revokedAt = :revokedAt
             where t.tokenHash = :tokenHash
               and t.revokedAt is null
            """)
    int revokeByTokenHashIfActive(String tokenHash, Instant revokedAt);

    @Modifying
    @Query("""
            update RefreshToken t
               set t.revokedAt = :revokedAt
             where t.userId = :userId
               and t.revokedAt is null
               and t.createdAt <= :createdAtCutoff
            """)
    int revokeActiveByUserId(UUID userId, Instant createdAtCutoff, Instant revokedAt);

    @Modifying
    @Query("delete from RefreshToken t where t.expiresAt < :now or t.revokedAt is not null")
    int deleteExpiredOrRevoked(Instant now);
}
