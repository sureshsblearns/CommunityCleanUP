package com.communitycleanup.service;

import com.communitycleanup.dto.certificate.CertificateDto;
import com.communitycleanup.entity.Certificate;
import com.communitycleanup.entity.Event;
import com.communitycleanup.entity.User;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.mapper.DtoMapper;
import com.communitycleanup.repository.CertificateRepository;
import com.communitycleanup.security.UserPrincipal;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CertificateService {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH);
    private static final Color DEEP_GREEN = new Color(6, 78, 59);
    private static final Color EMERALD = new Color(5, 150, 105);
    private static final Color LIGHT_GREEN = new Color(209, 250, 229);
    private static final Color GRAY = new Color(75, 85, 99);

    private final CertificateRepository certificateRepository;

    /** Issues (or returns the existing) participation certificate for a user and event. */
    @Transactional
    public Certificate issue(User user, Event event) {
        return certificateRepository.findByUserIdAndEventId(user.getId(), event.getId())
                .orElseGet(() -> certificateRepository.save(Certificate.builder()
                        .user(user)
                        .event(event)
                        .certificateNumber(generateNumber())
                        .build()));
    }

    @Transactional(readOnly = true)
    public List<CertificateDto> mine(Long userId) {
        return certificateRepository.findByUserIdOrderByIssuedAtDesc(userId).stream()
                .map(DtoMapper::toCertificateDto).toList();
    }

    @Transactional(readOnly = true)
    public CertificateDto get(Long id, UserPrincipal principal) {
        return DtoMapper.toCertificateDto(loadAuthorized(id, principal));
    }

    @Transactional(readOnly = true)
    public CertificateDto verify(String number) {
        return certificateRepository.findByCertificateNumber(number.trim().toUpperCase(Locale.ROOT))
                .map(DtoMapper::toCertificateDto)
                .orElseThrow(() -> ApiException.notFound("Certificate"));
    }

    @Transactional(readOnly = true)
    public PdfFile generatePdf(Long id, UserPrincipal principal) {
        Certificate certificate = loadAuthorized(id, principal);
        return new PdfFile("certificate-" + certificate.getCertificateNumber() + ".pdf", render(certificate));
    }

    public record PdfFile(String filename, byte[] content) {
    }

    private Certificate loadAuthorized(Long id, UserPrincipal principal) {
        Certificate certificate = certificateRepository.findWithDetailsById(id)
                .orElseThrow(() -> ApiException.notFound("Certificate"));
        if (!principal.isAdmin() && !certificate.getUser().getId().equals(principal.getId())) {
            throw ApiException.forbidden("You can only access your own certificates");
        }
        return certificate;
    }

    private String generateNumber() {
        String number;
        do {
            StringBuilder sb = new StringBuilder("CCP-").append(LocalDate.now(ZoneOffset.UTC).getYear()).append('-');
            for (int i = 0; i < 8; i++) {
                sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
            }
            number = sb.toString();
        } while (certificateRepository.findByCertificateNumber(number).isPresent());
        return number;
    }

    private byte[] render(Certificate certificate) {
        Event event = certificate.getEvent();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate(), 60, 60, 50, 50);
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            document.addTitle("Certificate of Participation");
            document.addCreator("Community Clean-Up Portal");
            document.open();
            drawFrame(writer.getDirectContent(), document.getPageSize());

            add(document, "COMMUNITY CLEAN-UP PORTAL", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, EMERALD), 30, 6);
            add(document, "Certificate of Participation", FontFactory.getFont(FontFactory.TIMES_BOLD, 36, DEEP_GREEN), 4, 24);
            add(document, "This certificate is presented to", FontFactory.getFont(FontFactory.HELVETICA, 14, GRAY), 0, 10);
            add(document, certificate.getUser().getName(), FontFactory.getFont(FontFactory.TIMES_BOLDITALIC, 32, Color.BLACK), 0, 18);
            add(document, "in appreciation of volunteering at the community cleanup event",
                    FontFactory.getFont(FontFactory.HELVETICA, 14, GRAY), 0, 8);
            add(document, "“" + event.getTitle() + "”", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, DEEP_GREEN), 0, 8);
            add(document, "held on " + event.getEventDate().format(DATE_FORMAT) + " at " + event.getLocation()
                            + ", organised by " + event.getCreatedBy().getDisplayOrganization() + ".",
                    FontFactory.getFont(FontFactory.HELVETICA, 12, GRAY), 0, 8);
            add(document, "Thank you for helping keep our community clean and green.",
                    FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 12, GRAY), 6, 36);

            Font meta = FontFactory.getFont(FontFactory.HELVETICA, 10, GRAY);
            add(document, "Certificate ID: " + certificate.getCertificateNumber() + "     |     Issued on: "
                    + certificate.getIssuedAt().atZone(ZoneOffset.UTC).toLocalDate().format(DATE_FORMAT), meta, 0, 4);
            add(document, "This is a community participation certificate issued by the Community Clean-Up Portal. "
                    + "It is not an official government certification.", FontFactory.getFont(FontFactory.HELVETICA, 8, GRAY), 0, 0);
        } catch (DocumentException e) {
            throw new IllegalStateException("Failed to render certificate", e);
        } finally {
            if (document.isOpen()) {
                document.close();
            }
        }
        return out.toByteArray();
    }

    private static void add(Document document, String text, Font font, float before, float after) {
        Paragraph paragraph = new Paragraph(text, font);
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.setSpacingBefore(before);
        paragraph.setSpacingAfter(after);
        document.add(paragraph);
    }

    private static void drawFrame(PdfContentByte canvas, Rectangle page) {
        canvas.saveState();
        canvas.setColorFill(LIGHT_GREEN);
        canvas.rectangle(0, 0, page.getWidth(), page.getHeight());
        canvas.fill();
        canvas.setColorFill(Color.WHITE);
        canvas.rectangle(20, 20, page.getWidth() - 40, page.getHeight() - 40);
        canvas.fill();
        canvas.setColorStroke(DEEP_GREEN);
        canvas.setLineWidth(3f);
        canvas.rectangle(28, 28, page.getWidth() - 56, page.getHeight() - 56);
        canvas.stroke();
        canvas.setColorStroke(EMERALD);
        canvas.setLineWidth(0.8f);
        canvas.rectangle(36, 36, page.getWidth() - 72, page.getHeight() - 72);
        canvas.stroke();
        canvas.restoreState();
    }
}
