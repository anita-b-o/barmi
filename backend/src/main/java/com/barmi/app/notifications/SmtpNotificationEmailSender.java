package com.barmi.app.notifications;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

public class SmtpNotificationEmailSender implements NotificationEmailSender {
    private static final Logger log = LoggerFactory.getLogger(SmtpNotificationEmailSender.class);

    private final JavaMailSender mailSender;
    private final String from;

    public SmtpNotificationEmailSender(JavaMailSender mailSender, String from) {
        if (from == null || from.isBlank()) {
            throw new IllegalStateException("notification_email_from_required");
        }
        this.mailSender = mailSender;
        this.from = from;
    }

    @Override
    public void send(EmailMessage message) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(from);
        mail.setTo(message.to());
        mail.setSubject(message.subject());
        mail.setText(message.body());
        try {
            mailSender.send(mail);
            log.info("STORE notification email delivered mode=smtp to={} subject={}",
                    maskEmail(message.to()),
                    message.subject());
        } catch (RuntimeException ex) {
            log.error("STORE notification email delivery_failed mode=smtp to={} subject={}",
                    maskEmail(message.to()),
                    message.subject(),
                    ex);
            throw ex;
        }
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
