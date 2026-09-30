import { Component, input, model } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-star-rating',
  imports: [LucideAngularModule],
  template: `
    @if (readonly()) {
      <span class="inline-flex items-center gap-0.5" role="img" [attr.aria-label]="value() + ' out of 5 stars'">
        @for (star of stars; track star) {
          <lucide-icon name="star" [size]="size()" aria-hidden="true"
                       [class]="star <= value() ? 'fill-amber-400 text-amber-400' : 'text-gray-300'" />
        }
      </span>
    } @else {
      <div class="inline-flex items-center gap-1" role="radiogroup" aria-label="Rating">
        @for (star of stars; track star) {
          <button type="button" role="radio" class="rounded p-0.5 transition hover:scale-110"
                  [attr.aria-checked]="star === value()" [attr.aria-label]="star + ' star' + (star > 1 ? 's' : '')"
                  (click)="value.set(star)">
            <lucide-icon name="star" [size]="size()" aria-hidden="true"
                         [class]="star <= value() ? 'fill-amber-400 text-amber-400' : 'text-gray-300'" />
          </button>
        }
      </div>
    }
  `,
})
export class StarRatingComponent {
  readonly value = model(0);
  readonly readonly = input(false);
  readonly size = input(22);
  protected readonly stars = [1, 2, 3, 4, 5];
}
