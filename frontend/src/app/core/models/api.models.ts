export type Role = 'RESIDENT' | 'VOLUNTEER' | 'NGO' | 'ADMIN';
export type WasteType =
  | 'GENERAL_WASTE'
  | 'PLASTIC'
  | 'FOOD_WASTE'
  | 'CONSTRUCTION_WASTE'
  | 'E_WASTE'
  | 'ORGANIC_WASTE'
  | 'MIXED_WASTE'
  | 'OTHER';
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReportStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'CLEANING_SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';
export type EventStatus = 'UPCOMING' | 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PhotoType = 'REPORT' | 'BEFORE' | 'AFTER';
export type BadgeType =
  | 'FIRST_CLEANUP'
  | 'GREEN_VOLUNTEER'
  | 'ACTIVE_PARTICIPANT'
  | 'COMMUNITY_HELPER'
  | 'CLEANUP_CHAMPION'
  | 'ECO_REPORTER';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string>;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface LabelValue {
  label: string;
  value: number;
}

// ---------------------------------------------------------------- users & auth

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  organizationName?: string;
  points: number;
  active: boolean;
  createdAt: string;
}

export interface UserSummary {
  id: number;
  name: string;
  role: Role;
  organizationName?: string;
}

export interface UserDetail {
  user: User;
  reportsSubmitted: number;
  eventsJoined: number;
  eventsAttended: number;
  eventsCreated: number;
  certificates: number;
  badges: Badge[];
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: Exclude<Role, 'ADMIN'>;
  organizationName?: string;
}

// ---------------------------------------------------------------- reports

export interface Photo {
  id: number;
  url: string;
  type: PhotoType;
  uploadedDate: string;
}

export interface StatusHistory {
  id: number;
  oldStatus?: ReportStatus;
  newStatus: ReportStatus;
  changedBy: string;
  comment?: string;
  changedAt: string;
}

export interface ReportSummary {
  id: number;
  title: string;
  wasteType: WasteType;
  urgency: Urgency;
  status: ReportStatus;
  location: string;
  latitude?: number;
  longitude?: number;
  reporterName: string;
  createdDate: string;
  thumbnailUrl?: string;
  photoCount: number;
}

export interface Report {
  id: number;
  title: string;
  description: string;
  wasteType: WasteType;
  urgency: Urgency;
  status: ReportStatus;
  location: string;
  latitude?: number;
  longitude?: number;
  adminComment?: string;
  reporter: UserSummary;
  createdDate: string;
  updatedDate: string;
  photos: Photo[];
  cleanupPhotos: Photo[];
  statusHistory: StatusHistory[];
  relatedEvents: EventSummary[];
  allowedTransitions: ReportStatus[];
  canEdit: boolean;
  canDelete: boolean;
}

