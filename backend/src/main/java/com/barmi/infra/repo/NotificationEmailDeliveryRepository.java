package com.barmi.infra.repo;

import com.barmi.domain.notifications.NotificationEmailDelivery;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationEmailDeliveryRepository extends JpaRepository<NotificationEmailDelivery, String> {
}
