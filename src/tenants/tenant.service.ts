import { Injectable, Logger } from '@nestjs/common';

export interface TenantConfig {
  id: string;
  name: string;
  locale: string;       // 'fr_FR' | 'en_US' | ...
  timezone: string;     // 'Europe/Paris' | ...
  features: {
    ocrEnabled: boolean;
    mlClassification: boolean;
    archiveEnabled: boolean;
  };
  retentionDays: number;
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  /**
   * Récupère la configuration d'un tenant.
   * Dans un premier temps, utilise un cache en mémoire.
   * À terme, chargera depuis une table `tenant_config` en base.
   */
  async getConfig(tenantId: string): Promise<TenantConfig | null> {
    // TODO: Implémenter le chargement depuis la base de données
    // Pour le MVP, retourne une config par défaut
    this.logger.debug(`Récupération config tenant : ${tenantId}`);

    return {
      id: tenantId,
      name: tenantId,
      locale: 'fr_FR',
      timezone: 'Europe/Paris',
      features: {
        ocrEnabled: true,
        mlClassification: false,
        archiveEnabled: true,
      },
      retentionDays: 365,
    };
  }

  /** Vérifie si un tenant existe et est actif */
  async isActive(tenantId: string): Promise<boolean> {
    const config = await this.getConfig(tenantId);
    return config !== null;
  }
}
