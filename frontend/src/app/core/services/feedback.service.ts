import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EventFeedback, Feedback } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly api = inject(ApiService);

  forEvent(eventId: number): Observable<EventFeedback> {
    return this.api.get<EventFeedback>(`/events/${eventId}/feedback`);
  }

  submit(eventId: number, rating: number, comments: string): Observable<Feedback> {
    return this.api.post<Feedback>(`/events/${eventId}/feedback`, { rating, comments });
  }
}
