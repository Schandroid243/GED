import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  DocumentTextIcon,
  QueueListIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { useUIStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: HomeIcon },
  { label: 'Documents',       href: '/documents',  icon: DocumentTextIcon },
  { label: 'Files de jobs',   href: '/jobs',       icon: QueueListIcon },
  { label: 'Paramètres',      href: '/settings',   icon: Cog6ToothIcon },
];

export function Sidebar() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar    = useUIStore((s) => s.toggleSidebar);
  const user             = useAuthStore((s) => s.user);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-40 flex flex-col',
        'border-r border-[var(--color-border)]',
        'bg-[var(--color-sidebar-bg)]',
        'transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center h-16 px-4 border-b border-[var(--color-border)]">
        {!sidebarCollapsed && (
          <span className="text-xl font-display text-[var(--color-accent)] mr-auto">
            GED
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="btn-ghost p-1.5 rounded-lg"
          aria-label={sidebarCollapsed ? 'Ouvrir la sidebar' : 'Fermer la sidebar'}
        >
          {sidebarCollapsed ? (
            <Bars3Icon className="h-5 w-5" />
          ) : (
            <XMarkIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                'hover:bg-[var(--color-sidebar-item-hover)]',
                isActive
                  ? 'bg-[var(--color-sidebar-item-active)] text-[var(--color-sidebar-item-active-text)]'
                  : 'text-[var(--color-text-secondary)]',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User avatar + name */}
      {user && (
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-4 border-t border-[var(--color-border)]',
            sidebarCollapsed && 'justify-center',
          )}
        >
          <Avatar name={user.name} size="sm" />
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {user.name}
              </p>
              <p className="text-2xs text-[var(--color-text-muted)] truncate">
                {user.email}
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
