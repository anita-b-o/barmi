package com.barmi.app.notifications;

public interface NotificationEmailSender {

    void send(EmailMessage message);

    record EmailMessage(
            String to,
            String subject,
            String body
    ) {}
}
