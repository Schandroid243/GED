import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useUIStore } from '../../stores/ui.store';
import { cn } from '../../lib/utils';

export function RootLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
      <Sidebar />
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 transition-all duration-200',
          sidebarCollapsed ? 'ml-16' : 'ml-60',
        )}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
