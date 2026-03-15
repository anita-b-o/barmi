package com.barmi.infra.repo;

import com.barmi.domain.ecosystem.Ecosystem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EcosystemRepository extends JpaRepository<Ecosystem, UUID> {
    Optional<Ecosystem> findBySlug(String slug);
}
