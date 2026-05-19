package com.barmi.app.auth;

import com.barmi.infra.repo.RefreshTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class RefreshTokenCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenCleanupJob.class);

    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenCleanupJob(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional
    @Scheduled(
            initialDelayString = "${app.security.refreshCleanup.initialDelay:PT5M}",
            fixedDelayString = "${app.security.refreshCleanup.fixedDelay:PT30M}"
    )
    public void purgeExpiredOrRevokedTokens() {
        int deleted = refreshTokenRepository.deleteExpiredOrRevoked(Instant.now());
        if (deleted > 0) {
            log.info("refresh_token_cleanup deleted_count={}", deleted);
        }
    }
}
