package com.communitycleanup.dto.certificate;

import java.time.Instant;
import java.time.LocalDate;

public record CertificateDto(
        Long id,
        String certificateNumber,
        Long eventId,
        String eventTitle,
        LocalDate eventDate,
        String eventLocation,
        String organizerName,
        String volunteerName,
        Instant issuedAt
) {
}
