import { Component, effect, ElementRef, inject, input, OnDestroy, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MapService } from '../../core/services/map.service';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * Interactive location picker: search an address, click the map or drag the marker.
 * If Google Maps is unavailable it explains why and the parent form's manual latitude/longitude
 * inputs remain fully usable; "Use my current location" works in both modes.
 */
@Component({
  selector: 'app-map-picker',
  imports: [LucideAngularModule, FormsModule],
  template: `
    <div class="space-y-3">
      @if (maps.state() !== 'unavailable') {
        <form class="flex gap-2" (submit)="$event.preventDefault(); search()">
          <label for="map-search" class="sr-only">Search for a place</label>
          <div class="relative flex-1">
            <lucide-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input id="map-search" class="input pl-9" [(ngModel)]="query" name="query" placeholder="Search address or landmark" />
          </div>
          <button type="submit" class="btn btn-secondary" [disabled]="searching() || !query.trim()">
            @if (searching()) { <lucide-icon name="loader" [size]="16" class="animate-spin" aria-hidden="true" /> } Find
          </button>
        </form>
      }

      <div class="relative overflow-hidden rounded-xl border border-gray-200 bg-brand-50">
        <div #mapEl class="h-72 w-full sm:h-80" [class.hidden]="maps.state() !== 'ready'"
             role="application" aria-label="Map: click to place the marker, drag it to adjust"></div>
        @if (maps.state() === 'loading' || maps.state() === 'idle') {
          <div class="flex h-72 items-center justify-center gap-2 text-sm text-brand-700 sm:h-80">
            <lucide-icon name="loader" [size]="18" class="animate-spin" aria-hidden="true" /> Loading map…
          </div>
        }
        @if (maps.state() === 'unavailable') {
          <div class="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <lucide-icon name="map" [size]="28" class="text-brand-400" aria-hidden="true" />
            <p class="text-sm font-medium text-gray-700">Map unavailable</p>
            <p class="max-w-sm text-xs text-gray-500">{{ maps.reason() }}</p>
          </div>
        }
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>
          @if (maps.state() === 'ready') { Click on the map or drag the marker to set the exact spot. }
          @else { Enter latitude and longitude below, or use your current location. }
        </span>
        <button type="button" class="btn btn-ghost btn-sm" (click)="useCurrentLocation()" [disabled]="locating()">
          <lucide-icon [name]="locating() ? 'loader' : 'locate-fixed'" [size]="14" [class]="locating() ? 'animate-spin' : ''" aria-hidden="true" />
          Use my current location
        </button>
      </div>
      @if (geoError()) {
        <p class="field-error" role="alert">{{ geoError() }}</p>
      }
    </div>
  `,
})
export class MapPickerComponent implements OnDestroy {
  protected readonly maps = inject(MapService);

  readonly latitude = input<number | null>(null);
  readonly longitude = input<number | null>(null);
  readonly locationChange = output<PickedLocation>();

  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  private map?: google.maps.Map;
  private marker?: google.maps.marker.AdvancedMarkerElement;
  private listeners: google.maps.MapsEventListener[] = [];

  protected query = '';
  protected readonly searching = signal(false);
  protected readonly locating = signal(false);
  protected readonly geoError = signal('');

  constructor() {
    void this.init();
    // Keep the marker in sync when the parent form's coordinates change (e.g. manual entry).
    effect(() => {
      const lat = this.latitude();
      const lng = this.longitude();
      if (this.map && isValid(lat, lng)) {
        this.placeMarker({ lat: lat!, lng: lng! }, false);
      }
    });
  }

  private async init(): Promise<void> {
    if (!(await this.maps.load())) return;
    try {
      const lat = this.latitude();
      const lng = this.longitude();
      const hasPoint = isValid(lat, lng);
      const center = hasPoint ? { lat: lat!, lng: lng! } : this.maps.defaultCenter;
      this.map = new google.maps.Map(this.mapEl().nativeElement, {
        center,
        zoom: hasPoint ? 16 : 12,
        mapId: this.maps.mapId,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      this.listeners.push(
        this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) void this.select(e.latLng.toJSON());
        }),
      );
      if (hasPoint) this.placeMarker(center, false);
    } catch {
      this.maps.state.set('unavailable');
      this.maps.reason.set('The map could not be displayed. You can still enter coordinates manually.');
    }
  }

  protected async search(): Promise<void> {
    const text = this.query.trim();
    if (!text) return;
    this.searching.set(true);
    const result = await this.maps.geocode(text);
    this.searching.set(false);
    if (!result) {
      this.geoError.set('No matching place found. Try a more specific address or click on the map.');
      return;
    }
    this.geoError.set('');
    this.map?.setZoom(16);
    this.placeMarker(result.position, true);
    this.locationChange.emit({ latitude: round(result.position.lat), longitude: round(result.position.lng), address: result.address });
  }

  protected useCurrentLocation(): void {
    if (!('geolocation' in navigator)) {
      this.geoError.set('Your browser does not support location access.');
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating.set(false);
        this.geoError.set('');
        this.map?.setZoom(16);
        void this.select({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        this.locating.set(false);
        this.geoError.set('Unable to get your location. Please allow location access or pick the spot manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  private async select(position: google.maps.LatLngLiteral): Promise<void> {
    this.placeMarker(position, true);
    const point = { latitude: round(position.lat), longitude: round(position.lng) };
    this.locationChange.emit(point);
    const address = await this.maps.reverseGeocode(position);
    if (address) this.locationChange.emit({ ...point, address });
  }

  private placeMarker(position: google.maps.LatLngLiteral, pan: boolean): void {
    if (!this.map) return;
    if (!this.marker) {
      this.marker = new google.maps.marker.AdvancedMarkerElement({
        map: this.map,
        position,
        gmpDraggable: true,
        title: 'Selected location',
      });
      this.listeners.push(
        this.marker.addListener('dragend', () => {
          const p = this.marker?.position;
          if (p) {
            const literal = p instanceof google.maps.LatLng ? p.toJSON() : { lat: Number(p.lat), lng: Number(p.lng) };
            void this.select(literal);
          }
        }),
      );
    } else {
      this.marker.position = position;
    }
    if (pan) this.map.panTo(position);
  }

  ngOnDestroy(): void {
    this.listeners.forEach((l) => l.remove());
    if (this.marker) this.marker.map = null;
  }
}

function isValid(lat: number | null, lng: number | null): boolean {
  return lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function round(value: number): number {
  return Math.round(value * 1e7) / 1e7;
}
