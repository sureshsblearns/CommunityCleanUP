package com.communitycleanup.service.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import com.communitycleanup.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Server-side (signed) Cloudinary uploads. The API secret never leaves the backend; Angular only ever
 * receives the resulting secure URL.
 */
@Slf4j
public class CloudinaryStorageService implements StorageService {

    private final Cloudinary cloudinary;
    private final String rootFolder;

    public CloudinaryStorageService(String cloudName, String apiKey, String apiSecret, String rootFolder) {
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true));
        this.rootFolder = rootFolder;
    }

    @Override
    public StoredFile upload(MultipartFile file, String folder) {
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", rootFolder + "/" + folder,
                    "resource_type", "image",
                    "allowed_formats", new String[]{"jpg", "jpeg", "png", "webp"},
                    // Cap stored originals at 1920px and let Cloudinary pick an efficient quality.
                    "transformation", new Transformation<>().width(1920).height(1920).crop("limit").quality("auto")));
            return new StoredFile((String) result.get("secure_url"), (String) result.get("public_id"));
        } catch (IOException | RuntimeException e) {
            log.error("Cloudinary upload failed: {}", e.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Image upload failed. Please try again.");
        }
    }

    @Override
    public void delete(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
        } catch (IOException | RuntimeException e) {
            log.warn("Failed to delete Cloudinary asset {}: {}", publicId, e.getMessage());
        }
    }

    @Override
    public String providerName() {
        return "cloudinary";
    }
}
