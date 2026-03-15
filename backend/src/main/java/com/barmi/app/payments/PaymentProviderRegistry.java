package com.barmi.app.payments;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class PaymentProviderRegistry {
    private final Map<String, PaymentProviderClient> providers;

    public PaymentProviderRegistry(List<PaymentProviderClient> clients) {
        Map<String, PaymentProviderClient> map = new HashMap<>();
        for (PaymentProviderClient client : clients) {
            String key = normalize(client.provider());
            if (key != null && !key.isBlank()) {
                map.put(key, client);
            }
        }
        this.providers = Map.copyOf(map);
    }

    public Optional<PaymentProviderClient> find(String provider) {
        if (provider == null) return Optional.empty();
        return Optional.ofNullable(providers.get(normalize(provider)));
    }

    public static String normalize(String provider) {
        if (provider == null) return null;
        return provider.trim().toUpperCase(Locale.ROOT);
    }
}
