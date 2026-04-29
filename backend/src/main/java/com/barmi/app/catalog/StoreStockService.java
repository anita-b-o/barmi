package com.barmi.app.catalog;

import com.barmi.domain.catalog.Product;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreOrderItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class StoreStockService {

    private final ProductRepository productRepository;
    private final StoreOrderItemRepository storeOrderItemRepository;

    public StoreStockService(
            ProductRepository productRepository,
            StoreOrderItemRepository storeOrderItemRepository
    ) {
        this.productRepository = productRepository;
        this.storeOrderItemRepository = storeOrderItemRepository;
    }

    public StockCommitResult commitPaidOrderStock(StoreOrder order) {
        List<StoreOrderItem> items = storeOrderItemRepository.findByOrderId(order.getId());
        Map<UUID, Integer> requestedByProductId = items.stream()
                .collect(Collectors.toMap(StoreOrderItem::getProductId, StoreOrderItem::getQty, Integer::sum));

        List<Product> products = productRepository.findAllByStoreIdAndIdInForUpdate(order.getStoreId(), requestedByProductId.keySet());
        Map<UUID, Product> productById = products.stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        List<StockConflictItem> conflicts = requestedByProductId.entrySet().stream()
                .map(entry -> buildConflict(entry.getKey(), entry.getValue(), productById.get(entry.getKey())))
                .filter(conflict -> conflict != null)
                .toList();

        if (!conflicts.isEmpty()) {
            return new StockCommitResult(false, conflicts);
        }

        for (Map.Entry<UUID, Integer> entry : requestedByProductId.entrySet()) {
            Product product = productById.get(entry.getKey());
            product.updateStockQuantity(product.getStockQuantity() - entry.getValue());
        }
        productRepository.saveAll(products);
        return new StockCommitResult(true, List.of());
    }

    private StockConflictItem buildConflict(UUID productId, int requestedQty, Product product) {
        if (product == null) {
            return new StockConflictItem(productId, null, 0, requestedQty);
        }
        if (product.getStockQuantity() < requestedQty) {
            return new StockConflictItem(productId, product.getSku(), product.getStockQuantity(), requestedQty);
        }
        return null;
    }

    public record StockConflictItem(
            UUID productId,
            String sku,
            long availableQuantity,
            int requestedQuantity
    ) {}

    public record StockCommitResult(
            boolean applied,
            List<StockConflictItem> conflicts
    ) {}
}
