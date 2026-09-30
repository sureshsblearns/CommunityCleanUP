package com.communitycleanup.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Arrays;
import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String frontendUrl,
        String publicBaseUrl,
        Cors cors,
        Jwt jwt,
        Mail mail,
        Cloudinary cloudinary,
        Storage storage,
        Seed seed,
        Rewards rewards
) {

    public record Cors(String allowedOrigins) {
        public List<String> originList() {
            if (allowedOrigins == null || allowedOrigins.isBlank()) {
                return List.of();
            }
            return Arrays.stream(allowedOrigins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        }
    }

    public record Jwt(String secret, long expirationMs) {
    }

    public record Mail(String from, boolean enabled) {
    }

    public record Cloudinary(String cloudName, String apiKey, String apiSecret, String folder) {
        public boolean isConfigured() {
            return notBlank(cloudName) && notBlank(apiKey) && notBlank(apiSecret);
        }
    }

    public record Storage(String localDir, boolean allowLocalFallback) {
    }

    public record Seed(String adminEmail, String adminPassword, boolean demoData) {
        @Override
        public String toString() {
            return "Seed[adminEmail=" + adminEmail + ", demoData=" + demoData + "]";
        }
    }

    public record Rewards(int attendancePoints) {
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
