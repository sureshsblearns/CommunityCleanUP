import { Pipe, PipeTransform } from '@angular/core';
import { thumbnail } from '../../core/utils/images';
import { label } from '../../core/utils/labels';

@Pipe({ name: 'label' })
export class LabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return label(value);
  }
}

@Pipe({ name: 'thumb' })
export class ThumbPipe implements PipeTransform {
  transform(url: string | null | undefined, width = 480, height = 320): string {
    return thumbnail(url, width, height);
  }
}

/** Formats "HH:mm" as a friendly 12-hour time. */
@Pipe({ name: 'time12' })
export class Time12Pipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const [h, m] = value.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
  }
}
