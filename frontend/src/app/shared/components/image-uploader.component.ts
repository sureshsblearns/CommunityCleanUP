import { Component, input, model, OnDestroy, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../core/utils/images';

interface Preview {
  file: File;
  url: string;
}

/** Multi-image picker with drag & drop, type/size validation and previews before upload. */
@Component({
  selector: 'app-image-uploader',
  imports: [LucideAngularModule],
  template: `
    <div>
      <label [for]="inputId()"
             class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition"
             [class]="dragging() ? 'border-brand-500 bg-brand-50' : invalid() ? 'border-red-300 bg-red-50/40' : 'border-gray-300 bg-white hover:border-brand-400 hover:bg-brand-50/50'"
             (dragover)="$event.preventDefault(); dragging.set(true)" (dragleave)="dragging.set(false)"
             (drop)="onDrop($event)">
        <div class="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <lucide-icon name="image-plus" [size]="22" aria-hidden="true" />
        </div>
        <span class="text-sm font-semibold text-gray-800">Click to upload or drag photos here</span>
        <span class="mt-1 text-xs text-gray-500">JPG, PNG or WEBP · up to 5 MB each · max {{ max() }} photos</span>
        <input [id]="inputId()" type="file" class="sr-only" accept="image/jpeg,image/png,image/webp"
               [multiple]="max() > 1" (change)="onSelect($event)" />
      </label>

      @if (errors().length) {
        <ul class="mt-2 space-y-1" role="alert">
          @for (error of errors(); track error) {
            <li class="field-error">{{ error }}</li>
          }
        </ul>
      }

      @if (previews().length) {
        <ul class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          @for (p of previews(); track p.url) {
            <li class="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <img [src]="p.url" [alt]="'Preview of ' + p.file.name" class="h-full w-full object-cover" />
              <button type="button" (click)="remove(p)"
                      class="absolute right-1 top-1 rounded-full bg-white/95 p-1 text-gray-700 shadow hover:text-red-600"
                      [attr.aria-label]="'Remove ' + p.file.name">
                <lucide-icon name="x" [size]="14" aria-hidden="true" />
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class ImageUploaderComponent implements OnDestroy {
  readonly files = model<File[]>([]);
  readonly max = input(6);
  readonly invalid = input(false);
  readonly inputId = input('photo-upload');

  protected readonly previews = signal<Preview[]>([]);
  protected readonly errors = signal<string[]>([]);
  protected readonly dragging = signal(false);

  protected onSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.add(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.add(Array.from(event.dataTransfer?.files ?? []));
  }

  protected remove(preview: Preview): void {
    URL.revokeObjectURL(preview.url);
    this.previews.update((list) => list.filter((p) => p !== preview));
    this.files.set(this.previews().map((p) => p.file));
  }

  /** Clears all selected files (used by parent forms after a successful upload). */
  reset(): void {
    this.previews().forEach((p) => URL.revokeObjectURL(p.url));
    this.previews.set([]);
    this.errors.set([]);
    this.files.set([]);
  }

  private add(selected: File[]): void {
    const errors: string[] = [];
    const accepted: Preview[] = [];
    for (const file of selected) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: unsupported format. Use JPG, PNG or WEBP.`);
      } else if (file.size > MAX_IMAGE_BYTES) {
        errors.push(`${file.name}: file is larger than 5 MB.`);
      } else if (this.previews().length + accepted.length >= this.max()) {
        errors.push(`You can attach at most ${this.max()} photo${this.max() > 1 ? 's' : ''}.`);
        break;
      } else {
        accepted.push({ file, url: URL.createObjectURL(file) });
      }
    }
    this.errors.set(errors);
    const next = this.max() === 1 && accepted.length ? accepted : [...this.previews(), ...accepted];
    if (this.max() === 1 && accepted.length) this.previews().forEach((p) => URL.revokeObjectURL(p.url));
    this.previews.set(next);
    this.files.set(next.map((p) => p.file));
  }

  ngOnDestroy(): void {
    this.previews().forEach((p) => URL.revokeObjectURL(p.url));
  }
}
