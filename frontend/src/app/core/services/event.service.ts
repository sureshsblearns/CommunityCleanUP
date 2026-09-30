import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CleanupEvent, EventRequest, EventStatus, EventSummary, Page, PhotoType } from '../models/api.models';
import { toParams } from '../utils/http';
import { ApiService } from './api.service';

export type EventScope = 'upcoming' | 'past' | 'all' | 'mine' | 'registered';

export interface EventQuery {
  scope?: EventScope;
  status?: EventStatus | '';
  q?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly api = inject(ApiService);

  list(query: EventQuery): Observable<Page<EventSummary>> {
    return this.api.get<Page<EventSummary>>('/events', toParams({ ...query }));
  }

  upcomingPublic(limit = 3): Observable<EventSummary[]> {
    return this.api.get<EventSummary[]>('/public/upcoming-events', toParams({ limit }));
  }

  get(id: number): Observable<CleanupEvent> {
    return this.api.get<CleanupEvent>(`/events/${id}`);
  }

  create(request: EventRequest): Observable<CleanupEvent> {
    return this.api.post<CleanupEvent>('/events', request);
  }

  update(id: number, request: EventRequest): Observable<CleanupEvent> {
    return this.api.put<CleanupEvent>(`/events/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete(`/events/${id}`);
  }

  changeStatus(id: number, status: EventStatus, comment?: string): Observable<CleanupEvent> {
    return this.api.patch<CleanupEvent>(`/events/${id}/status`, { status, comment });
  }

  addPhotos(id: number, type: PhotoType, photos: File[]): Observable<CleanupEvent> {
    return this.api.post<CleanupEvent>(
      `/events/${id}/photos`,
      ApiService.multipart(undefined, { photos }),
      toParams({ type }),
    );
  }
}
