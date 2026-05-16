package com.barmi.app.config;

import io.lettuce.core.ClientOptions;
import io.lettuce.core.SocketOptions;
import org.springframework.boot.autoconfigure.data.redis.LettuceClientConfigurationBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class RedisConfig {

    @Bean
    public LettuceClientConfigurationBuilderCustomizer lettuceClientConfigurationBuilderCustomizer() {
        return clientConfigBuilder -> {
            SocketOptions socketOptions = SocketOptions.builder()
                    .connectTimeout(Duration.ofMillis(500))
                    .build();

            ClientOptions clientOptions = ClientOptions.builder()
                    .socketOptions(socketOptions)
                    .disconnectedBehavior(ClientOptions.DisconnectedBehavior.DEFAULT)
                    .build();

            clientConfigBuilder.clientOptions(clientOptions);
        };
    }
}
