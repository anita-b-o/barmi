package com.barmi.app.notifications;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;

class LoggingNotificationEmailSenderTest {

    @Test
    void loggingModeDoesNotFailDelivery() {
        LoggingNotificationEmailSender sender = new LoggingNotificationEmailSender();

        assertThatCode(() -> sender.send(new NotificationEmailSender.EmailMessage(
                "buyer@example.com",
                "[Store] Pago confirmado",
                "Confirmamos el pago de tu orden."
        ))).doesNotThrowAnyException();
    }
}
