import { TestBed } from '@angular/core/testing';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { APP_ICONS } from '../icons';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  function render(page: number, totalPages: number) {
    TestBed.configureTestingModule({
      imports: [PaginationComponent],
      providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(APP_ICONS) }],
    });
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.componentRef.setInput('totalElements', totalPages * 10);
    fixture.detectChanges();
    return fixture;
  }

  it('renders nothing for a single page', () => {
    const fixture = render(0, 1);
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('collapses long page ranges with ellipses and marks the current page', () => {
    const fixture = render(5, 12);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('…');
    const current = fixture.nativeElement.querySelector('[aria-current="page"]');
    expect(current.textContent.trim()).toBe('6');
  });

  it('emits the requested page', () => {
    const fixture = render(0, 3);
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((p: number) => emitted.push(p));
    fixture.nativeElement.querySelector('button[aria-label="Next page"]').click();
    expect(emitted).toEqual([1]);
  });
});
