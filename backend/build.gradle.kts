import org.springframework.boot.gradle.tasks.run.BootRun

plugins {
    id("org.springframework.boot") version "3.3.5"
    id("io.spring.dependency-management") version "1.1.6"
    java
}

group = "com.barmi"
version = "0.1.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

/* ============================================================
   1️⃣  SOURCE SETS
   ============================================================ */

val integrationTest by sourceSets.creating {
    java.srcDir("src/integrationTest/java")
    resources.srcDir("src/integrationTest/resources")

    compileClasspath += sourceSets["main"].output + configurations["testRuntimeClasspath"]
    runtimeClasspath += output + compileClasspath
}

/* ============================================================
   2️⃣  CONFIGURATIONS
   ============================================================ */

configurations[integrationTest.implementationConfigurationName]
    .extendsFrom(configurations["testImplementation"])

configurations[integrationTest.runtimeOnlyConfigurationName]
    .extendsFrom(configurations["testRuntimeOnly"])

/* ============================================================
   3️⃣  DEPENDENCIES
   ============================================================ */

dependencies {
    // App
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    runtimeOnly("io.micrometer:micrometer-registry-prometheus")

    // Flyway (en Flyway 10, PostgreSQL es módulo separado)
    implementation("org.flywaydb:flyway-core")
    runtimeOnly("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.11.5")

    // Unit tests
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly("com.h2database:h2")

    // Testcontainers BOM (unit + integration)
    testImplementation(platform("org.testcontainers:testcontainers-bom:1.20.4"))
    add(integrationTest.implementationConfigurationName, platform("org.testcontainers:testcontainers-bom:1.20.4"))

    // Testcontainers deps (unit)
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")

    // Testcontainers deps (integration)
    add(integrationTest.implementationConfigurationName, "org.testcontainers:junit-jupiter")
    add(integrationTest.implementationConfigurationName, "org.testcontainers:postgresql")
}

/* ============================================================
   4️⃣  TASKS
   ============================================================ */

fun Test.useBackendTestEnvironment(profile: String) {
    useJUnitPlatform()
    systemProperty("spring.profiles.active", profile)

    environment("REFRESH_COOKIE_NAME", "barmi_refresh_token")
    environment("REFRESH_COOKIE_PATH", "/api/auth")
    environment("REFRESH_COOKIE_SECURE", "false")
    environment("REFRESH_COOKIE_SAMESITE", "Lax")
    environment("REFRESH_COOKIE_DOMAIN", "")
    environment("STORE_BASE_DOMAIN", "example.com")
}

tasks.test {
    useBackendTestEnvironment("test")
}

tasks.register<Test>("integrationTest") {
    description = "Runs integration tests."
    group = "verification"

    testClassesDirs = integrationTest.output.classesDirs
    classpath = integrationTest.runtimeClasspath

    shouldRunAfter(tasks.test)
    useBackendTestEnvironment("integrationtest")
}

tasks.register("baselineCheck") {
    description = "Runs the fast backend baseline validation."
    group = "verification"
    dependsOn(tasks.test)
}

tasks.register("baselineVerify") {
    description = "Runs the fuller backend baseline validation, including integration tests."
    group = "verification"
    dependsOn(tasks.test, "integrationTest")
}

tasks.check {
    dependsOn("integrationTest")
}

// ✅ MUY IMPORTANTE: correr bootRun con Java 21 aunque tu shell esté en Java 17
tasks.withType<BootRun>().configureEach {
    javaLauncher.set(
        javaToolchains.launcherFor {
            languageVersion.set(JavaLanguageVersion.of(21))
        }
    )
}

tasks.withType<ProcessResources> {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

tasks.withType<Copy> {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}
