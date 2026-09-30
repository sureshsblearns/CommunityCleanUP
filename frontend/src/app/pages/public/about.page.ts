import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-about-page',
  imports: [RouterLink, LucideAngularModule],
  template: `
    <section class="bg-brand-50/60 py-16">
      <div class="container-page max-w-4xl">
        <p class="eyebrow">About the project</p>
        <h1 class="mt-2 text-4xl font-extrabold">Clean neighbourhoods, built by neighbours</h1>
        <p class="mt-4 text-lg text-gray-600">
          Community Clean-Up Portal is a web platform where residents report unclean public areas, administrators
          verify and track those reports, NGOs organise cleanup events, and volunteers participate and are rewarded
          for their effort.
        </p>
      </div>
    </section>

    <section class="container-page max-w-4xl py-14">
      <h2 class="text-2xl font-bold">Who is it for?</h2>
      <div class="mt-6 grid gap-5 sm:grid-cols-2">
        @for (role of roles; track role.title) {
          <div class="card card-body">
            <div class="flex items-center gap-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <lucide-icon [name]="role.icon" [size]="20" aria-hidden="true" />
              </span>
              <h3 class="text-lg font-semibold">{{ role.title }}</h3>
            </div>
            <ul class="mt-3 space-y-1.5 text-sm text-gray-600">
              @for (point of role.points; track point) {
                <li class="flex gap-2"><lucide-icon name="check" [size]="16" class="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />{{ point }}</li>
              }
            </ul>
          </div>
        }
      </div>

      <h2 class="mt-14 text-2xl font-bold">How rewards work</h2>
      <div class="card card-body mt-4 text-sm text-gray-600">
        <p>Points are awarded by the system — never self-reported. When an organiser confirms your attendance at a
          completed cleanup you receive <strong>50 points</strong> and a downloadable participation certificate.
          Badges unlock automatically at 1, 3, 5, 10 and 20 attended events, and reporters earn the
          <em>Eco Reporter</em> badge when an area they reported is cleaned.</p>
        <p class="mt-3">Certificates recognise community participation and are not official government certifications.</p>
      </div>

      <div class="mt-12 flex flex-wrap gap-3">
        <a routerLink="/register" class="btn btn-primary btn-lg">Create an account</a>
        <a routerLink="/events" class="btn btn-secondary btn-lg">Browse events</a>
      </div>
    </section>
  `,
})
export class AboutPage {
  protected readonly roles = [
    { icon: 'user', title: 'Residents', points: ['Report dirty areas with photos and a map pin', 'Track each report until it is cleaned', 'Join suitable cleanup events'] },
    { icon: 'hand-heart', title: 'Volunteers', points: ['Find and register for nearby cleanups', 'Earn points, badges and certificates', 'Climb the community leaderboard'] },
    { icon: 'building-2', title: 'NGOs', points: ['Turn verified reports into cleanup events', 'Manage registrations and attendance', 'Publish before/after results to the gallery'] },
    { icon: 'shield', title: 'Administrators', points: ['Verify or reject reports', 'Manage users, events and the gallery', 'Monitor analytics across the platform'] },
  ];
}
