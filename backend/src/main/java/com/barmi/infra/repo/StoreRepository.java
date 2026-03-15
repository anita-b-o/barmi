package com.barmi.infra.repo;

import com.barmi.domain.store.Store;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StoreRepository extends JpaRepository<Store, UUID> {
    Optional<Store> findBySlug(String slug);
}
