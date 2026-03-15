package com.barmi;

import org.junit.jupiter.api.Test;

class TestcontainersPostgresTest extends PostgresIntegrationTestBase {

    @Test
    void runsWithPostgres() {
        System.out.println("TC image = " + postgres.getDockerImageName());
        System.out.println("TC jdbc  = " + postgres.getJdbcUrl());
    }
}
