# Build stage
FROM gradle:8.10.2-jdk21 AS build
WORKDIR /app/backend

COPY --chown=gradle:gradle backend/ ./
RUN gradle bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:21-jre-jammy
ARG APP_VERSION=unknown
ARG APP_COMMIT_SHA=unknown
ARG APP_BUILD_TIMESTAMP=unknown
LABEL org.opencontainers.image.title="barmi-api"
LABEL org.opencontainers.image.version="$APP_VERSION"
LABEL org.opencontainers.image.revision="$APP_COMMIT_SHA"
LABEL org.opencontainers.image.created="$APP_BUILD_TIMESTAMP"

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r app && useradd -r -g app -u 1001 app
WORKDIR /app

COPY --from=build /app/backend/build/libs/*.jar /app/app.jar
RUN chown -R app:app /app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:8080/actuator/health/liveness || exit 1

USER app

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
