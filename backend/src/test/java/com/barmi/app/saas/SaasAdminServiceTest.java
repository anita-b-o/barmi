package com.barmi.app.saas;

import com.barmi.domain.saas.SaasPlan;
import com.barmi.domain.saas.SaasSubscription;
import com.barmi.domain.saas.SaasSubscriptionStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.SaasPlanRepository;
import com.barmi.infra.repo.SaasSubscriptionRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SaasAdminServiceTest {
    @Mock
    private SaasPlanRepository saasPlanRepository;

    @Mock
    private SaasSubscriptionRepository saasSubscriptionRepository;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private StoreSaasSubscriptionService storeSaasSubscriptionService;

    @Test
    void createPlanRejectsDuplicateCode() {
        SaasAdminService service = service();
        when(saasPlanRepository.existsByCode("PRO")).thenReturn(true);

        assertThatThrownBy(() -> service.createPlan("pro", "Pro", true, null, 100, true, true))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode().value()).isEqualTo(409);
                    assertThat(rse.getReason()).isEqualTo("plan_code_already_exists");
                });
    }

    @Test
    void changeStorePlanPreservesExistingStatusByDefault() {
        UUID storeId = UUID.randomUUID();
        Store store = new Store(storeId, "demo-store", "Demo Store");
        SaasPlan freePlan = new SaasPlan(UUID.randomUUID(), "FREE", "Free", true, null, 50, false, false);
        SaasPlan proPlan = new SaasPlan(UUID.randomUUID(), "PRO", "Pro", true, null, 200, true, true);
        SaasSubscription subscription = new SaasSubscription(
                UUID.randomUUID(),
                storeId,
                freePlan,
                SaasSubscriptionStatus.TRIAL,
                null,
                null
        );
        SaasAdminService service = service();

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(storeSaasSubscriptionService.ensureSubscriptionForStore(storeId)).thenReturn(subscription);
        when(saasPlanRepository.findByCode("PRO")).thenReturn(Optional.of(proPlan));
        when(saasSubscriptionRepository.save(any(SaasSubscription.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SaasAdminService.SaasSubscriptionAdminDto dto = service.changeStorePlan(storeId, null, "pro", null, null);

        assertThat(dto.planCode()).isEqualTo("PRO");
        assertThat(dto.status()).isEqualTo(SaasSubscriptionStatus.TRIAL);
        verify(saasSubscriptionRepository).save(subscription);
    }

    private SaasAdminService service() {
        return new SaasAdminService(
                saasPlanRepository,
                saasSubscriptionRepository,
                storeRepository,
                storeSaasSubscriptionService
        );
    }
}
