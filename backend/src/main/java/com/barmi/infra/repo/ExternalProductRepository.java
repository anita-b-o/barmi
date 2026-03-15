package com.barmi.infra.repo;

import com.barmi.domain.ecosystem.ExternalProduct;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExternalProductRepository extends JpaRepository<ExternalProduct, UUID> {
    List<ExternalProduct> findByProviderId(String providerId);
}
