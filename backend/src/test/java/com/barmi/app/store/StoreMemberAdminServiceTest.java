package com.barmi.app.store;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.infra.repo.StoreMemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StoreMemberAdminServiceTest {

    @Mock
    private StoreMemberRepository storeMemberRepository;

    @Mock
    private StoreAuthorizationService storeAuthorizationService;

    @InjectMocks
    private StoreMemberAdminService storeMemberAdminService;

    @Test
    void adminCannotCreateOwnerMembership() {
        Store store = new Store(UUID.randomUUID(), "demo-store", "Demo");
        StoreMember actor = new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "admin@example.com",
                StoreMemberRole.ADMIN,
                StoreMemberStatus.ACTIVE
        );

        when(storeAuthorizationService.requireCurrentActiveMember()).thenReturn(actor);
        when(storeAuthorizationService.requireCurrentStore()).thenReturn(store);

        assertThatThrownBy(() -> storeMemberAdminService.createMember("owner@example.com", "OWNER"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode().value()).isEqualTo(409);
                    assertThat(rse.getReason()).isEqualTo("cannot_assign_owner");
                });
    }

    @Test
    void cannotDeactivateLastActiveOwner() {
        Store store = new Store(UUID.randomUUID(), "demo-store", "Demo");
        StoreMember actor = new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "owner@example.com",
                StoreMemberRole.OWNER,
                StoreMemberStatus.ACTIVE
        );
        StoreMember ownerMembership = new StoreMember(
                actor.getId(),
                store.getId(),
                actor.getMemberEmail(),
                StoreMemberRole.OWNER,
                StoreMemberStatus.ACTIVE
        );

        when(storeAuthorizationService.requireCurrentActiveMember()).thenReturn(actor);
        when(storeAuthorizationService.requireCurrentStore()).thenReturn(store);
        when(storeMemberRepository.findByIdAndStoreId(ownerMembership.getId(), store.getId()))
                .thenReturn(Optional.of(ownerMembership));
        when(storeMemberRepository.countByStoreIdAndRoleAndStatus(
                store.getId(),
                StoreMemberRole.OWNER,
                StoreMemberStatus.ACTIVE
        )).thenReturn(1L);

        assertThatThrownBy(() -> storeMemberAdminService.updateStatus(ownerMembership.getId(), "INACTIVE"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode().value()).isEqualTo(409);
                    assertThat(rse.getReason()).isEqualTo("cannot_remove_last_owner");
                });
    }
}
