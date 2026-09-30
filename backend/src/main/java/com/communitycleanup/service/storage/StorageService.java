package com.communitycleanup.service.storage;

import org.springframework.web.multipart.MultipartFile;

/** Stores uploaded images outside the database and returns a public URL plus a provider-specific id. */
public interface StorageService {

    StoredFile upload(MultipartFile file, String folder);

    void delete(String publicId);

    String providerName();
}
