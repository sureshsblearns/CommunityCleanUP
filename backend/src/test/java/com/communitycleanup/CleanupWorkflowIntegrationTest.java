package com.communitycleanup;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Exercises the acceptance workflows end to end through the REST API. */
class CleanupWorkflowIntegrationTest extends IntegrationTestSupport {

    @Test
    void fullCleanupLifecycleAwardsPointsBadgesAndCertificates() throws Exception {
        String admin = adminToken();
        String resident = register("RESIDENT");
        String ngo = register("NGO");
        String volunteer = register("VOLUNTEER");

        // Workflow 2: resident reports a dirty area
        long reportId = createReport(resident);
        JsonNode mine = getJson("/api/reports?scope=mine", resident);
        assertThat(mine.at("/data/content/0/id").asLong()).isEqualTo(reportId);
        assertThat(mine.at("/data/content/0/status").asText()).isEqualTo("PENDING");

        // Pending reports are not visible to other users
        mvc.perform(get("/api/reports/" + reportId).header("Authorization", "Bearer " + volunteer))
                .andExpect(status().isForbidden());

        // Workflow 3: admin verifies
        changeReportStatus(admin, reportId, "VERIFIED", "Looks genuine");

        // Workflow 4: NGO creates an event linked to the verified report
        long eventId = createEvent(ngo, reportId, 10);
        assertThat(getJson("/api/reports/" + reportId, admin).at("/data/status").asText()).isEqualTo("CLEANING_SCHEDULED");

        // Workflow 5: volunteer registers; duplicate registration is rejected
        mvc.perform(post("/api/events/" + eventId + "/register").header("Authorization", "Bearer " + volunteer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.viewer.registered").value(true));
        mvc.perform(post("/api/events/" + eventId + "/register").header("Authorization", "Bearer " + volunteer))
                .andExpect(status().isConflict());

        JsonNode participants = getJson("/api/events/" + eventId + "/participants", ngo);
        long participantId = participants.at("/data/0/id").asLong();
        assertThat(participants.at("/data/0/attendance").asBoolean()).isFalse();

        // Volunteers cannot see the participant list or mark attendance
        mvc.perform(get("/api/events/" + eventId + "/participants").header("Authorization", "Bearer " + volunteer))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/events/" + eventId + "/participants/" + participantId + "/attendance")
                        .header("Authorization", "Bearer " + volunteer).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"attended\":true}"))
                .andExpect(status().isForbidden());

        // Attendance cannot be marked before the event starts
        mvc.perform(patch("/api/events/" + eventId + "/participants/" + participantId + "/attendance")
                        .header("Authorization", "Bearer " + ngo).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"attended\":true}"))
                .andExpect(status().isUnprocessableEntity());

