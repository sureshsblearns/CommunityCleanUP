import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Page, Role, User, UserDetail } from '../models/api.models';
import { toParams } from '../utils/http';
import { ApiService } from './api.service';

export interface UserQuery {
  role?: Role | '';
  active?: boolean | '';
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  list(query: UserQuery): Observable<Page<User>> {
    return this.api.get<Page<User>>('/users', toParams({ ...query }));
  }

  detail(id: number): Observable<UserDetail> {
    return this.api.get<UserDetail>(`/users/${id}`);
  }

  update(id: number, body: { name: string; phone: string; organizationName?: string | null }): Observable<User> {
    return this.api.put<User>(`/users/${id}`, body);
  }

  setActive(id: number, active: boolean): Observable<User> {
    return this.api.patch<User>(`/users/${id}/status`, { active });
  }
}
