package com.communitycleanup;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CommunityCleanupApplication {

    public static void main(String[] args) {
        SpringApplication.run(CommunityCleanupApplication.class, args);
    }
}
