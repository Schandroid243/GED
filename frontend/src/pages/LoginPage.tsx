import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '../lib/axios';
import { useAuthStore } from '../stores/auth.store';
import { Spinner } from '../components/ui/Spinner';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Format d\'email invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    tenantId: string;
  };
}

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (formData: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await api.post<LoginResponse>('/auth/login', formData);
      const { access_token, user } = response.data;
      setAuth(access_token, user);
      toast.success('Connexion réussie');
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err?.response?.status === 401) {
        toast.error('Identifiants incorrects');
      } else {
        toast.error(err?.response?.data?.message ?? 'Erreur de connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo + Titre */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-display font-bold tracking-tight"
            style={{ color: 'var(--color-accent)' }}
          >
            GED
          </h1>
          <p className="text-lg font-display text-[var(--color-text-primary)] mt-1">
            Connexion
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Plateforme de gestion documentaire
          </p>
        </div>

        {/* Formulaire */}
        <div className="card p-6 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[var(--color-text-primary)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="exemple@entreprise.com"
                className="input-base"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-danger">{errors.email.message}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-[var(--color-text-primary)]"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-base"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center disabled:opacity-60"
            >
              {isLoading ? <Spinner size="sm" /> : 'Se connecter'}
            </button>
          </form>

          {/* Pas d'inscription (B2B) */}
          <p className="text-center text-2xs text-[var(--color-text-muted)]">
            Compte réservé aux utilisateurs autorisés
          </p>
        </div>
      </div>
    </div>
  );
}
