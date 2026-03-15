package com.barmi.infra.repo;

import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoreMemberRepository extends JpaRepository<StoreMember, UUID> {
    List<StoreMember> findAllByStoreIdOrderByCreatedAtAsc(UUID storeId);
    Optional<StoreMember> findByIdAndStoreId(UUID id, UUID storeId);
    Optional<StoreMember> findByStoreIdAndMemberEmail(UUID storeId, String memberEmail);
    Optional<StoreMember> findByStoreIdAndMemberEmailAndStatus(UUID storeId, String memberEmail, StoreMemberStatus status);
    long countByStoreIdAndRoleAndStatus(UUID storeId, StoreMemberRole role, StoreMemberStatus status);
    List<StoreMember> findByMemberEmail(String memberEmail);
}
