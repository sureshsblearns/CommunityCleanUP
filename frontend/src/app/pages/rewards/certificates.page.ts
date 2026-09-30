import { Component, inject, OnInit, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Certificate } from '../../core/models/api.models';
import { CertificateService } from '../../core/services/certificate.service';
import { NotificationService } from '../../core/services/notification.service';
import { errorMessage } from '../../core/utils/http';
import { createLoader } from '../../core/utils/loader';
import { CertificateCardComponent } from '../../shared/components/cards.component';
import { EmptyStateComponent, ErrorStateComponent, LoadingSpinnerComponent } from '../../shared/components/feedback-states.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-certificates-page',
  imports: [LucideAngularModule, PageHeaderComponent, CertificateCardComponent, EmptyStateComponent, ErrorStateComponent,
    LoadingSpinnerComponent],
  template: `
    <app-page-header title="My certificates" eyebrow="Recognition"
                     subtitle="A participation certificate is issued for every completed cleanup where your attendance was confirmed." />

    @if (certificates.loading() && !certificates.data()) {
      <app-loading-spinner />
    } @else if (certificates.error()) {
      <app-error-state [message]="certificates.error()" (retry)="certificates.load()" />
    } @else if (certificates.data()?.length) {
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        @for (c of certificates.data(); track c.id) {
          <app-certificate-card [certificate]="c">
            <button type="button" class="btn btn-primary btn-sm" (click)="download(c)" [disabled]="downloading() === c.id">
              <lucide-icon [name]="downloading() === c.id ? 'loader' : 'download'" [size]="14" [class]="downloading() === c.id ? 'animate-spin' : ''" aria-hidden="true" /> PDF
            </button>
          </app-certificate-card>
        }
      </div>
      <p class="mt-6 text-xs text-gray-500">Certificates recognise community participation and are not official government certifications.</p>
    } @else {
      <app-empty-state icon="award" title="No certificates yet"
                       message="Attend a cleanup event. Once the organiser completes the event, your certificate appears here."
                       ctaLabel="Find a cleanup" ctaLink="/events" />
    }
  `,
})
export class CertificatesPage implements OnInit {
  private readonly certificateService = inject(CertificateService);
  private readonly notifications = inject(NotificationService);
  protected readonly certificates = createLoader(() => this.certificateService.mine(), 'Unable to load your certificates.');
  protected readonly downloading = signal<number | null>(null);

  ngOnInit(): void {
    this.certificates.load();
  }

  protected download(certificate: Certificate): void {
    this.downloading.set(certificate.id);
    this.certificateService.download(certificate).subscribe({
      next: () => this.downloading.set(null),
      error: (err) => {
        this.downloading.set(null);
        this.notifications.error(errorMessage(err, 'Unable to download the certificate.'));
      },
    });
  }
}
