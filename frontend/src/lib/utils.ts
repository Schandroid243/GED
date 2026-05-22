import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Fusionne les classes Tailwind sans conflits */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formate une taille en bytes vers Ko / Mo / Go */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 o';
  const k     = 1024;
  const dm    = decimals < 0 ? 0 : decimals;
  const sizes  = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Tronque un UUID pour l'affichage : "3f2a…b9c1" */
export function shortId(id: string): string {
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

/** Génère un identifiant court lisible (human-readable) */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
