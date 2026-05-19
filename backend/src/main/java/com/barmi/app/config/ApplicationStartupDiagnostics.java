package com.barmi.app.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.actuate.info.Info;
import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Arrays;

@Component
public class ApplicationStartupDiagnostics implements InfoContributor {
    private static final Logger log = LoggerFactory.getLogger(ApplicationStartupDiagnostics.class);

    private final Environment environment;
    private final String version;
    private final String commitSha;
    private final String buildTimestamp;
    private volatile long startupDurationMs = -1L;
    private volatile String startupCompletedAt = "unknown";

    public ApplicationStartupDiagnostics(
            Environment environment,
            @Value("${app.release.version:unknown}") String version,
            @Value("${app.release.commitSha:unknown}") String commitSha,
            @Value("${app.release.buildTimestamp:unknown}") String buildTimestamp
    ) {
        this.environment = environment;
        this.version = version;
        this.commitSha = commitSha;
        this.buildTimestamp = buildTimestamp;
    }

    @EventListener(ApplicationReadyEvent.class)
    void logStartupMetadata(ApplicationReadyEvent event) {
        startupDurationMs = event.getTimeTaken() == null ? -1L : event.getTimeTaken().toMillis();
        startupCompletedAt = Instant.now().toString();
        log.info(
                "application_started version={} commit_sha={} build_timestamp={} profiles={} startup_duration_ms={} timestamp={}",
                version,
                commitSha,
                buildTimestamp,
                Arrays.toString(environment.getActiveProfiles()),
                startupDurationMs,
                startupCompletedAt
        );
    }

    @Override
    public void contribute(Info.Builder builder) {
        builder.withDetail("app", java.util.Map.of(
                "version", version,
                "commitSha", commitSha,
                "buildTimestamp", buildTimestamp
        ));
        builder.withDetail("runtime", java.util.Map.of(
                "profiles", Arrays.asList(environment.getActiveProfiles()),
                "startupDurationMs", startupDurationMs,
                "startupCompletedAt", startupCompletedAt
        ));
    }
}
