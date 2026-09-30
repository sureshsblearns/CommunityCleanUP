package com.communitycleanup;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Boots the full application against in-memory H2 (MySQL mode, real Flyway migrations). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestSupport {

    protected static final String PASSWORD = "Passw0rd!";
    /** Minimal PNG signature: enough for the server-side magic-byte check. */
    protected static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};

    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper json;

    protected String adminToken() throws Exception {
        return login("admin@test.local", "Admin@123");
    }

    /** Registers a user with a unique email and returns its JWT. */
    protected String register(String role) throws Exception {
        String email = role.toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        Map<String, Object> body = Map.of("name", "Test " + role, "email", email, "phone", "+919876543210",
                "password", PASSWORD, "confirmPassword", PASSWORD, "role", role, "organizationName", "Test Org");
        MvcResult result = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn();
        return read(result).at("/data/accessToken").asText();
    }

    protected String login(String email, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", password))))
                .andExpect(status().isOk()).andReturn();
        return read(result).at("/data/accessToken").asText();
    }

    protected long createReport(String token) throws Exception {
        Map<String, Object> data = Map.of("title", "Garbage near the lake", "description", "Large pile of mixed garbage",
                "wasteType", "MIXED_WASTE", "urgency", "HIGH", "location", "Lake road", "latitude", 13.05, "longitude", 80.25);
        MvcResult result = mvc.perform(multipart("/api/reports")
                        .file(new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, json.writeValueAsBytes(data)))
                        .file(new MockMultipartFile("photos", "photo.png", "image/png", PNG))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated()).andReturn();
        return read(result).at("/data/id").asLong();
    }

    protected void changeReportStatus(String token, long reportId, String status, String comment) throws Exception {
        mvc.perform(patch("/api/reports/" + reportId + "/status").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("status", status, "comment", comment))))
                .andExpect(status().isOk());
    }

    protected long createEvent(String token, Long reportId, int capacity) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>(Map.of("title", "Lake cleanup drive",
                "description", "Clean the lake shore together", "eventDate", LocalDate.now().plusDays(3).toString(),
                "startTime", "08:00", "location", "Lake road", "volunteersRequired", capacity));
        if (reportId != null) body.put("relatedReportId", reportId);
        MvcResult result = mvc.perform(post("/api/events").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isCreated()).andReturn();
        return read(result).at("/data/id").asLong();
    }

    protected JsonNode getJson(String url, String token) throws Exception {
        return read(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(url)
                .header("Authorization", "Bearer " + token)).andExpect(status().isOk()).andReturn());
    }

    protected JsonNode read(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }
}
