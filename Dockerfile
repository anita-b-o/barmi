# Build stage
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

COPY backend/ /app/backend/

WORKDIR /app/backend
RUN ./gradlew bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:21-jre-jammy

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
