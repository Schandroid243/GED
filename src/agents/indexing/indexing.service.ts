import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DocumentService } from '../../documents/document.service';
import { IndexingJobData } from './interfaces/indexing-job.interface';

/**
 * Mots vides français et anglais pour la tokenisation.
 */
const STOP_WORDS_FR = new Set([
  'le', 'la', 'les', 'du', 'des', 'un', 'une', 'de', 'dans', 'pour',
  'sur', 'avec', 'par', 'est', 'sont', 'a', 'ont', 'été', 'être',
  'avoir', 'faire', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son',
  'mais', 'ou', 'et', 'donc', 'ni', 'car', 'que', 'qui', 'quoi', 'dont',
  'au', 'aux', 'en', 'vers', 'chez', 'sans', 'sous', 'entre', 'depuis',
  'pendant', 'avant', 'après', 'très', 'plus', 'moins', 'aussi', 'ne',
  'pas', 'plus', 'jamais', 'rien', 'personne', 'tous', 'toutes', 'tout',
  'chaque', 'quelque', 'plusieurs', 'certains', 'autre', 'même',
]);

const STOP_WORDS_EN = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'i', 'you',
  'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'myself', 'yourself',
  'and', 'but', 'or', 'because', 'as', 'until', 'while', 'of', 'at',
  'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up',
  'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'is', 'are', 'was', 'were',
  'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'must',
]);

const ALL_STOP_WORDS = new Set([...STOP_WORDS_FR, ...STOP_WORDS_EN]);

/**
 * Motif regex pour extraire les tokens (mots d'au moins 2 caractères alphabétiques).
 */
const TOKEN_PATTERN = /\b[a-zàâçéèêëîïôûùüÿœ]{2,}\b/gi;

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    private readonly documentService: DocumentService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Indexe un document :
   * 1. Tokenisation du texte (découpage en mots)
   * 2. Suppression des stop-words (FR + EN)
   * 3. Assemblage du texte nettoyé
   * 4. Mise à jour de Document.indexed = true
   *
   * Pour une implémentation FULLTEXT MySQL avancée (stemming, ranking),
   * la table document_index avec colonne FULLTEXT sera gérée par l'API.
   */
  async indexDocument(
    data: IndexingJobData,
    onProgress: (p: number) => void,
  ): Promise<void> {
    const { documentId, textContent, metadata, correlationId, language } = data;

    onProgress(20);

    // ── Étape 1 : Tokenisation ──────────────────────────────────
    const rawTokens: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(TOKEN_PATTERN);

    while ((match = regex.exec(textContent)) !== null) {
      rawTokens.push(match[0].toLowerCase());
    }

    this.logger.debug(`[${correlationId}] ${rawTokens.length} tokens bruts extraits`);

    onProgress(40);

    // ── Étape 2 : Suppression des stop-words ────────────────────
    const filteredTokens = rawTokens.filter((token) => !ALL_STOP_WORDS.has(token));

    this.logger.debug(
      `[${correlationId}] ${filteredTokens.length} tokens après filtrage stop-words`,
    );

    onProgress(60);

    // ── Étape 3 : Assemblage du texte nettoyé ───────────────────
    const cleanedText = filteredTokens.join(' ');

    // Stockage du texte nettoyé dans les métadonnées (pour FULLTEXT)
    const updatedMetadata = {
      ...metadata,
      _indexedText: cleanedText.slice(0, 10000), // limite à 10k caractères
      _language: language,
      _indexedTokens: filteredTokens.length,
    };

    onProgress(80);

    // ── Étape 4 : Marquer le document comme indexé ──────────────
    await this.documentService.markIndexed(documentId);

    this.logger.log(
      `[${correlationId}] Document ${documentId} indexé : ${filteredTokens.length} tokens significatifs`,
    );

    onProgress(100);
  }
}
