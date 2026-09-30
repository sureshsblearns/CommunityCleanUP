package com.communitycleanup.controller;

import com.communitycleanup.dto.certificate.CertificateDto;
import com.communitycleanup.dto.common.ApiResponse;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.CertificateService;
import com.communitycleanup.service.CertificateService.PdfFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Certificates")
@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
public class CertificateController {

    private final CertificateService certificateService;

    @GetMapping("/me")
    public ApiResponse<List<CertificateDto>> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(certificateService.mine(principal.getId()));
    }

    @GetMapping("/{id}")
    public ApiResponse<CertificateDto> get(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(certificateService.get(id, principal));
    }

    @Operation(summary = "Download certificate as PDF (owner or ADMIN)")
    @GetMapping(value = "/{id}/download", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> download(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal principal) {
        PdfFile file = certificateService.generatePdf(id, principal);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(file.filename()).build().toString())
                .body(file.content());
    }

    @Operation(summary = "Public verification of a certificate number")
    @GetMapping("/verify/{number}")
    public ApiResponse<CertificateDto> verify(@PathVariable String number) {
        return ApiResponse.ok(certificateService.verify(number));
    }
}
