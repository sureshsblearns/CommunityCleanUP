import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CleanupEvent, MyParticipation, Participant } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ParticipantService {
  private readonly api = inject(ApiService);

  register(eventId: number): Observable<CleanupEvent> {
    return this.api.post<CleanupEvent>(`/events/${eventId}/register`);
  }

  unregister(eventId: number): Observable<CleanupEvent> {
    return this.api.delete<CleanupEvent>(`/events/${eventId}/register`);
  }

  participants(eventId: number): Observable<Participant[]> {
    return this.api.get<Participant[]>(`/events/${eventId}/participants`);
  }

  markAttendance(eventId: number, participantId: number, attended: boolean): Observable<Participant> {
    return this.api.patch<Participant>(`/events/${eventId}/participants/${participantId}/attendance`, { attended });
  }

  myRegistrations(): Observable<MyParticipation[]> {
    return this.api.get<MyParticipation[]>('/events/my-registrations');
  }
}
