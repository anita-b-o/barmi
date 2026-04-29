package com.barmi.app.notifications;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationEmailConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(NotificationEmailConfiguration.class);

    @Test
    void defaultsToLoggingSender() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(NotificationEmailSender.class);
            assertThat(context.getBean(NotificationEmailSender.class)).isInstanceOf(LoggingNotificationEmailSender.class);
        });
    }

    @Test
    void usesSmtpSenderWhenModeIsSmtpAndMailSenderExists() {
        contextRunner
                .withUserConfiguration(StubMailSenderConfig.class)
                .withPropertyValues(
                        "app.notifications.email.mode=smtp",
                        "app.notifications.email.from=no-reply@example.com"
                )
                .run(context -> {
                    assertThat(context).hasSingleBean(NotificationEmailSender.class);
                    assertThat(context.getBean(NotificationEmailSender.class)).isInstanceOf(SmtpNotificationEmailSender.class);
                });
    }

    @Test
    void failsFastWhenSmtpModeHasNoFromAddress() {
        contextRunner
                .withUserConfiguration(StubMailSenderConfig.class)
                .withPropertyValues("app.notifications.email.mode=smtp")
                .run(context -> {
                    assertThat(context.getStartupFailure()).isNotNull();
                    assertThat(context.getStartupFailure()).hasMessageContaining("notification_email_from_required");
                });
    }

    @Configuration
    static class StubMailSenderConfig {
        @Bean
        JavaMailSender javaMailSender() {
            return Mockito.mock(JavaMailSender.class);
        }
    }
}
