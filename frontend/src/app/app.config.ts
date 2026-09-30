import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { routes } from './app.routes';
import { AppConfig, APP_CONFIG } from './core/config/app-config';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { APP_ICONS } from './shared/icons';

export function buildAppConfig(runtimeConfig: AppConfig): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      { provide: APP_CONFIG, useValue: runtimeConfig },
      provideRouter(
        routes,
        withComponentInputBinding(),
        withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      ),
      provideHttpClient(withInterceptors([authInterceptor])),
      { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(APP_ICONS) },
    ],
  };
}
