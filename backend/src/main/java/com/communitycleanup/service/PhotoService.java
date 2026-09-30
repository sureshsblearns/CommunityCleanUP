package com.communitycleanup.service;

import com.communitycleanup.entity.Photo;
import com.communitycleanup.entity.ReportStatus;
import com.communitycleanup.exception.ApiException;
import com.communitycleanup.repository.PhotoRepository;
import com.communitycleanup.security.UserPrincipal;
import com.communitycleanup.service.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PhotoService {

    private final PhotoRepository photoRepository;
    private final StorageService storageService;

    @Transactional
    public void delete(Long photoId, UserPrincipal principal) {
        Photo photo = photoRepository.findById(photoId).orElseThrow(() -> ApiException.notFound("Photo"));
        if (!principal.isAdmin() && !canDelete(photo, principal)) {
            throw ApiException.forbidden("You cannot delete this photo");
        }
        if (photo.getReport() != null) {
            if (!principal.isAdmin() && photoRepository.countByReportId(photo.getReport().getId()) <= 1) {
                throw ApiException.unprocessable("A report must keep at least one photo");
            }
            photo.getReport().getPhotos().remove(photo);
        }
        if (photo.getEvent() != null) {
            photo.getEvent().getPhotos().remove(photo);
        }
        String publicId = photo.getPublicId();
        photoRepository.delete(photo);
        storageService.delete(publicId);
    }

    private boolean canDelete(Photo photo, UserPrincipal principal) {
        if (photo.getReport() != null) {
            ReportStatus status = photo.getReport().getStatus();
            return photo.getReport().getUser().getId().equals(principal.getId())
                    && (status == ReportStatus.PENDING || status == ReportStatus.REJECTED);
        }
        return photo.getEvent() != null && photo.getEvent().getCreatedBy().getId().equals(principal.getId());
    }
}
