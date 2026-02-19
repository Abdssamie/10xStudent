import {
  CreditCard,
  FileText,
  FolderOpen,
  Home,
  Library,
  Quote,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavItem[];
}

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Documents',
    url: '/documents',
    icon: FileText,
  },
  {
    title: 'Projects',
    url: '/projects',
    icon: FolderOpen,
  },
  {
    title: 'Sources',
    url: '/sources',
    icon: Library,
  },
  {
    title: 'Citations',
    url: '/citations',
    icon: Quote,
  },
  {
    title: 'AI Assistant',
    url: '/assistant',
    icon: Sparkles,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
  {
    title: 'Billing',
    url: '/settings/billing',
    icon: CreditCard,
  },
];
