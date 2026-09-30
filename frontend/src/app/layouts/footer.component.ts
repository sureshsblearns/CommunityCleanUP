import { Component } from '@angular/core';

/** Site footer converted from the shared website-footer template (templates/footer.html). */
@Component({
  selector: 'app-footer',
  template: `
    <footer class="bg-[#808080] p-5 text-center font-[Arial,sans-serif] text-white">
      This is a sample footer for testing Claude Code &copy; {{ year }}
    </footer>
  `,
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
}
