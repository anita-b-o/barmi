package com.barmi.infra.repo;

import com.barmi.domain.ecosystem.EcosystemMember;
import com.barmi.domain.ecosystem.EcosystemMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EcosystemMemberRepository extends JpaRepository<EcosystemMember, UUID> {
    Optional<EcosystemMember> findByEcosystemIdAndUserIdAndStatus(
            UUID ecosystemId,
            UUID userId,
            EcosystemMemberStatus status
    );

    List<EcosystemMember> findByUserId(UUID userId);
}
