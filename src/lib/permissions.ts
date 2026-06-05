import type { StaffRole } from '../types';
import type { Page } from '../components/layout/Sidebar';

type RoleOrOwner = 'owner' | StaffRole;

const OWNER_ONLY_PAGES: Page[] = ['settings', 'staff-management'];

const ROLE_PAGES: Record<RoleOrOwner, Page[]> = {
  owner: [
    'dashboard', 'inventory', 'stock-summary', 'sales', 'expenses',
    'customers', 'credits', 'top-selling', 'reports', 'analytics',
    'settings', 'staff-management',
  ],
  administrator: [
    'dashboard', 'inventory', 'stock-summary', 'sales', 'expenses',
    'customers', 'credits', 'top-selling', 'reports', 'analytics', 'settings',
  ],
  store_manager: [
    'dashboard', 'inventory', 'stock-summary', 'sales', 'expenses',
    'customers', 'credits', 'top-selling', 'reports',
  ],
  cashier: [
    'dashboard', 'sales', 'customers', 'credits',
  ],
};

export function allowedPages(role: 'owner' | 'staff', staffRole?: StaffRole): Page[] {
  if (role === 'owner') return ROLE_PAGES.owner;
  return ROLE_PAGES[staffRole ?? 'cashier'];
}

export function canAccess(page: Page, role: 'owner' | 'staff', staffRole?: StaffRole): boolean {
  return allowedPages(role, staffRole).includes(page);
}

export function isOwnerOnly(page: Page): boolean {
  return OWNER_ONLY_PAGES.includes(page);
}

export const ROLE_LABELS: Record<RoleOrOwner, string> = {
  owner: 'Owner',
  administrator: 'Administrator',
  store_manager: 'Store Manager',
  cashier: 'Cashier',
};

export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'cashier', label: 'Cashier' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'administrator', label: 'Administrator' },
];
