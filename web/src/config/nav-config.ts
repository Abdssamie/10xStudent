import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  FolderOpen,
  Home,
  Library,
  Quote,
  Settings,
  Sparkles,
} from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  items?: NavSubItem[];
}

export interface NavSubItem {
  title: string;
  url: string;
}

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
    isActive: false,
  },
  {
    title: 'Documents',
    url: '/documents',
    icon: FileText,
    isActive: false,
  },
  {
    title: 'Projects',
    url: '/projects',
    icon: FolderOpen,
    isActive: false,
  },
  {
    title: 'Sources',
    url: '/sources',
    icon: Library,
    isActive: false,
  },
  {
    title: 'Citations',
    url: '/citations',
    icon: Quote,
    isActive: false,
  },
  {
    title: 'AI Assistant',
    url: '/assistant',
    icon: Sparkles,
    isActive: false,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
    isActive: false,
  },
];
