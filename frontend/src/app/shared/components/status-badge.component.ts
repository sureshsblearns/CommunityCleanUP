import { Component, computed, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { label, statusTone, TONE_CLASSES } from '../../core/utils/labels';

/** Status/urgency chip that pairs color with an icon and text so meaning never relies on color alone. */
@Component({
  selector: 'app-status-badge',
  imports: [LucideAngularModule],
  template: `
    <span class="chip" [class]="classes()">
      <lucide-icon [name]="meta().icon" [size]="13" aria-hidden="true" />
      {{ prefix() }}{{ text() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly value = input.required<string>();
  readonly prefix = input('');

  protected readonly meta = computed(() => statusTone(this.value()));
  protected readonly text = computed(() => label(this.value()));
  protected readonly classes = computed(() => 'chip ' + TONE_CLASSES[this.meta().tone]);
}
