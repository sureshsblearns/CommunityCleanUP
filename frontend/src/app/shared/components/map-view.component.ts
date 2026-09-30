import { Component, computed, effect, ElementRef, inject, input, OnDestroy, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MapService } from '../../core/services/map.service';

export interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  link?: string;
  color?: string;
}

/** Read-only map with one or more markers. Falls back to coordinates + an external Google Maps link. */
@Component({
  selector: 'app-map-view',
  imports: [LucideAngularModule],
  template: `
    @if (markers().length === 0) {
      <div class="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-500"
           [style.height]="height()">
        <lucide-icon name="map-pin" [size]="16" aria-hidden="true" /> No map coordinates were provided.
      </div>
    } @else {
      <div class="relative overflow-hidden rounded-xl border border-gray-200 bg-brand-50">
        <div #mapEl class="w-full" [style.height]="height()" [class.hidden]="maps.state() !== 'ready'"
             role="img" [attr.aria-label]="ariaLabel()"></div>
        @if (maps.state() !== 'ready') {
          <div class="flex flex-col items-center justify-center gap-2 p-6 text-center" [style.height]="height()">
            @if (maps.state() === 'unavailable') {
              <lucide-icon name="map-pin" [size]="26" class="text-brand-500" aria-hidden="true" />
              @if (markers().length === 1) {
                <p class="text-sm font-medium text-gray-700">{{ markers()[0].lat.toFixed(5) }}, {{ markers()[0].lng.toFixed(5) }}</p>
                <a class="btn btn-secondary btn-sm" target="_blank" rel="noopener"
                   [href]="'https://www.google.com/maps/search/?api=1&query=' + markers()[0].lat + ',' + markers()[0].lng">
                  <lucide-icon name="external-link" [size]="14" aria-hidden="true" /> Open in Google Maps
                </a>
              } @else {
                <p class="text-sm font-medium text-gray-700">{{ markers().length }} mapped locations</p>
              }
              <p class="max-w-sm text-xs text-gray-500">{{ maps.reason() }}</p>
            } @else {
              <lucide-icon name="loader" [size]="20" class="animate-spin text-brand-600" aria-hidden="true" />
            }
          </div>
        }
      </div>
    }
  `,
})
export class MapViewComponent implements OnDestroy {
  protected readonly maps = inject(MapService);
  private readonly router = inject(Router);

  readonly markers = input<MapMarker[]>([]);
  readonly height = input('18rem');
  readonly zoom = input(15);

  private readonly mapEl = viewChild<ElementRef<HTMLDivElement>>('mapEl');
  private map?: google.maps.Map;
  private rendered: google.maps.marker.AdvancedMarkerElement[] = [];

  protected readonly ariaLabel = computed(() =>
    this.markers().length === 1 ? `Map showing ${this.markers()[0].title}` : `Map showing ${this.markers().length} locations`,
  );

  constructor() {
    effect(() => {
      const markers = this.markers();
      const el = this.mapEl();
      if (markers.length && el) void this.render(el.nativeElement, markers);
    });
  }

  private async render(el: HTMLElement, markers: MapMarker[]): Promise<void> {
    if (!(await this.maps.load())) return;
    try {
      if (!this.map) {
        this.map = new google.maps.Map(el, {
          center: markers[0],
          zoom: this.zoom(),
          mapId: this.maps.mapId,
          streetViewControl: false,
          mapTypeControl: false,
        });
      }
      this.rendered.forEach((m) => (m.map = null));
      this.rendered = markers.map((m) => {
        const pin = new google.maps.marker.PinElement({
          background: m.color ?? '#059669',
          borderColor: '#064e3b',
          glyphColor: '#ffffff',
        });
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: this.map,
          position: { lat: m.lat, lng: m.lng },
          title: m.title,
          content: pin.element,
          gmpClickable: !!m.link,
        });
        if (m.link) marker.addListener('click', () => void this.router.navigateByUrl(m.link!));
        return marker;
      });
      if (markers.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach((m) => bounds.extend(m));
        this.map.fitBounds(bounds, 40);
      } else {
        this.map.setCenter(markers[0]);
      }
    } catch {
      this.maps.state.set('unavailable');
    }
  }

  ngOnDestroy(): void {
    this.rendered.forEach((m) => (m.map = null));
  }
}
