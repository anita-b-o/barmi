package com.barmi.app.notifications;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class LoggingNotificationEmailSender implements NotificationEmailSender {
    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationEmailSender.class);

    @Override
    public void send(EmailMessage message) {
        log.info("STORE notification email skipped_real_delivery mode=logging to={} subject={}",
                maskEmail(message.to()),
                message.subject());
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank() || !email.contains("@")) {
            return "***";
        }
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String domain = parts[1];
        if (local.isBlank()) {
            return "***@" + domain;
        }
        String localMasked = local.length() <= 2
                ? local.charAt(0) + "*"
                : local.substring(0, 2) + "***";
        return localMasked + "@" + domain;
    }
}
