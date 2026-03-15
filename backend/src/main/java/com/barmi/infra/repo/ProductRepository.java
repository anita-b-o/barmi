package com.barmi.infra.repo;

import com.barmi.domain.catalog.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByStoreId(UUID storeId);
}