        // Workflow 6: NGO starts the event, marks attendance, completes it
        changeEventStatus(ngo, eventId, "IN_PROGRESS");
        assertThat(getJson("/api/reports/" + reportId, admin).at("/data/status").asText()).isEqualTo("IN_PROGRESS");
        mvc.perform(patch("/api/events/" + eventId + "/participants/" + participantId + "/attendance")
                        .header("Authorization", "Bearer " + ngo).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"attended\":true}"))
                .andExpect(status().isOk());

        // Registering doesn't award points; only completion with attendance does
        assertThat(getJson("/api/rewards/me", volunteer).at("/data/totalPoints").asInt()).isZero();

        // Feedback is not allowed before completion
        submitFeedback(volunteer, eventId, 5).andExpect(status().isUnprocessableEntity());

        changeEventStatus(ngo, eventId, "COMPLETED");

        // Workflow 7: points, badge, certificate, leaderboard
        JsonNode rewards = getJson("/api/rewards/me", volunteer);
        assertThat(rewards.at("/data/totalPoints").asInt()).isEqualTo(50);
        assertThat(rewards.at("/data/badges/0/type").asText()).isEqualTo("FIRST_CLEANUP");
        assertThat(rewards.at("/data/badges/0/earned").asBoolean()).isTrue();
        JsonNode certificates = getJson("/api/certificates/me", volunteer);
        assertThat(certificates.at("/data").size()).isEqualTo(1);
        long certificateId = certificates.at("/data/0/id").asLong();
        mvc.perform(get("/api/certificates/" + certificateId + "/download").header("Authorization", "Bearer " + volunteer))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentType()).isEqualTo("application/pdf"));
        mvc.perform(get("/api/certificates/" + certificateId + "/download").header("Authorization", "Bearer " + resident))
                .andExpect(status().isForbidden());

        JsonNode report = getJson("/api/reports/" + reportId, resident);
        assertThat(report.at("/data/status").asText()).isEqualTo("COMPLETED");
        assertThat(report.at("/data/statusHistory").size()).isEqualTo(5);

        // Workflow 8: feedback once, validated
        submitFeedback(volunteer, eventId, 9).andExpect(status().isBadRequest());
        submitFeedback(volunteer, eventId, 5).andExpect(status().isCreated());
        submitFeedback(volunteer, eventId, 4).andExpect(status().isConflict());
        submitFeedback(resident, eventId, 5).andExpect(status().isForbidden());

        // Completing again is impossible; attendance cannot be revoked after rewards
        mvc.perform(patch("/api/events/" + eventId + "/participants/" + participantId + "/attendance")
                        .header("Authorization", "Bearer " + ngo).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"attended\":false}"))
                .andExpect(status().isConflict());
    }

    @Test
    void reportStatusCannotJumpToCompletedOrBeChangedByResidents() throws Exception {
        String resident = register("RESIDENT");
        long reportId = createReport(resident);

        mvc.perform(patch("/api/reports/" + reportId + "/status").header("Authorization", "Bearer " + resident)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"COMPLETED\"}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(patch("/api/reports/" + reportId + "/status").header("Authorization", "Bearer " + resident)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"VERIFIED\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/reports/" + reportId + "/status").header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"REJECTED\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reportCreationIsValidated() throws Exception {
        String resident = register("RESIDENT");
        mvc.perform(multipart("/api/reports")
                        .file(new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE,
                                json.writeValueAsBytes(Map.of("title", "", "wasteType", "PLASTIC"))))
                        .file(new MockMultipartFile("photos", "photo.png", "image/png", PNG))
                        .header("Authorization", "Bearer " + resident))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists())
                .andExpect(jsonPath("$.errors.urgency").exists());

        Map<String, Object> valid = Map.of("title", "Garbage near the lake", "description", "Large pile of garbage",
                "wasteType", "MIXED_WASTE", "urgency", "HIGH", "location", "Lake road");
        mvc.perform(multipart("/api/reports")
                        .file(new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, json.writeValueAsBytes(valid)))
                        .file(new MockMultipartFile("photos", "fake.png", "image/png", "not an image".getBytes()))
                        .header("Authorization", "Bearer " + resident))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("'fake.png' does not appear to be a valid image"));
        mvc.perform(multipart("/api/reports")
                        .file(new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, json.writeValueAsBytes(valid)))
                        .file(new MockMultipartFile("photos", "doc.pdf", "application/pdf", PNG))
                        .header("Authorization", "Bearer " + resident))
                .andExpect(status().isBadRequest());
    }

    @Test
    void fullEventsRejectRegistrationsAndOnlyOrganisersCreateEvents() throws Exception {
        String ngo = register("NGO");
        String first = register("VOLUNTEER");
        String second = register("VOLUNTEER");

        mvc.perform(post("/api/events").header("Authorization", "Bearer " + first).contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        long eventId = createEvent(ngo, null, 1);
        mvc.perform(post("/api/events/" + eventId + "/register").header("Authorization", "Bearer " + first))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("FULL"));
        mvc.perform(post("/api/events/" + eventId + "/register").header("Authorization", "Bearer " + second))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("This event is full"));

        // Unregistering frees the slot again
        mvc.perform(delete("/api/events/" + eventId + "/register").header("Authorization", "Bearer " + first))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("OPEN"));

        changeEventStatus(ngo, eventId, "CANCELLED");
        mvc.perform(post("/api/events/" + eventId + "/register").header("Authorization", "Bearer " + second))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("This event has been cancelled"));
    }

    @Test
    void eventsMustBeLinkedToVerifiedReports() throws Exception {
        String resident = register("RESIDENT");
        String ngo = register("NGO");
        long pendingReport = createReport(resident);
        Map<String, Object> body = Map.of("title", "Too early cleanup", "description", "Report not verified yet",
                "eventDate", java.time.LocalDate.now().plusDays(2).toString(), "startTime", "08:00",
                "location", "Somewhere", "volunteersRequired", 5, "relatedReportId", pendingReport);
        mvc.perform(post("/api/events").header("Authorization", "Bearer " + ngo).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andExpect(status().isUnprocessableEntity());
    }

    private void changeEventStatus(String token, long eventId, String status) throws Exception {
        mvc.perform(patch("/api/events/" + eventId + "/status").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"" + status + "\",\"comment\":\"test\"}"))
                .andExpect(status().isOk());
    }

    private org.springframework.test.web.servlet.ResultActions submitFeedback(String token, long eventId, int rating) throws Exception {
        return mvc.perform(post("/api/events/" + eventId + "/feedback").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("rating", rating, "comments", "Well organised"))));
    }
}
