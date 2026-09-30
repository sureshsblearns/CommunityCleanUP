package com.communitycleanup.service.storage;

import com.communitycleanup.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

/**
 * Development fallback used only when Cloudinary credentials are absent. Files go to a local directory
 * (never to MySQL) and are served from /uploads/**.
 */
@Slf4j
public class LocalStorageService implements StorageService {

    private static final String PREFIX = "local:";

    private final Path root;
    private final String publicBaseUrl;

    public LocalStorageService(String localDir, String publicBaseUrl) {
        this.root = Path.of(localDir).toAbsolutePath().normalize();
        this.publicBaseUrl = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
    }

    @Override
    public StoredFile upload(MultipartFile file, String folder) {
        String original = file.getOriginalFilename() == null ? "image.jpg" : file.getOriginalFilename();
        String extension = original.substring(original.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String safeFolder = folder.replaceAll("[^a-zA-Z0-9_-]", "");
        String relative = safeFolder + "/" + UUID.randomUUID() + "." + extension;
        Path target = root.resolve(relative).normalize();
        if (!target.startsWith(root)) {
            throw ApiException.badRequest("Invalid upload path");
        }
        try (InputStream in = file.getInputStream()) {
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Local upload failed: {}", e.getMessage());
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Image upload failed. Please try again.");
        }
        return new StoredFile(publicBaseUrl + "/uploads/" + relative, PREFIX + relative);
    }

    @Override
    public void delete(String publicId) {
        if (publicId == null || !publicId.startsWith(PREFIX)) {
            return;
        }
        Path target = root.resolve(publicId.substring(PREFIX.length())).normalize();
        if (!target.startsWith(root)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("Failed to delete local upload {}: {}", target, e.getMessage());
        }
    }

    @Override
    public String providerName() {
        return "local";
    }
}
