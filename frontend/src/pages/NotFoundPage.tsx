import { useNavigate } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <div className="text-center max-w-sm">
        {/* Icône */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--color-bg-subtle)' }}
        >
          <ExclamationTriangleIcon
            className="h-10 w-10"
            style={{ color: 'var(--color-text-muted)' }}
          />
        </div>

        {/* Titre */}
        <h1
          className="text-2xl font-display font-bold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Page introuvable
        </h1>

        {/* Description */}
        <p
          className="text-sm mb-8"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        {/* Bouton */}
        <Button onClick={() => navigate('/dashboard')}>
          Retourner au tableau de bord
        </Button>
      </div>
    </div>
  );
}
