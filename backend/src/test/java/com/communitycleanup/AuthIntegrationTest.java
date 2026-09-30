package com.communitycleanup;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthIntegrationTest extends IntegrationTestSupport {

    @Test
    void registerReturnsTokenAndMeWorks() throws Exception {
        String token = register("VOLUNTEER");
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("VOLUNTEER"))
                .andExpect(jsonPath("$.data.password").doesNotExist());
    }

    @Test
    void cannotSelfRegisterAsAdmin() throws Exception {
        Map<String, Object> body = Map.of("name", "Sneaky", "email", "sneaky@example.com", "phone", "+919876543210",
                "password", PASSWORD, "confirmPassword", PASSWORD, "role", "ADMIN");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void registrationIsValidated() throws Exception {
        Map<String, Object> body = Map.of("name", "A", "email", "not-an-email", "phone", "12",
                "password", "weak", "confirmPassword", "weak", "role", "RESIDENT");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors", hasKey("email")))
                .andExpect(jsonPath("$.errors", hasKey("password")))
                .andExpect(jsonPath("$.errors", hasKey("phone")));
    }

    @Test
    void duplicateEmailIsRejected() throws Exception {
        Map<String, Object> body = Map.of("name", "Dup User", "email", "dup@example.com", "phone", "+919876543210",
                "password", PASSWORD, "confirmPassword", PASSWORD, "role", "RESIDENT");
        String payload = json.writeValueAsString(body);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isCreated());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isConflict());
    }

    @Test
    void invalidLoginIsUnauthorized() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", "admin@test.local", "password", "wrong"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void protectedEndpointsRequireAValidToken() throws Exception {
        mvc.perform(get("/api/dashboard")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/dashboard").header("Authorization", "Bearer not.a.jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid authentication token"));
    }

    @Test
    void adminEndpointsAreForbiddenForOtherRoles() throws Exception {
        String volunteer = register("VOLUNTEER");
        mvc.perform(get("/api/admin/analytics/overview").header("Authorization", "Bearer " + volunteer))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users").header("Authorization", "Bearer " + volunteer))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/analytics/overview").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.admins", greaterThanOrEqualTo(1)));
    }

    @Test
    void publicEndpointsAreOpen() throws Exception {
        mvc.perform(get("/api/public/stats")).andExpect(status().isOk());
        mvc.perform(get("/api/events")).andExpect(status().isOk());
        mvc.perform(get("/api/gallery")).andExpect(status().isOk());
    }
}
