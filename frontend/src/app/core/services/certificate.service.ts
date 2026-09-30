import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Certificate } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private readonly api = inject(ApiService);

  mine(): Observable<Certificate[]> {
    return this.api.get<Certificate[]>('/certificates/me');
  }

  get(id: number): Observable<Certificate> {
    return this.api.get<Certificate>(`/certificates/${id}`);
  }

  verify(number: string): Observable<Certificate> {
    return this.api.get<Certificate>(`/certificates/verify/${encodeURIComponent(number)}`);
  }

  /** Downloads the PDF with the auth header attached and saves it via a temporary object URL. */
  download(certificate: Pick<Certificate, 'id' | 'certificateNumber'>): Observable<Blob> {
    return this.api.blob(`/certificates/${certificate.id}/download`).pipe(
      tap((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `certificate-${certificate.certificateNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
    );
  }
}
