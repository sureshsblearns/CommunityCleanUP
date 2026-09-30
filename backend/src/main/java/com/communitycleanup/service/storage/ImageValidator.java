package com.communitycleanup.service.storage;

import com.communitycleanup.exception.ApiException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Validates uploaded images by declared MIME type, file extension and file signature ("magic bytes"),
 * so a renamed non-image file is rejected even if the browser claims it is an image.
 */
@Component
public class ImageValidator {

    public static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    public static final int MAX_FILES_PER_REQUEST = 6;

    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/jpg", "image/png", "image/webp");
    private static final Map<String, String> EXTENSIONS = Map.of(
            "jpg", "image/jpeg", "jpeg", "image/jpeg", "png", "image/png", "webp", "image/webp");

    public void validateAll(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw ApiException.badRequest("Please attach at least one photo");
        }
        if (files.size() > MAX_FILES_PER_REQUEST) {
            throw ApiException.badRequest("You can upload at most " + MAX_FILES_PER_REQUEST + " photos at a time");
        }
        files.forEach(this::validate);
    }

    public void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Uploaded file is empty");
        }
        String name = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        if (file.getSize() > MAX_FILE_SIZE) {
            throw ApiException.badRequest("'" + name + "' is larger than 5 MB");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String extension = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        if (!ALLOWED_TYPES.contains(contentType) || !EXTENSIONS.containsKey(extension)) {
            throw ApiException.badRequest("'" + name + "' is not supported. Allowed formats: JPG, JPEG, PNG, WEBP");
        }
        if (!hasImageSignature(file)) {
            throw ApiException.badRequest("'" + name + "' does not appear to be a valid image");
        }
    }

    private boolean hasImageSignature(MultipartFile file) {
        byte[] header = new byte[12];
        try (InputStream in = file.getInputStream()) {
            int read = in.readNBytes(header, 0, header.length);
            if (read < 4) {
                return false;
            }
        } catch (IOException e) {
            return false;
        }
        boolean jpeg = (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF;
        boolean png = (header[0] & 0xFF) == 0x89 && header[1] == 'P' && header[2] == 'N' && header[3] == 'G';
        boolean webp = header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
        return jpeg || png || webp;
    }
}
