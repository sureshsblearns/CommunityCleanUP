import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogComponent, ToastContainerComponent } from './shared/components/overlays.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ConfirmDialogComponent],
  template: `
    <router-outlet />
    <app-toast-container />
    <app-confirm-dialog />
  `,
})
export class App {}
