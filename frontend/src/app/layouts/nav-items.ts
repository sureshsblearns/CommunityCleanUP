import { Role } from '../core/models/api.models';

export interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const PERSONAL: NavItem[] = [
  { label: 'Rewards', icon: 'gift', link: '/rewards' },
  { label: 'Certificates', icon: 'award', link: '/certificates' },
  { label: 'Leaderboard', icon: 'trophy', link: '/leaderboard' },
];

/** Sidebar navigation for each role. */
export function navFor(role: Role): NavSection[] {
  switch (role) {
    case 'ADMIN':
      return [
        {
          title: 'Administration',
          items: [
            { label: 'Dashboard', icon: 'layout-dashboard', link: '/admin/dashboard' },
            { label: 'Users', icon: 'users', link: '/admin/users' },
            { label: 'Reports', icon: 'clipboard-list', link: '/admin/reports' },
            { label: 'Events', icon: 'calendar-days', link: '/admin/events' },
            { label: 'Gallery', icon: 'image', link: '/admin/gallery' },
            { label: 'Rewards & badges', icon: 'medal', link: '/admin/rewards' },
            { label: 'Analytics', icon: 'chart-column', link: '/admin/analytics' },
          ],
        },
        {
          title: 'Organise',
          items: [{ label: 'Create event', icon: 'calendar-plus', link: '/ngo/events/create' }],
        },
      ];
    case 'NGO':
      return [
        {
          items: [
            { label: 'Dashboard', icon: 'layout-dashboard', link: '/ngo/dashboard' },
            { label: 'Create event', icon: 'calendar-plus', link: '/ngo/events/create' },
            { label: 'Community reports', icon: 'clipboard-list', link: '/reports' },
            { label: 'Browse events', icon: 'calendar-days', link: '/events' },
            { label: 'Gallery', icon: 'image', link: '/gallery' },
          ],
        },
      ];
    case 'VOLUNTEER':
      return [
        {
          items: [
            { label: 'Dashboard', icon: 'layout-dashboard', link: '/volunteer/dashboard' },
            { label: 'Find events', icon: 'calendar-days', link: '/events' },
            { label: 'Report an issue', icon: 'megaphone', link: '/reports/create' },
            { label: 'Reports', icon: 'clipboard-list', link: '/reports', exact: true },
          ],
        },
        { title: 'My progress', items: PERSONAL },
      ];
    default:
      return [
        {
          items: [
            { label: 'Dashboard', icon: 'layout-dashboard', link: '/dashboard' },
            { label: 'Report an issue', icon: 'megaphone', link: '/reports/create' },
            { label: 'My reports', icon: 'clipboard-list', link: '/reports', exact: true },
            { label: 'Cleanup events', icon: 'calendar-days', link: '/events' },
          ],
        },
        { title: 'My progress', items: PERSONAL },
      ];
  }
}
