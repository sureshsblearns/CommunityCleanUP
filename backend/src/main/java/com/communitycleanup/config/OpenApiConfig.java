package com.communitycleanup.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI communityCleanupOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Community Clean-Up Portal API")
                        .version("1.0.0")
                        .description("""
                                REST API for reporting dirty areas, organising cleanup events and rewarding volunteers.

                                **Authentication:** call `POST /api/auth/login`, copy `data.accessToken`, then click
                                **Authorize** and paste the token. Roles: RESIDENT, VOLUNTEER, NGO, ADMIN.
                                Endpoints under `/api/admin/**` require ADMIN.
                                """))
                .addSecurityItem(new SecurityRequirement().addList(BEARER))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
