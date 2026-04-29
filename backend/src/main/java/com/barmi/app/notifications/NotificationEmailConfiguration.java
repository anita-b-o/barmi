package com.barmi.app.notifications;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

@Configuration
@EnableConfigurationProperties(NotificationEmailProperties.class)
public class NotificationEmailConfiguration {

    @Bean
    @ConditionalOnProperty(name = "app.notifications.email.mode", havingValue = "smtp")
    NotificationEmailSender smtpNotificationEmailSender(
            JavaMailSender mailSender,
            NotificationEmailProperties properties
    ) {
        return new SmtpNotificationEmailSender(mailSender, properties.getFrom());
    }

    @Bean
    @ConditionalOnMissingBean(NotificationEmailSender.class)
    NotificationEmailSender loggingNotificationEmailSender() {
        return new LoggingNotificationEmailSender();
    }
}