export interface ReportRequest {
  title: string;
  description: string;
  wasteType: WasteType;
  urgency: Urgency;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MapPoint {
  id: number;
  title: string;
  status: ReportStatus;
  urgency: Urgency;
  latitude: number;
  longitude: number;
}

// ---------------------------------------------------------------- events

export interface EventSummary {
  id: number;
  title: string;
  eventDate: string;
  startTime: string;
  endTime?: string;
  location: string;
  status: EventStatus;
  volunteersRequired: number;
  registeredCount: number;
  organizerName: string;
  relatedReportId?: number;
  coverImageUrl?: string;
}

export interface ViewerContext {
  registered: boolean;
  attended: boolean;
  canRegister: boolean;
  registrationBlockedReason?: string;
  canManage: boolean;
  canSubmitFeedback: boolean;
  feedbackSubmitted: boolean;
  certificateId?: number;
}

export interface CleanupEvent {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  volunteersRequired: number;
  registeredCount: number;
  remainingSlots: number;
  attendedCount: number;
  status: EventStatus;
  organizer: UserSummary;
  relatedReport?: { id: number; title: string; status: ReportStatus; location: string };
  createdAt: string;
  photos: Photo[];
  coverImageUrl?: string;
  averageRating?: number;
  feedbackCount: number;
  allowedTransitions: EventStatus[];
  viewer?: ViewerContext;
}

export interface EventRequest {
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  volunteersRequired: number;
  relatedReportId?: number | null;
  publish?: boolean;
}

export interface Participant {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone?: string;
  registrationDate: string;
  attendance: boolean;
}

export interface MyParticipation {
  participantId: number;
  event: EventSummary;
  registrationDate: string;
  attendance: boolean;
  certificateId?: number;
  feedbackSubmitted: boolean;
}

export interface Feedback {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  comments?: string;
  submittedDate: string;
}

export interface EventFeedback {
  averageRating?: number;
  count: number;
  items: Feedback[];
}

// ---------------------------------------------------------------- rewards

export interface Badge {
  id?: number;
  type: BadgeType;
  name: string;
  description: string;
  requiredAttendances: number;
  earned: boolean;
  awardedDate?: string;
}

export interface RewardTransaction {
  id: number;
  points: number;
  reason: string;
  description?: string;
  eventId?: number;
  eventTitle?: string;
  createdAt: string;
}

export interface RewardSummary {
  totalPoints: number;
  rank: number;
  eventsAttended: number;
  pointsPerAttendance: number;
  badges: Badge[];
  transactions: RewardTransaction[];
  nextBadge?: { type: BadgeType; name: string; required: number; progress: number };
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  role: Role;
  points: number;
  completedEvents: number;
  badgeCount: number;
  currentUser: boolean;
}

export interface AdminRewardTransaction extends RewardTransaction {
  userId: number;
  userName: string;
}

export interface AdminBadge {
  id: number;
  userId: number;
  userName: string;
  type: BadgeType;
  name: string;
  awardedDate: string;
}

export interface Certificate {
  id: number;
  certificateNumber: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  organizerName: string;
  volunteerName: string;
  issuedAt: string;
}

// ---------------------------------------------------------------- gallery

export interface GalleryItem {
  id: number;
  title: string;
  description?: string;
  location?: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  completionDate?: string;
  approved: boolean;
  eventId?: number;
  eventTitle?: string;
  createdByName?: string;
  createdAt: string;
}

export interface GalleryRequest {
  title: string;
  description?: string | null;
  location?: string | null;
  completionDate?: string | null;
  eventId?: number | null;
  approved?: boolean;
}

// ---------------------------------------------------------------- dashboards & analytics

export interface Activity {
  type: 'REPORT' | 'EVENT' | 'REWARD' | 'BADGE';
  title: string;
  detail?: string;
  date: string;
  link?: string;
}

export interface Dashboard {
  role: Role;
  reportsSubmitted: number;
  reportsCompleted: number;
  reportsPending: number;
  eventsJoined: number;
  eventsAttended: number;
  upcomingEventsCount: number;
  points: number;
  badgesCount: number;
  leaderboardRank: number;
  certificatesCount: number;
  eventsCreated: number;
  totalParticipants: number;
  totalAttendances: number;
  completedEventsCount: number;
  recentReports: ReportSummary[];
  upcomingEvents: EventSummary[];
  recentCompletedEvents: EventSummary[];
  badges: Badge[];
  reportStatusBreakdown: LabelValue[];
  recentActivity: Activity[];
}

export interface PublicStats {
  reportsSubmitted: number;
  areasCleaned: number;
  eventsCompleted: number;
  upcomingEvents: number;
  volunteers: number;
  attendances: number;
}

export interface Overview {
  totalUsers: number;
  residents: number;
  volunteers: number;
  ngos: number;
  admins: number;
  totalReports: number;
  pendingReports: number;
  verifiedReports: number;
  scheduledReports: number;
  inProgressReports: number;
  completedReports: number;
  rejectedReports: number;
  totalEvents: number;
  upcomingEvents: number;
  inProgressEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  totalParticipants: number;
  totalAttendances: number;
  pointsAwarded: number;
  galleryItems: number;
  averageFeedbackRating?: number;
}

export interface TimeSeries {
  labels: string[];
  series: Record<string, number[]>;
}

export interface ReportAnalytics {
  byStatus: LabelValue[];
  byWasteType: LabelValue[];
  byUrgency: LabelValue[];
  monthly: TimeSeries;
  completionRate: number;
}

export interface EventAnalytics {
  byStatus: LabelValue[];
  monthly: TimeSeries;
  topOrganizers: LabelValue[];
}

export interface VolunteerAnalytics {
  participation: TimeSeries;
  topVolunteers: LabelValue[];
  badgesAwarded: LabelValue[];
  activeVolunteers: number;
  attendanceRate: number;
  pointsAwarded: number;
}
