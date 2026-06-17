package com.barmi.app.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class UploadsWebConfig implements WebMvcConfigurer {
    private final Path uploadsRoot;

    public UploadsWebConfig(@Value("${app.uploads.root:uploads}") String uploadsRoot) {
        this.uploadsRoot = Path.of(uploadsRoot).toAbsolutePath().normalize();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry
                .addResourceHandler("/uploads/**")
                .addResourceLocations(uploadsRoot.toUri().toString());
    }
}
