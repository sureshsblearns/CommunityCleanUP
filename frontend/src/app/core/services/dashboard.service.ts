import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Dashboard, PublicStats } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  mine(): Observable<Dashboard> {
    return this.api.get<Dashboard>('/dashboard');
  }

  publicStats(): Observable<PublicStats> {
    return this.api.get<PublicStats>('/public/stats');
  }
}
