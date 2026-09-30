import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiBaseUrl: string;
  googleMapsApiKey: string;
  googleMapsMapId: string;
  defaultMapCenter: { lat: number; lng: number };
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

const DEFAULT_CONFIG: AppConfig = {
  apiBaseUrl: 'http://localhost:8080/api',
  googleMapsApiKey: '',
  googleMapsMapId: 'DEMO_MAP_ID',
  defaultMapCenter: { lat: 13.0827, lng: 80.2707 },
};

/** Loads /app-config.json (generated from environment variables at build time) with safe defaults. */
export async function loadRuntimeConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('app-config.json', { cache: 'no-store' });
    if (!response.ok) return DEFAULT_CONFIG;
    const loaded = (await response.json()) as Partial<AppConfig>;
    return { ...DEFAULT_CONFIG, ...loaded };
  } catch {
    return DEFAULT_CONFIG;
  }
}
