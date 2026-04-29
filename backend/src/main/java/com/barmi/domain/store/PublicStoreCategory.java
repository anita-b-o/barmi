package com.barmi.domain.store;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public enum PublicStoreCategory {
    ALMACEN("almacen", "Almacen"),
    PANADERIA("panaderia", "Panaderia"),
    VERDULERIA("verduleria", "Verduleria"),
    KIOSCO("kiosco", "Kiosco"),
    CARNICERIA("carniceria", "Carniceria"),
    FARMACIA("farmacia", "Farmacia"),
    LIBRERIA("libreria", "Libreria"),
    CAFETERIA("cafeteria", "Cafeteria");

    private static final Map<String, PublicStoreCategory> BY_KEY = Arrays.stream(values())
            .collect(Collectors.toUnmodifiableMap(PublicStoreCategory::getKey, Function.identity()));

    private final String key;
    private final String label;

    PublicStoreCategory(String key, String label) {
        this.key = key;
        this.label = label;
    }

    public String getKey() {
        return key;
    }

    public String getLabel() {
        return label;
    }

    public static Optional<PublicStoreCategory> fromKey(String key) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(BY_KEY.get(key.trim().toLowerCase()));
    }

    public static String normalizeKey(String key) {
        return fromKey(key)
                .map(PublicStoreCategory::getKey)
                .orElseThrow(() -> new IllegalArgumentException("invalid public store category"));
    }
}
