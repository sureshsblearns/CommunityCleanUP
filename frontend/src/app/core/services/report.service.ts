import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  MapPoint,
  Page,
  Report,
  ReportRequest,
  ReportStatus,
  ReportSummary,
  Urgency,
  WasteType,
} from '../models/api.models';
import { toParams } from '../utils/http';
import { ApiService } from './api.service';

export interface ReportQuery {
  scope?: 'mine' | 'all';
  status?: ReportStatus | '';
  urgency?: Urgency | '';
  wasteType?: WasteType | '';
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiService);

  list(query: ReportQuery): Observable<Page<ReportSummary>> {
    return this.api.get<Page<ReportSummary>>('/reports', toParams({ ...query }));
  }

  get(id: number): Observable<Report> {
    return this.api.get<Report>(`/reports/${id}`);
  }

  create(request: ReportRequest, photos: File[]): Observable<Report> {
    return this.api.post<Report>('/reports', ApiService.multipart(request, { photos }));
  }

  update(id: number, request: ReportRequest): Observable<Report> {
    return this.api.put<Report>(`/reports/${id}`, request);
  }

  changeStatus(id: number, status: ReportStatus, comment?: string): Observable<Report> {
    return this.api.patch<Report>(`/reports/${id}/status`, { status, comment });
  }

  delete(id: number): Observable<void> {
    return this.api.delete(`/reports/${id}`);
  }

  addPhotos(id: number, photos: File[]): Observable<Report> {
    return this.api.post<Report>(`/reports/${id}/photos`, ApiService.multipart(undefined, { photos }));
  }

  deletePhoto(photoId: number): Observable<void> {
    return this.api.delete(`/photos/${photoId}`);
  }

  mapPoints(): Observable<MapPoint[]> {
    return this.api.get<MapPoint[]>('/reports/map');
  }
}
