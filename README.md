# Community Clean-Up Portal

**Report. Organize. Clean. Together.**

A full-stack web platform where residents report dirty public areas, administrators verify them, NGOs organise
cleanup events for verified reports, volunteers participate, and the system tracks progress and rewards confirmed
participation with points, badges and PDF certificates.

| Layer | Technology |
|---|---|
| Frontend | Angular 21 (standalone components, signals), TypeScript, Tailwind CSS 4, Angular Router / HttpClient / Reactive Forms, RxJS, Lucide Angular, Chart.js + ng2-charts |
| Backend | Java 21, Spring Boot 3.5, Spring Web, Spring Data JPA / Hibernate, Spring Security + JWT (jjwt), Bean Validation, Lombok, Spring Mail, springdoc-openapi, OpenPDF |
| Database | MySQL 8 with Flyway migrations (Railway MySQL in production) |
| Integrations | Google Maps JavaScript API, Cloudinary (signed server-side uploads), SMTP |

> **Why Angular 21?** Angular 22 requires Node.js ≥ 22.22.3; the development machine has Node 22.13, and
> `lucide-angular` currently supports Angular ≤ 21. The code uses only current standalone/signal APIs, so
> `ng update @angular/core@22 @angular/cli@22` works once Node is upgraded and Lucide publishes v22 support.

---

