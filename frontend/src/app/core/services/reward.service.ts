import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LeaderboardEntry, Page, RewardSummary } from '../models/api.models';
import { toParams } from '../utils/http';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class RewardService {
  private readonly api = inject(ApiService);

  mine(): Observable<RewardSummary> {
    return this.api.get<RewardSummary>('/rewards/me');
  }

  leaderboard(page = 0, size = 20): Observable<Page<LeaderboardEntry>> {
    return this.api.get<Page<LeaderboardEntry>>('/leaderboard', toParams({ page, size }));
  }
}
