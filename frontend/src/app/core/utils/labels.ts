import { BadgeType, EventStatus, ReportStatus, Role, Urgency, WasteType } from '../models/api.models';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const WASTE_TYPES: Option<WasteType>[] = [
  { value: 'GENERAL_WASTE', label: 'General waste' },
  { value: 'PLASTIC', label: 'Plastic' },
  { value: 'FOOD_WASTE', label: 'Food waste' },
  { value: 'CONSTRUCTION_WASTE', label: 'Construction debris' },
  { value: 'E_WASTE', label: 'E-waste' },
  { value: 'ORGANIC_WASTE', label: 'Organic / garden waste' },
  { value: 'MIXED_WASTE', label: 'Mixed waste' },
  { value: 'OTHER', label: 'Other' },
];

export const URGENCIES: Option<Urgency>[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export const REPORT_STATUSES: Option<ReportStatus>[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'CLEANING_SCHEDULED', label: 'Cleaning scheduled' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const EVENT_STATUSES: Option<EventStatus>[] = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'OPEN', label: 'Open' },
  { value: 'FULL', label: 'Full' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const ROLES: Option<Role>[] = [
  { value: 'RESIDENT', label: 'Resident' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'NGO', label: 'NGO' },
  { value: 'ADMIN', label: 'Admin' },
];

export const BADGE_ICONS: Record<BadgeType, string> = {
  FIRST_CLEANUP: 'sprout',
  GREEN_VOLUNTEER: 'leaf',
  ACTIVE_PARTICIPANT: 'flame',
  COMMUNITY_HELPER: 'heart-handshake',
  CLEANUP_CHAMPION: 'trophy',
  ECO_REPORTER: 'megaphone',
};

const ALL: Record<string, string> = Object.fromEntries(
  [...WASTE_TYPES, ...URGENCIES, ...REPORT_STATUSES, ...EVENT_STATUSES, ...ROLES].map((o) => [o.value, o.label]),
);

/** Human-readable label for any enum value used by the API. */
export function label(value: string | null | undefined): string {
  if (!value) return '';
  if (ALL[value]) return ALL[value];
  // Only reformat ENUM_STYLE constants; free text such as names passes through unchanged.
  return /^[A-Z0-9_]+$/.test(value) ? value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : value;
}

export type Tone = 'gray' | 'green' | 'emerald' | 'blue' | 'amber' | 'red' | 'violet' | 'teal';

export const TONE_CLASSES: Record<Tone, string> = {
  gray: 'bg-gray-50 text-gray-700 ring-gray-200',
  green: 'bg-green-50 text-green-800 ring-green-200',
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  teal: 'bg-teal-50 text-teal-800 ring-teal-200',
};

const STATUS_TONE: Record<string, { tone: Tone; icon: string }> = {
  PENDING: { tone: 'amber', icon: 'clock' },
  VERIFIED: { tone: 'blue', icon: 'shield-check' },
  CLEANING_SCHEDULED: { tone: 'violet', icon: 'calendar-check' },
  IN_PROGRESS: { tone: 'teal', icon: 'loader' },
  COMPLETED: { tone: 'green', icon: 'circle-check' },
  REJECTED: { tone: 'red', icon: 'circle-x' },
  CANCELLED: { tone: 'gray', icon: 'ban' },
  UPCOMING: { tone: 'gray', icon: 'calendar' },
  OPEN: { tone: 'emerald', icon: 'door-open' },
  FULL: { tone: 'amber', icon: 'users' },
  LOW: { tone: 'gray', icon: 'signal-low' },
  MEDIUM: { tone: 'blue', icon: 'signal-medium' },
  HIGH: { tone: 'amber', icon: 'signal-high' },
  CRITICAL: { tone: 'red', icon: 'triangle-alert' },
};

export function statusTone(value: string): { tone: Tone; icon: string } {
  return STATUS_TONE[value] ?? { tone: 'gray', icon: 'info' };
}

/** Where each role lands after login. */
export function homeRouteFor(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'NGO':
      return '/ngo/dashboard';
    case 'VOLUNTEER':
      return '/volunteer/dashboard';
    default:
      return '/dashboard';
  }
}