## Contents
1. [Features](#features)
2. [Architecture](#architecture)
3. [Project structure](#project-structure)
4. [Requirements](#requirements)
5. [Quick start (local)](#quick-start-local)
6. [Environment variables](#environment-variables)
7. [Demo accounts & seed data](#demo-accounts--seed-data)
8. [Google Maps setup](#google-maps-setup)
9. [Cloudinary setup](#cloudinary-setup)
10. [SMTP setup](#smtp-setup)
11. [Database & migrations](#database--migrations)
12. [API documentation](#api-documentation)
13. [Testing](#testing)
14. [Production build & Railway deployment](#production-build--railway-deployment)
15. [Troubleshooting](#troubleshooting)
16. [Known limitations](#known-limitations)

---

## Features

**Residents** report dirty areas (title, description, waste type, urgency, map location, 1–6 photos), track each
report through a visual status timeline, edit/resubmit rejected reports, join events and earn rewards.

**Volunteers** browse and register for events (duplicate/full/cancelled/completed registrations are blocked),
see points, badges, next-badge progress, leaderboard rank and certificates, and leave feedback on completed events
they attended.

**NGOs** create events (optionally linked to a verified report, which moves the report to *Cleaning scheduled*),
open registrations, start/complete/cancel events, mark attendance, upload before/after photos and publish
results to the gallery (subject to admin approval).

**Admins** get a live analytics dashboard (Chart.js charts over server-side aggregations and a report map),
verify/reject reports, manage users (activate/deactivate, never themselves), events, the gallery and badges.

**Business rules enforced on the server**
- Report lifecycle `PENDING → VERIFIED → CLEANING_SCHEDULED → IN_PROGRESS → COMPLETED` (+ `REJECTED`, `CANCELLED`),
  defined as a state machine in `ReportStatus`; every change is written to `report_status_history`.
- Only admins verify/reject; organisers can move their linked report to in-progress/completed; residents can only withdraw.
- Events can only link to verified reports; event start/complete/cancel cascade to the linked report.
- Registration is blocked when full, cancelled, completed, not yet open, or duplicate (DB unique constraint +
  pessimistic lock against races). Capacity automatically toggles `OPEN ↔ FULL`.
- Points (**50** per event) are granted **only** for confirmed attendance at a *completed* event, once per
  user/event (unique constraint). Attendance cannot be self-marked or revoked after rewards were issued.
- Badges are unique per user: First Cleanup (1), Green Volunteer (3), Active Participant (5), Community Helper (10),
  Cleanup Champion (20) attended events, plus Eco Reporter when your report is cleaned.
- Feedback (1–5 stars) only from attended participants of completed events, once per event.
- Public registration can never create an ADMIN; admins are seeded.

---

## Architecture

```
Angular SPA  ──REST/JSON + JWT──►  Spring Boot API ──JPA──► MySQL (Flyway)
    │                                   ├── Cloudinary (signed uploads; secret stays on server)
    │                                   ├── SMTP (async, after-commit emails)
    └── Google Maps JS API (browser)    └── OpenPDF (certificates)
```

Backend packages (`com.communitycleanup`): `config` (security, CORS, storage, OpenAPI, seeding), `controller`
(HTTP only), `service` (business rules), `repository`, `entity`, `dto` (API contracts, entities are never
serialised), `mapper`, `security` (JWT filter, principal, JSON 401/403), `exception` (global handler), `util`.

All responses use one envelope:

```json
{ "success": true, "message": "Report submitted successfully", "data": { } }
{ "success": false, "message": "Validation failed", "errors": { "email": "Enter a valid email address" } }
```

---

## Project structure

```
CommunityCleanUp/
├── backend/                     Spring Boot API (Maven, ./mvnw)
│   ├── src/main/java/com/communitycleanup/...
│   ├── src/main/resources/db/migration/   Flyway V1 (core tables), V2 (supporting tables)
│   ├── src/test/...             unit + MockMvc integration tests (H2 in MySQL mode)
│   ├── Dockerfile               production image (Railway)
│   └── .env.example
├── frontend/                    Angular app
│   ├── src/app/core/            models, services, guards, interceptor, utils
│   ├── src/app/shared/          reusable components & pipes
│   ├── src/app/layouts/         public layout, dashboard shell, navbar, footer
│   ├── src/app/pages/           feature pages (public, auth, reports, events, dashboards, rewards, admin)
│   ├── scripts/generate-config.mjs   env → public/app-config.json
│   ├── vercel.json / netlify.toml
│   └── .env.example
├── database/documentation/      schema & ER diagram
├── docs/                        API reference
├── .env.example                 all variables in one place
└── README.md
```

---

## Requirements

- **Java 21** (JDK) — `java -version`
- **Node.js 20.19+ / 22.12+** and npm
- **MySQL 8** running locally
- Maven is optional (the Maven wrapper `mvnw` / `mvnw.cmd` is included)

---

## Quick start (local)

### 1. Database
Create a MySQL user (or use root). The database `community_cleanup` is created automatically on first start
(`createDatabaseIfNotExist=true`), and Flyway creates all tables.

```sql
CREATE DATABASE IF NOT EXISTS community_cleanup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend
```bash
cd backend
cp .env.example .env          # Windows: copy .env.example .env   — then set DB_PASSWORD and JWT_SECRET
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```
The API runs on http://localhost:8080 (Swagger UI: http://localhost:8080/swagger-ui.html).
On first start it seeds the admin account and demo data.

> If `JAVA_HOME` points to an older JDK, set it to a JDK 21 first, e.g.
> PowerShell: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"`.

### 3. Frontend
```bash
cd frontend
cp .env.example .env          # optional: add GOOGLE_MAPS_API_KEY
npm install
npm start                     # = generate config + ng serve
```
Open http://localhost:4200.

Everything works without Google Maps, Cloudinary or SMTP credentials: maps fall back to manual coordinates,
uploads are stored in `backend/uploads/` (development only) and emails are logged.

---

## Environment variables

### Backend (`backend/.env` or real environment variables)
| Variable | Required | Description |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | – | `dev` (default) or `prod` |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | ✔ | JDBC URL and credentials |
| `JWT_SECRET` | ✔ prod | ≥ 32 characters. Dev without it uses a random key (tokens reset on restart) |
| `JWT_EXPIRATION` | – | Token lifetime in ms (default 86400000 = 24 h) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | ✔ prod | Cloudinary credentials |
| `CLOUDINARY_FOLDER` | – | Root folder (default `community-cleanup`) |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USERNAME` / `MAIL_PASSWORD` / `MAIL_FROM` | – | SMTP; unset = emails logged |
| `FRONTEND_URL` | ✔ | Frontend origin (CORS + email links) |
| `CORS_ALLOWED_ORIGINS` | – | Comma-separated origins (defaults to `FRONTEND_URL`; wildcards like `https://*.vercel.app` allowed) |
| `APP_BASE_URL` | – | Public API URL (for local-storage upload URLs) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | – | Seeded admin (created only if no admin exists) |
| `SEED_DEMO_DATA` | – | `true` in dev, `false` by default in prod |
| `ALLOW_LOCAL_UPLOAD_FALLBACK` | – | `true` in dev, `false` in prod (prod then requires Cloudinary) |
| `PORT` | – | HTTP port (Railway sets this) |

### Frontend (`frontend/.env` or build environment)
| Variable | Description |
|---|---|
| `API_BASE_URL` | e.g. `http://localhost:8080/api` or `https://your-api.up.railway.app/api` |
| `GOOGLE_MAPS_API_KEY` | Browser key for Maps JavaScript API (optional) |
| `GOOGLE_MAPS_MAP_ID` | Map ID for Advanced Markers (`DEMO_MAP_ID` for development) |
| `DEFAULT_MAP_LAT` / `DEFAULT_MAP_LNG` | Initial map centre |

`scripts/generate-config.mjs` writes these into `public/app-config.json` (git-ignored) before every
`npm start` / `npm run build`. The app loads it at startup, so no key is ever hard-coded in source.
Only public values belong here — the Cloudinary secret, DB and SMTP credentials never reach Angular.

---

## Demo accounts & seed data

Seeded automatically on an empty database (`SEED_DEMO_DATA=true`). All people are fictional; demo emails use the
reserved `example.com` domain and never receive mail.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@communitycleanup.local` | `Admin@123` |
| NGO (Green Earth Foundation) | `ngo@example.com` | `Demo@123` |
| NGO (Clean City Collective) | `cleancity@example.com` | `Demo@123` |
| Volunteer | `volunteer@example.com` | `Demo@123` |
| Volunteers | `meera@`, `rahul@`, `sneha@`, `vikram@example.com` | `Demo@123` |
| Resident | `resident@example.com` | `Demo@123` |
| Resident | `ravi@example.com` | `Demo@123` |

Seed data: 11 reports across every status (with status history and photos), 9 events (completed, in progress,
open, full, upcoming, cancelled), 26 registrations, attendance-based points, badges and certificates,
3 approved + 1 pending gallery item, and event feedback. Demo photos are hot-linked from Unsplash.

**Change the admin password** (`ADMIN_PASSWORD`) before any public deployment.

---

## Google Maps setup
1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create/select a project.
2. **APIs & Services → Library**: enable **Maps JavaScript API** (and **Geocoding API** for address search / reverse geocoding).
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict the key: *Application restrictions* → **Websites** → add `http://localhost:4200/*` and your production
   domain; *API restrictions* → Maps JavaScript API + Geocoding API.
5. (Recommended) **Google Maps Platform → Map management → Create Map ID** (JavaScript, vector) for Advanced Markers.
6. Put the values in `frontend/.env` (or Vercel/Netlify env vars): `GOOGLE_MAPS_API_KEY=...`, `GOOGLE_MAPS_MAP_ID=...`.
7. Enable **billing** on the project for production usage (Google provides a monthly free credit).

Maps are used for report and event location picking (click / drag marker / search / current location), report and
event detail maps, and the admin report-location map. If the key is missing or rejected, forms keep working with
manual latitude/longitude and detail pages show an "Open in Google Maps" link.

## Cloudinary setup
1. Create a free account at [cloudinary.com](https://cloudinary.com/).
2. Dashboard → copy **Cloud name**, **API key**, **API secret**.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` for the **backend only**.

Uploads go Angular → Spring Boot (multipart) → Cloudinary (signed with the secret on the server). The backend
validates type (JPG/JPEG/PNG/WEBP by MIME type, extension **and** file signature) and size (≤ 5 MB each, ≤ 6 per
request), caps originals at 1920 px with `q_auto`, and stores only `secure_url` + `public_id` in MySQL.
The frontend requests on-the-fly thumbnails (`c_fill,w_…,h_…,q_auto,f_auto`).

## SMTP setup
Any SMTP provider works. Example (Gmail with an [App Password](https://support.google.com/accounts/answer/185833)):
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=you@gmail.com
MAIL_PASSWORD=your-16-char-app-password
MAIL_FROM=you@gmail.com
```
Emails are sent asynchronously after the database transaction commits: welcome, report received / verified /
rejected / status changes, event registration, cancellation, completion + certificate, password reset.
Without SMTP settings they are logged (`[email not sent - SMTP not configured]`) and the app continues normally.
Passwords are never logged.

---

## Database & migrations
Flyway migrations in `backend/src/main/resources/db/migration`:
- `V1__create_core_tables.sql` — users, reports, events, event_participants, photos, badges, feedback
- `V2__create_supporting_tables.sql` — reward_transactions, certificates, gallery_items, report_status_history, password_reset_tokens

Hibernate runs with `ddl-auto=validate` in every profile, so the schema is owned by Flyway. Add changes as new
`V3__...sql` files. See [`database/documentation/schema.md`](database/documentation/schema.md) for the ER diagram.

## API documentation
- Swagger UI: `http://localhost:8080/swagger-ui.html` (click **Authorize** and paste `data.accessToken` from `POST /api/auth/login`)
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Endpoint overview with roles: [`docs/API.md`](docs/API.md)

## Testing
```bash
cd backend && ./mvnw test        # 22 tests: state machine, reward rules (Mockito), auth + full workflow (MockMvc + H2)
cd frontend && npx ng test --watch=false   # 15 tests: utilities, validators, pagination component
```
The workflow integration test covers: report → verify → event linked to report → register (duplicate/full
rejected) → attendance rules → complete → 50 points + badge + PDF certificate → feedback rules.

---

## Production build & Railway deployment

### Backend + Railway MySQL
1. Push the repository to GitHub.
2. In [Railway](https://railway.app/): **New Project → Provision MySQL**.
3. **New → GitHub Repo** → select the repo, set **Root Directory** to `backend` (Railway builds the `Dockerfile`).
4. Backend service **Variables** (use Railway references to the MySQL service):
   ```
   SPRING_PROFILES_ACTIVE=prod
   DB_URL=jdbc:mysql://${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}?useSSL=true&requireSSL=false&serverTimezone=UTC
   DB_USERNAME=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   JWT_SECRET=<openssl rand -base64 48>
   CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
   MAIL_HOST=... MAIL_PORT=587 MAIL_USERNAME=... MAIL_PASSWORD=... MAIL_FROM=...
   FRONTEND_URL=https://your-frontend.vercel.app
   APP_BASE_URL=https://your-api.up.railway.app
   ADMIN_EMAIL=you@yourdomain.org
   ADMIN_PASSWORD=<strong password>
   SEED_DEMO_DATA=false          # true if you want demo content for a presentation
   ```
5. **Settings → Networking → Generate Domain**. Health check path: `/actuator/health`.
   Flyway migrates the Railway database automatically on first boot.

Manual jar build: `cd backend && ./mvnw clean package` → `java -jar target/community-cleanup-backend.jar`.

### Frontend (Vercel / Netlify / any static host)
- **Vercel**: import the repo, Root Directory `frontend` (settings come from `vercel.json`), add env vars
  `API_BASE_URL=https://your-api.up.railway.app/api`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_MAP_ID`.
- **Netlify**: base directory `frontend` (`netlify.toml` included), same env vars.
- **Other hosts**: `npm run build` → upload `frontend/dist/frontend/browser` and rewrite unknown paths to `index.html`.

Then set the backend `FRONTEND_URL` / `CORS_ALLOWED_ORIGINS` to the frontend URL and add that domain to the
Google Maps key's allowed referrers. HTTPS is terminated by Railway/Vercel; the backend honours forwarded headers.

---

## Troubleshooting
| Problem | Fix |
|---|---|
| `release version 21 not supported` / Lombok errors | Point `JAVA_HOME` to a JDK 21. |
| `Access denied for user` | Check `DB_USERNAME` / `DB_PASSWORD` in `backend/.env`. |
| `Port 8080 already in use` | Stop the other process or set `PORT=8081` (and update `API_BASE_URL`). |
| Browser shows CORS errors | `FRONTEND_URL` / `CORS_ALLOWED_ORIGINS` must exactly match the frontend origin (scheme + host + port). |
| "Unable to reach the server" in the UI | Backend not running, or wrong `API_BASE_URL` (re-run `npm start` / `npm run build` after changing `.env`). |
| Map says "not configured" / "key was rejected" | Set `GOOGLE_MAPS_API_KEY`, enable Maps JavaScript API, allow your origin in the key restrictions, enable billing. |
| Logged out after backend restart | Set a fixed `JWT_SECRET` (without it dev generates a random key each start). |
| Emails not arriving | Check SMTP variables; look for `Failed to send email` in the backend log. Demo `@example.com` addresses are skipped on purpose. |
| Prod start fails: "Cloudinary is not configured" | Set the three Cloudinary variables (or `ALLOW_LOCAL_UPLOAD_FALLBACK=true`, not recommended — containers lose local files). |
| Reset demo data | Drop the `community_cleanup` database and restart the backend. |

## Known limitations
- Angular 21 instead of 22 (see note at the top).
- Demo images are hot-linked from Unsplash; uploaded images use Cloudinary (or local disk in development).
- Deleting an event photo that was reused by a gallery entry created from that event also removes the image
  from the gallery entry.
- Address search/reverse geocoding needs the Geocoding API enabled on the Google key; without it, pin placement
  still works.
