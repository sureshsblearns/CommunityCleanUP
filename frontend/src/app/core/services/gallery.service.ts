import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GalleryItem, GalleryRequest, Page } from '../models/api.models';
import { toParams } from '../utils/http';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly api = inject(ApiService);

  list(page = 0, size = 9, filter?: 'all' | 'pending'): Observable<Page<GalleryItem>> {
    return this.api.get<Page<GalleryItem>>('/gallery', toParams({ page, size, filter }));
  }

  create(request: GalleryRequest, before: File, after: File): Observable<GalleryItem> {
    return this.api.post<GalleryItem>('/gallery', ApiService.multipart(request, { before, after }));
  }

  createFromEvent(eventId: number): Observable<GalleryItem> {
    return this.api.post<GalleryItem>(`/gallery/from-event/${eventId}`, {});
  }

  update(id: number, request: GalleryRequest): Observable<GalleryItem> {
    return this.api.put<GalleryItem>(`/gallery/${id}`, request);
  }

  setApproval(id: number, approved: boolean): Observable<GalleryItem> {
    return this.api.patch<GalleryItem>(`/gallery/${id}/approval`, {}, toParams({ approved }));
  }

  delete(id: number): Observable<void> {
    return this.api.delete(`/gallery/${id}`);
  }
}
