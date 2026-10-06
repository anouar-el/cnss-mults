/**
 * Service de migration de version des backups — PROMPT 11
 * Assure la compatibilité ascendante et le contrôle de conformité des formats.
 */

import { MultsCnssBackup } from '../types/cnssBackup';

export const FORMAT_VERSION_ACTUELLE = '1.0';
export const APPLICATION_VERSION_ACTUELLE = '1.1.0';

export interface MigrationResult {
  migrated: boolean;
  versionInitiale: string;
  versionFinale: string;
  backup: MultsCnssBackup;
  details?: string;
}

export const backupMigrationService = {
  /**
   * Vérifie si la version de format du backup est prise en charge
   */
  estVersionSupportee(formatVersion: string): boolean {
    return formatVersion === '1.0';
  },

  /**
   * Couche de migration extensible
   * Actuellement le format 1.0 est le format souverain d'origine.
   */
  migrerSiNecessaire(backupBrut: any): MigrationResult {
    const versionInitiale = backupBrut?.formatVersion || 'INCONNUE';

    if (!this.estVersionSupportee(versionInitiale)) {
      throw new Error(
        `Version de backup non supportée : « ${versionInitiale} ». Cette version nécessite le format standard ${FORMAT_VERSION_ACTUELLE}.`
      );
    }

    // Si version 1.0, aucune transformation n'est nécessaire
    return {
      migrated: false,
      versionInitiale,
      versionFinale: FORMAT_VERSION_ACTUELLE,
      backup: backupBrut as MultsCnssBackup,
      details: 'Format 1.0 conforme sans migration requise.',
    };
  },
};
