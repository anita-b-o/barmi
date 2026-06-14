package com.barmi.app.saas;

import com.barmi.domain.saas.SaasPlan;
import com.barmi.domain.saas.SaasSubscription;
import com.barmi.domain.saas.SaasSubscriptionStatus;
import com.barmi.infra.repo.SaasPlanRepository;
import com.barmi.infra.repo.SaasSubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StoreSaasSubscriptionServiceTest {
    @Mock
    private SaasPlanRepository saasPlanRepository;

    @Mock
    private SaasSubscriptionRepository saasSubscriptionRepository;

    @Test
    void ensureSubscriptionCreatesFreeActiveSubscriptionWhenMissing() {
        UUID storeId = UUID.randomUUID();
        SaasPlan freePlan = new SaasPlan(UUID.randomUUID(), "FREE", "Free", true, null, 50, false, false);
        StoreSaasSubscriptionService service = new StoreSaasSubscriptionService(saasPlanRepository, saasSubscriptionRepository);

        when(saasSubscriptionRepository.findByStoreId(storeId)).thenReturn(Optional.empty());
        when(saasPlanRepository.findByCode("FREE")).thenReturn(Optional.of(freePlan));
        when(saasSubscriptionRepository.save(any(SaasSubscription.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SaasSubscription subscription = service.ensureSubscriptionForStore(storeId);

        assertThat(subscription.getStoreId()).isEqualTo(storeId);
        assertThat(subscription.getPlan().getCode()).isEqualTo("FREE");
        assertThat(subscription.getStatus()).isEqualTo(SaasSubscriptionStatus.ACTIVE);
        ArgumentCaptor<SaasSubscription> captor = ArgumentCaptor.forClass(SaasSubscription.class);
        verify(saasSubscriptionRepository).save(captor.capture());
        assertThat(captor.getValue().getStoreId()).isEqualTo(storeId);
    }

    @Test
    void ensureSubscriptionIsIdempotentWhenStoreAlreadyHasOne() {
        UUID storeId = UUID.randomUUID();
        SaasPlan freePlan = new SaasPlan(UUID.randomUUID(), "FREE", "Free", true, null, 50, false, false);
        SaasSubscription existing = new SaasSubscription(
                UUID.randomUUID(),
                storeId,
                freePlan,
                SaasSubscriptionStatus.ACTIVE,
                null,
                null
        );
        StoreSaasSubscriptionService service = new StoreSaasSubscriptionService(saasPlanRepository, saasSubscriptionRepository);

        when(saasSubscriptionRepository.findByStoreId(storeId)).thenReturn(Optional.of(existing));

        SaasSubscription subscription = service.ensureSubscriptionForStore(storeId);

        assertThat(subscription).isSameAs(existing);
        verify(saasSubscriptionRepository, never()).save(any());
    }
}
