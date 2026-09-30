import { inject, Injectable, signal } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';

export type MapsState = 'idle' | 'loading' | 'ready' | 'unavailable';

declare global {
  interface Window {
    __ccpMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

/**
 * Loads the Google Maps JavaScript API on demand using the key from runtime configuration.
 * Never throws: when the key is missing or loading fails, `state` becomes 'unavailable' and
 * callers fall back to manual latitude/longitude entry.
 */
@Injectable({ providedIn: 'root' })
export class MapService {
  private readonly config = inject(APP_CONFIG);
  private loader?: Promise<boolean>;

  readonly state = signal<MapsState>('idle');
  readonly reason = signal<string>('');

  get mapId(): string {
    return this.config.googleMapsMapId;
  }

  get defaultCenter(): google.maps.LatLngLiteral {
    return this.config.defaultMapCenter;
  }

  get configured(): boolean {
    return !!this.config.googleMapsApiKey;
  }

  load(): Promise<boolean> {
    if (this.loader) return this.loader;
    if (!this.config.googleMapsApiKey) {
      this.markUnavailable('Google Maps is not configured. Enter the location details manually.');
      this.loader = Promise.resolve(false);
      return this.loader;
    }
    if (typeof google !== 'undefined' && google.maps?.Map) {
      this.state.set('ready');
      this.loader = Promise.resolve(true);
      return this.loader;
    }
    this.state.set('loading');
    this.loader = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        this.markUnavailable('Google Maps took too long to load. You can still enter coordinates manually.');
        resolve(false);
      }, 12000);
      window.__ccpMapsReady = () => {
        clearTimeout(timeout);
        this.state.set('ready');
        resolve(true);
      };
      window.gm_authFailure = () => this.markUnavailable('The Google Maps API key was rejected. Check its configuration.');
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: this.config.googleMapsApiKey,
        v: 'weekly',
        loading: 'async',
        libraries: 'marker,geocoding',
        callback: '__ccpMapsReady',
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.onerror = () => {
        clearTimeout(timeout);
        this.markUnavailable('Google Maps could not be loaded. You can still enter coordinates manually.');
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return this.loader;
  }

  /** Converts a free-text address into coordinates using the Geocoding service. */
  async geocode(address: string): Promise<{ position: google.maps.LatLngLiteral; address: string } | null> {
    if (!(await this.load())) return null;
    try {
      const { results } = await new google.maps.Geocoder().geocode({ address });
      const first = results[0];
      if (!first) return null;
      return { position: first.geometry.location.toJSON(), address: first.formatted_address };
    } catch {
      return null;
    }
  }

  async reverseGeocode(position: google.maps.LatLngLiteral): Promise<string | null> {
    if (!(await this.load())) return null;
    try {
      const { results } = await new google.maps.Geocoder().geocode({ location: position });
      return results[0]?.formatted_address ?? null;
    } catch {
      return null;
    }
  }

  private markUnavailable(reason: string): void {
    this.state.set('unavailable');
    this.reason.set(reason);
  }
}
