import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { RootLayout }    from './components/layout/RootLayout';
import { LoginPage }     from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { JobsPage }      from './pages/JobsPage';
import { SettingsPage }  from './pages/SettingsPage';
import { NotFoundPage }  from './pages/NotFoundPage';
import { useAuthStore }  from './stores/auth.store';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <Toaster richColors position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><RootLayout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"           element={<DashboardPage />} />
              <Route path="documents"           element={<DocumentsPage />} />
              <Route path="documents/:id"       element={<DocumentDetailPage />} />
              <Route path="jobs"                element={<JobsPage />} />
              <Route path="settings"            element={<SettingsPage />} />
              <Route path="*"                   element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
