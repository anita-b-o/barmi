package com.barmi.domain.orders;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class StoreOrderTest {

    @Test
    void creatingOrderWithEmptyItemsFails() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                StoreOrder.create(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "USD",
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        "",
                        null,
                        null,
                        List.of()
                )
        );
        assertTrue(ex.getMessage().contains("items"));
    }

    @Test
    void creatingItemWithQtyZeroFails() {
        assertThrows(IllegalArgumentException.class, () ->
                new StoreOrderItem(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        0,
                        new BigDecimal("10.00"),
                        new BigDecimal("10.00"),
                        "USD",
                        "{\"name\":\"Latte\",\"unit_price_amount\":10,\"currency\":\"USD\"}"
                )
        );
    }

    @Test
    void invalidTransitionFails() {
        StoreOrder order = StoreOrder.create(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "USD",
                new BigDecimal("10.00"),
                new BigDecimal("10.00"),
                BigDecimal.ZERO,
                "",
                null,
                null,
                List.of(validItem())
        );

        order.markPaid();
        assertThrows(IllegalStateException.class, order::cancel);
    }

    @Test
    void validTransitionToPaidWorks() {
        StoreOrder order = StoreOrder.create(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "USD",
                new BigDecimal("10.00"),
                new BigDecimal("10.00"),
                BigDecimal.ZERO,
                "",
                null,
                null,
                List.of(validItem())
        );

        order.markPaid();
        assertEquals(StoreOrderStatus.PAID, order.getStatus());
    }

    private StoreOrderItem validItem() {
        return new StoreOrderItem(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                1,
                new BigDecimal("10.00"),
                new BigDecimal("10.00"),
                "USD",
                "{\"name\":\"Latte\",\"unit_price_amount\":10,\"currency\":\"USD\"}"
        );
    }
}
