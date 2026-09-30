package com.communitycleanup.config;

import com.communitycleanup.service.storage.CloudinaryStorageService;
import com.communitycleanup.service.storage.LocalStorageService;
import com.communitycleanup.service.storage.StorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class StorageConfig {

    @Bean
    public StorageService storageService(AppProperties properties) {
        AppProperties.Cloudinary cloudinary = properties.cloudinary();
        if (cloudinary.isConfigured()) {
            log.info("Image storage: Cloudinary (cloud '{}')", cloudinary.cloudName());
            return new CloudinaryStorageService(cloudinary.cloudName(), cloudinary.apiKey(), cloudinary.apiSecret(),
                    cloudinary.folder());
        }
        if (!properties.storage().allowLocalFallback()) {
            throw new IllegalStateException(
                    "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.");
        }
        log.warn("Cloudinary is not configured; storing uploads in local directory '{}' (development only).",
                properties.storage().localDir());
        return new LocalStorageService(properties.storage().localDir(), properties.publicBaseUrl());
    }
}
