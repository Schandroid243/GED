import { Logger } from '@nestjs/common';
import { NonRetriableError } from '../errors/non-retriable.error';

/**
 * Filtre d'exception pour les jobs BullMQ.
 * Détecte les NonRetriableError et assure qu'elles ne soient pas re-tentées.
 * Les erreurs transitoires sont relancées pour que BullMQ applique le backoff.
 */
export function handleJobError(error: unknown, logger: Logger, correlationId: string): never {
  if (error instanceof NonRetriableError) {
    logger.error(`[${correlationId}] Erreur non-retriable détectée : ${error.message}`);
    throw error;
  }

  if (error instanceof Error) {
    logger.warn(`[${correlationId}] Erreur transitoire, retry planifié : ${error.message}`);
    throw error;
  }

  // Fallback pour les erreurs non-Error
  logger.error(`[${correlationId}] Erreur inconnue (non-Error) : ${String(error)}`);
  throw new Error(String(error));
}

/**
 * Détermine si une erreur est non-retriable (échec définitif).
 */
export function isNonRetriable(error: unknown): boolean {
  return error instanceof NonRetriableError;
}
