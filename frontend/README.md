# community-cleanup-portal (frontend)

Angular 21 standalone application styled with Tailwind CSS 4. See the [root README](../README.md) for the full guide.

```bash
cp .env.example .env    # API_BASE_URL, optional GOOGLE_MAPS_API_KEY
npm install
npm start               # generates public/app-config.json, then ng serve on http://localhost:4200
npm run build           # production build in dist/frontend/browser
npx ng test --watch=false
```

## Structure
| Folder | Contents |
|---|---|
| `src/app/core/config` | Runtime configuration loaded from `app-config.json` |
| `src/app/core/services` | API services (auth, reports, events, participants, feedback, rewards, badges, certificates, gallery, users, admin, dashboard), maps, toasts, confirm dialogs |
| `src/app/core/guards`, `interceptors` | `authGuard`, `roleGuard`, `guestGuard`; JWT interceptor with session-expiry handling |
| `src/app/shared/components` | Status badge, cards, stat card, chart card, map picker/view, image uploader, status timeline, before/after slider, pagination, toasts, confirm dialog, loading/empty/error states |
| `src/app/layouts` | Public layout (navbar + footer) and the signed-in shell (role-aware sidebar) |
| `src/app/pages` | Public, auth, reports, events, dashboards (resident/volunteer/NGO), rewards, profile, admin |

State is kept in services with Angular signals; no NgRx. Route guards improve UX, but every rule is enforced again
by the backend.
