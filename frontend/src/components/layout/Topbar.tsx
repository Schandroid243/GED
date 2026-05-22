import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../stores/auth.store';
import { useUIStore } from '../../stores/ui.store';
import { Avatar } from '../ui/Avatar';
import { useDebounce } from '../../hooks/useDebounce';

export function Topbar() {
  const navigate         = useNavigate();
  const { isDark, toggle } = useTheme();
  const user             = useAuthStore((s) => s.user);
  const logout           = useAuthStore((s) => s.logout);

  const [search, setSearch] = useState('');
  const debouncedSearch     = useDebounce(search, 300);

  // Quand la recherche debounced change, naviguer vers /documents avec search param
  useEffect(() => {
    if (debouncedSearch.trim()) {
      navigate(`/documents?search=${encodeURIComponent(debouncedSearch.trim())}`);
    }
  }, [debouncedSearch, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className={cn(
        'flex items-center gap-4 h-16 px-6 shrink-0',
        'border-b border-[var(--color-border)]',
        'bg-[var(--color-bg-surface)]',
      )}
    >
      {/* Recherche globale */}
      <div className="relative flex-1 max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Rechercher un document…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base pl-9"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="btn-ghost p-2 rounded-lg"
        aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      >
        {isDark ? (
          <SunIcon className="h-5 w-5 text-[var(--color-text-secondary)]" />
        ) : (
          <MoonIcon className="h-5 w-5 text-[var(--color-text-secondary)]" />
        )}
      </button>

      {/* User dropdown */}
      {user && (
        <Menu as="div" className="relative">
          <MenuButton className="btn-ghost p-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]">
            <Avatar name={user.name} size="sm" />
          </MenuButton>

          <MenuItems
            className={cn(
              'absolute right-0 mt-2 w-56 rounded-xl shadow-dropdown py-1',
              'bg-[var(--color-bg-surface)] border border-[var(--color-border)]',
              'focus-visible:outline-none',
            )}
          >
            <div className="px-4 py-2 border-b border-[var(--color-border)]">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{user.name}</p>
              <p className="text-2xs text-[var(--color-text-muted)]">{user.email}</p>
            </div>

            <MenuItem>
              {({ focus }) => (
                <button
                  onClick={() => navigate('/settings')}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-2 text-sm text-left',
                    'text-[var(--color-text-secondary)]',
                    focus && 'bg-[var(--color-bg-subtle)]',
                  )}
                >
                  <UserCircleIcon className="h-5 w-5" />
                  Profil
                </button>
              )}
            </MenuItem>

            <MenuItem>
              {({ focus }) => (
                <button
                  onClick={handleLogout}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-2 text-sm text-left',
                    'text-danger',
                    focus && 'bg-[var(--color-bg-subtle)]',
                  )}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  Déconnexion
                </button>
              )}
            </MenuItem>
          </MenuItems>
        </Menu>
      )}
    </header>
  );
}
