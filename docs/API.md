# API reference

Base URL: `http://localhost:8080/api` · Interactive docs: `/swagger-ui.html` · Auth header: `Authorization: Bearer <accessToken>`

Roles: **R** resident · **V** volunteer · **N** NGO · **A** admin · **Public** no token needed. Authorization is
enforced on the server by URL rules, `@PreAuthorize` and ownership checks inside services.

## Authentication
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Roles RESIDENT / VOLUNTEER / NGO only (ADMIN → 403) |
| POST | `/auth/login` | Public | Returns `{ accessToken, tokenType, expiresIn, user }` |
| GET | `/auth/me` | Any | Current user |
| POST | `/auth/forgot-password` | Public | Always 200 (no account enumeration) |
| POST | `/auth/reset-password` | Public | Token from email, valid 30 min, single use |
| PUT | `/auth/password` | Any | Change own password |

## Users
| Method | Path | Access |
|---|---|---|
| GET | `/users?role=&active=&q=&page=&size=&sort=&direction=` | A |
| GET | `/users/{id}` | Self or A (includes participation stats and badges) |
| PUT | `/users/{id}` | Self or A |
| PATCH | `/users/{id}/status` `{active}` | A (cannot change own status or deactivate the last admin) |

## Reports
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/reports` (multipart: `data` JSON + `photos[]`) | Any | 1–6 images, ≤ 5 MB each |
| GET | `/reports?scope=mine\|all&status=&urgency=&wasteType=&q=&page=&size=&sort=&direction=` | Any | Admin: all; others: verified+ and their own |
| GET | `/reports/map` | Any | Coordinates for map visualisation |
| GET | `/reports/{id}` | Owner, A, or anyone once verified | Includes photos, cleanup photos, history, related events, allowed transitions |
| PUT | `/reports/{id}` | Owner (PENDING/REJECTED → resubmits) or A |
| PATCH | `/reports/{id}/status` `{status, comment}` | A: verify/reject/…; N organiser: in-progress/completed; owner: cancel | Invalid transition → 422 |
| DELETE | `/reports/{id}` | Owner while PENDING, or A |
| POST | `/reports/{id}/photos` (multipart `photos[]`) | Owner (editable) or A |
| DELETE | `/photos/{id}` | Uploader/owner/organiser or A |

## Events & participation
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/events?scope=upcoming\|past\|all\|mine\|registered&status=&q=&page=&size=` | Public (`mine`/`registered` need a token) |
| GET | `/events/{id}` | Public | With a token, `viewer` tells whether you can register / give feedback |
| POST | `/events` | N, A | `relatedReportId` must be VERIFIED; `publish=false` → UPCOMING |
| PUT | `/events/{id}` | Organiser or A | Before it starts; capacity ≥ registrations |
| DELETE | `/events/{id}` | Organiser (no registrations) or A | Completed events cannot be deleted |
| PATCH | `/events/{id}/status` `{status, comment}` | Organiser or A | OPEN, IN_PROGRESS, COMPLETED (awards rewards), CANCELLED |
| POST / DELETE | `/events/{id}/register` | R, V | Duplicate → 409; full/cancelled/completed → 422 |
| GET | `/events/my-registrations` | Any | Own registrations with certificate/feedback state |
| GET | `/events/{id}/participants` | Organiser or A |
| PATCH | `/events/{id}/participants/{participantId}/attendance` `{attended}` | Organiser or A | Only IN_PROGRESS/COMPLETED; never your own |
| POST | `/events/{id}/photos?type=BEFORE\|AFTER` (multipart) | Organiser or A |
| POST | `/events/{id}/feedback` `{rating 1-5, comments}` | Attended participant of a COMPLETED event, once |
| GET | `/events/{id}/feedback` | Public |

## Rewards, badges, certificates
| Method | Path | Access |
|---|---|---|
| GET | `/rewards/me` | Any — points, rank, badges, history, next badge |
| GET | `/badges/me` | Any — full catalogue with earned/locked state |
| GET | `/badges/catalog` | Public |
| GET | `/leaderboard?page=&size=` | Any — name, role, points, completed events, badge count only |
| GET | `/certificates/me` | Any |
| GET | `/certificates/{id}` | Owner or A |
| GET | `/certificates/{id}/download` | Owner or A — `application/pdf` |
| GET | `/certificates/verify/{number}` | Public |

## Gallery
| Method | Path | Access |
|---|---|---|
| GET | `/gallery?page=&size=&filter=all\|pending` | Public (approved only; filters for A) |
| GET | `/gallery/{id}` | Public if approved |
| POST | `/gallery` (multipart `data`, `before`, `after`) | N (pending approval), A |
| POST | `/gallery/from-event/{eventId}` | Organiser or A — uses the event's BEFORE/AFTER photos |
| PUT | `/gallery/{id}` | A |
| PATCH | `/gallery/{id}/approval?approved=` | A |
| DELETE | `/gallery/{id}` | A, or the NGO creator while unapproved |

## Dashboards & analytics
| Method | Path | Access |
|---|---|---|
| GET | `/dashboard` | Any — role-aware counters, lists and activity |
| GET | `/public/stats`, `/public/upcoming-events?limit=` | Public |
| GET | `/admin/analytics/overview` \| `reports` \| `events` \| `volunteers` | A — server-side aggregations |
| GET | `/admin/rewards/transactions`, `/admin/badges` | A |
| POST | `/admin/badges` `{userId, badge}` / DELETE `/admin/badges/{id}` | A |

## Status codes
`200` OK · `201` created · `400` validation / bad input · `401` missing, invalid or expired token · `403` role or
ownership violation · `404` not found · `409` conflict (duplicate email, registration, feedback, badge) ·
`413` upload too large · `422` business rule (invalid transition, full event, …) · `500` unexpected (no stack traces returned).
