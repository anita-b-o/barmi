package com.barmi.infra.repo;

import com.barmi.domain.saas.SaasPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SaasPlanRepository extends JpaRepository<SaasPlan, UUID> {
    Optional<SaasPlan> findByCode(String code);
    boolean existsByCode(String code);
    List<SaasPlan> findAllByOrderByCodeAsc();
}
