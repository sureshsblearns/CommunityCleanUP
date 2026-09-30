import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminBadge,
  AdminRewardTransaction,
  BadgeType,
  EventAnalytics,
  Overview,
  Page,
  ReportAnalytics,
  VolunteerAnalytics,
} from '../models/api.models';
import { toParams } from '../utils/http';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  overview(): Observable<Overview> {
    return this.api.get<Overview>('/admin/analytics/overview');
  }

  reportAnalytics(): Observable<ReportAnalytics> {
    return this.api.get<ReportAnalytics>('/admin/analytics/reports');
  }

  eventAnalytics(): Observable<EventAnalytics> {
    return this.api.get<EventAnalytics>('/admin/analytics/events');
  }

  volunteerAnalytics(): Observable<VolunteerAnalytics> {
    return this.api.get<VolunteerAnalytics>('/admin/analytics/volunteers');
  }

  transactions(page = 0, size = 10): Observable<Page<AdminRewardTransaction>> {
    return this.api.get<Page<AdminRewardTransaction>>('/admin/rewards/transactions', toParams({ page, size }));
  }

  badges(page = 0, size = 10): Observable<Page<AdminBadge>> {
    return this.api.get<Page<AdminBadge>>('/admin/badges', toParams({ page, size }));
  }

  awardBadge(userId: number, badge: BadgeType): Observable<void> {
    return this.api.post<void>('/admin/badges', { userId, badge });
  }

  revokeBadge(id: number): Observable<void> {
    return this.api.delete(`/admin/badges/${id}`);
  }
}
