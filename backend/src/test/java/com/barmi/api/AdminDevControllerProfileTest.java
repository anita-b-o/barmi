package com.barmi.api;

import com.barmi.app.saas.StoreSaasSubscriptionService;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AdminDevControllerProfileTest {

    @Test
    void adminDevControllerIsNotRegisteredInProd() {
        try (AnnotationConfigApplicationContext context = contextForProfile("prod")) {
            assertThat(context.getBeansOfType(AdminDevController.class)).isEmpty();
        }
    }

    @Test
    void adminDevControllerIsRegisteredInLocal() {
        try (AnnotationConfigApplicationContext context = contextForProfile("local")) {
            assertThat(context.getBeansOfType(AdminDevController.class)).hasSize(1);
        }
    }

    private AnnotationConfigApplicationContext contextForProfile(String profile) {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
        context.getEnvironment().setActiveProfiles(profile);
        context.register(TestConfig.class, AdminDevController.class);
        context.refresh();
        return context;
    }

    @Configuration
    static class TestConfig {
        @Bean
        StoreRepository storeRepository() {
            return mock(StoreRepository.class);
        }

        @Bean
        ProductRepository productRepository() {
            return mock(ProductRepository.class);
        }

        @Bean
        StoreSaasSubscriptionService storeSaasSubscriptionService() {
            return mock(StoreSaasSubscriptionService.class);
        }
    }
}
