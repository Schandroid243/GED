import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '../lib/axios';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/auth.store';

/* ── Schémas de validation ─────────────── */

const profileSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  email: z.string().min(1, 'L\'email est requis').email('Email invalide'),
});
type ProfileFormData = z.infer<typeof profileSchema>;

const tenantSchema = z.object({
  tenantId: z.string().min(1, 'L\'ID du tenant est requis'),
  storageLimit: z.string().optional(),
  retentionDays: z.coerce.number().min(1, 'Minimum 1 jour').max(3650, 'Maximum 10 ans'),
});
type TenantFormData = z.infer<typeof tenantSchema>;

const notificationsSchema = z.object({
  slackWebhookUrl: z.string().url('URL invalide').optional().or(z.literal('')),
});
type NotificationsFormData = z.infer<typeof notificationsSchema>;

/* ── Section de formulaire ─────────────── */

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div className="card p-6 space-y-4">
      <div>
        <h3 className="text-base font-medium text-[var(--color-text-primary)]">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="border-t border-[var(--color-border)]" />
      {children}
    </div>
  );
}

/* ── Page Paramètres ────────────────────── */

export function SettingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);

  // Profil
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => api.put('/settings/profile', data),
    onSuccess: (response) => {
      if (token && user) {
        setAuth(token, { ...user, name: response.data.name, email: response.data.email });
      }
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Profil mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  // Tenant
  const tenantForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      tenantId: user?.tenantId ?? '',
      storageLimit: '',
      retentionDays: 365,
    },
  });

  const tenantMutation = useMutation({
    mutationFn: (data: TenantFormData) => api.put('/settings/tenant', data),
    onSuccess: () => {
      toast.success('Configuration tenant mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  // Notifications
  const notifForm = useForm<NotificationsFormData>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      slackWebhookUrl: '',
    },
  });

  const notifMutation = useMutation({
    mutationFn: (data: NotificationsFormData) => api.put('/settings/notifications', data),
    onSuccess: () => {
      toast.success('Configuration notifications mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Paramètres" />

      {/* Section Profil */}
      <SettingsSection title="Profil" description="Modifiez vos informations personnelles">
        <form
          onSubmit={profileForm.handleSubmit((data) => profileMutation.mutate(data))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              Nom
            </label>
            <input
              className="input-base"
              {...profileForm.register('name')}
            />
            {profileForm.formState.errors.name && (
              <p className="text-xs text-danger">{profileForm.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              Email
            </label>
            <input
              type="email"
              className="input-base"
              {...profileForm.register('email')}
            />
            {profileForm.formState.errors.email && (
              <p className="text-xs text-danger">{profileForm.formState.errors.email.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={profileMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </SettingsSection>

      {/* Section Tenant */}
      <SettingsSection title="Tenant" description="Configuration de votre organisation">
        <form
          onSubmit={tenantForm.handleSubmit((data) => tenantMutation.mutate(data))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              ID Tenant
            </label>
            <input
              className="input-base font-mono text-sm"
              disabled
              {...tenantForm.register('tenantId')}
            />
            <p className="text-2xs text-[var(--color-text-muted)]">
              Identifiant unique de votre organisation (lecture seule)
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              Limite de stockage
            </label>
            <input
              className="input-base"
              placeholder="ex: 10 Go"
              {...tenantForm.register('storageLimit')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              Rétention (jours)
            </label>
            <input
              type="number"
              className="input-base"
              {...tenantForm.register('retentionDays', { valueAsNumber: true })}
            />
            {tenantForm.formState.errors.retentionDays && (
              <p className="text-xs text-danger">
                {tenantForm.formState.errors.retentionDays.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={tenantMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </SettingsSection>

      {/* Section Notifications */}
      <SettingsSection title="Notifications" description="Configuration des alertes et webhooks">
        <form
          onSubmit={notifForm.handleSubmit((data) => notifMutation.mutate(data))}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              URL Webhook Slack
            </label>
            <input
              className="input-base font-mono text-sm"
              placeholder="https://hooks.slack.com/services/..."
              {...notifForm.register('slackWebhookUrl')}
            />
            {notifForm.formState.errors.slackWebhookUrl && (
              <p className="text-xs text-danger">
                {notifForm.formState.errors.slackWebhookUrl.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" isLoading={notifMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </SettingsSection>
    </div>
  );
}
