import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Badge } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BadgeService {
  private readonly api = inject(ApiService);

  mine(): Observable<Badge[]> {
    return this.api.get<Badge[]>('/badges/me');
  }

  catalog(): Observable<Badge[]> {
    return this.api.get<Badge[]>('/badges/catalog');
  }
}
