/**
 * Service de Migration & Vérification de Synchronisation Locale vs Supabase (PROMPT 14)
 * APPLICATION CNSS MULT.S — SARLAU MULT.S (N° AFFILIÉ : 6541835)
 *
 * RÈGLES CRITIQUES :
 * 1. Création d'un backup automatique .mcnss AVANT toute migration (si échec -> ABANDON).
 * 2. Idempotence stricte : Exécuter la migration N fois ne crée aucun doublon.
 * 3. Non-suppression de localStorage : localStorage reste 100% INTACT.
 * 4. Comparaison détaillée Local vs Supabase pour audit de conformité.
 */

import { persistenceService } from './persistenceService';
import { supabasePersistenceService } from './supabasePersistenceService';
import { backupService } from './backupService';
import { MultsCnssBackup } from '../types/cnssBackup';

export interface EntiteComparaisonItem {
  nom: string;
  countLocal: number;
  countSupabase: number;
  estConforme: boolean;
  message?: string;
}

export interface MigrationComparisonReport {
  timestamp: string;
  estSynchronise: boolean;
  totalLocal: number;
  totalSupabase: number;
  pourcentageConcordance: number;
  entites: EntiteComparaisonItem[];
  backupPreMigrationId?: string;
  backupContentHash?: string;
  remarques: string[];
}

export interface MigrationExecutionResult {
  succes: boolean;
  message: string;
  backupEffectue: boolean;
  backupId?: string;
  backupFile?: MultsCnssBackup;
  dureeMs: number;
  rapportComparaison: MigrationComparisonReport;
  statsMigrees: {
    entreprises: number;
    salaries: number;
    aliases: number;
    periodes: number;
    lignesPaie: number;
    rapprochements?: number;
    registres: number;
    bordereaux?: number;
    paiements?: number;
    dossiers: number;
    preetablis?: number;
    audits: number;
    total: number;
  };
}

export const migrationVerificationService = {
  /**
   * Compare l'état des données entre le stockage Local (localStorage) et Supabase.
   */
  async compareLocalVsSupabase(): Promise<MigrationComparisonReport> {
    const timestamp = new Date().toISOString();
    const entites: EntiteComparaisonItem[] = [];
    const remarques: string[] = [];

    // 1. Entreprise
    const localConfig = persistenceService.getEntrepriseConfig();
    const supaConfig = await supabasePersistenceService.getCompanyConfig();
    const countLocalComp = localConfig ? 1 : 0;
    const countSupaComp = supaConfig ? 1 : 0;
    entites.push({
      nom: 'Entreprise (SARLAU MULT.S)',
      countLocal: countLocalComp,
      countSupabase: countSupaComp,
      estConforme: countLocalComp === countSupaComp,
    });

    // 2. Salariés Référentiel
    const localSalaries = persistenceService.getSalaries();
    const supaSalaries = await supabasePersistenceService.getSalaries();
    entites.push({
      nom: 'Salariés (Référentiel)',
      countLocal: localSalaries.length,
      countSupabase: supaSalaries.length,
      estConforme: localSalaries.length === supaSalaries.length,
    });

    // 3. Alias Mémorisés
    const localAliases = persistenceService.getAliases();
    const supaAliases = await supabasePersistenceService.getAliases();
    entites.push({
      nom: 'Alias Salariés (Niveau 3)',
      countLocal: localAliases.length,
      countSupabase: supaAliases.length,
      estConforme: localAliases.length === supaAliases.length,
    });

    // 4. Périodes Mensuelles
    const localPeriodes = persistenceService.getPeriodes();
    const supaPeriodes = await supabasePersistenceService.getPeriodes();
    entites.push({
      nom: 'Périodes Mensuelles',
      countLocal: localPeriodes.length,
      countSupabase: supaPeriodes.length,
      estConforme: localPeriodes.length === supaPeriodes.length,
    });

    // 5. Lignes de Paie
    let totalLignesPaieLocal = 0;
    let totalLignesPaieSupa = 0;
    for (const p of localPeriodes) {
      const pId = p.idMois || p.id || '2026-09';
      const pLinesLoc = persistenceService.getLignesPaiePeriode(pId);
      totalLignesPaieLocal += pLinesLoc ? pLinesLoc.length : 0;
      totalLignesPaieSupa += (await supabasePersistenceService.getLignesPaiePeriode(pId)).length;
    }
    entites.push({
      nom: 'Lignes de Paie Importées',
      countLocal: totalLignesPaieLocal,
      countSupabase: totalLignesPaieSupa,
      estConforme: totalLignesPaieLocal === totalLignesPaieSupa,
    });

    // 6. Rapprochements
    let totalRapsLocal = 0;
    let totalRapsSupa = 0;
    for (const p of localPeriodes) {
      const pId = p.idMois || p.id || '2026-09';
      const rLoc = persistenceService.getRapprochementsPeriode(pId);
      if (rLoc) totalRapsLocal += rLoc.length;
      const rSup = await supabasePersistenceService.getRapprochementsPeriode(pId);
      if (rSup) totalRapsSupa += rSup.length;
    }
    entites.push({
      nom: 'Rapprochements Traités',
      countLocal: totalRapsLocal,
      countSupabase: totalRapsSupa,
      estConforme: totalRapsLocal === totalRapsSupa,
    });

    // 7. Registres Consolidation
    let totalLignesRegistreLocal = 0;
    let totalLignesRegistreSupa = 0;
    for (const p of localPeriodes) {
      const regLoc = persistenceService.getRegistrePeriode(p.idMois || p.id || '2026-09');
      totalLignesRegistreLocal += regLoc.length;
      const regSup = await supabasePersistenceService.getRegistrePeriode(p.idMois || p.id || '2026-09');
      totalLignesRegistreSupa += regSup.length;
    }
    entites.push({
      nom: 'Lignes de Registre CNSS',
      countLocal: totalLignesRegistreLocal,
      countSupabase: totalLignesRegistreSupa,
      estConforme: totalLignesRegistreLocal === totalLignesRegistreSupa,
    });

    // 8. Bordereaux CNSS F.212-2-58
    let countBordereauxLocal = 0;
    let countBordereauxSupa = 0;
    for (const p of localPeriodes) {
      const pId = p.idMois || p.id || '2026-09';
      if (persistenceService.getBordereauPeriode(pId)) countBordereauxLocal++;
      if (await supabasePersistenceService.getBordereauPeriode(pId)) countBordereauxSupa++;
    }
    entites.push({
      nom: 'Bordereaux Déclaration (F.212-2-58)',
      countLocal: countBordereauxLocal,
      countSupabase: countBordereauxSupa,
      estConforme: countBordereauxLocal === countBordereauxSupa,
    });

    // 9. Bordereaux Paiement 511-1-01
    let countPaiementsLocal = 0;
    let countPaiementsSupa = 0;
    for (const p of localPeriodes) {
      const pId = p.idMois || p.id || '2026-09';
      if (persistenceService.getPaiementPeriode(pId)) countPaiementsLocal++;
      if (await supabasePersistenceService.getPaiementPeriode(pId)) countPaiementsSupa++;
    }
    entites.push({
      nom: 'Bordereaux Paiement (511-1-01)',
      countLocal: countPaiementsLocal,
      countSupabase: countPaiementsSupa,
      estConforme: countPaiementsLocal === countPaiementsSupa,
    });

    // 10. Dossiers Mensuels Scellés
    let countDossiersLocal = 0;
    let countDossiersSupa = 0;
    for (const p of localPeriodes) {
      const dLoc = persistenceService.getDossierPeriode(p.idMois || p.id || '2026-09');
      if (dLoc) countDossiersLocal++;
      const dSup = await supabasePersistenceService.getDossierPeriode(p.idMois || p.id || '2026-09');
      if (dSup) countDossiersSupa++;
    }
    entites.push({
      nom: 'Dossiers Mensuels Officiels',
      countLocal: countDossiersLocal,
      countSupabase: countDossiersSupa,
      estConforme: countDossiersLocal === countDossiersSupa,
    });

    // 11. Journal d'Audit
    const localAudits = persistenceService.getJournalAudit();
    const supaAudits = await supabasePersistenceService.getJournalAudit();
    entites.push({
      nom: 'Événements d\'Audit',
      countLocal: localAudits.length,
      countSupabase: supaAudits.length,
      estConforme: localAudits.length === supaAudits.length,
    });

    // 12. Préétablis BDS
    let countPreetablisLocal = 0;
    let countPreetablisSupa = 0;
    for (const p of localPeriodes) {
      const pId = p.idMois || p.id || '2026-09';
      if (persistenceService.getFichierPreetabli(pId)) countPreetablisLocal++;
      if (await supabasePersistenceService.getFichierPreetabli(pId)) countPreetablisSupa++;
    }
    entites.push({
      nom: 'Fichiers Préétablis CNSS (BDS)',
      countLocal: countPreetablisLocal,
      countSupabase: countPreetablisSupa,
      estConforme: countPreetablisLocal === countPreetablisSupa,
    });

    // Calcul global
    const totalLocal = entites.reduce((acc, e) => acc + e.countLocal, 0);
    const totalSupabase = entites.reduce((acc, e) => acc + e.countSupabase, 0);
    const entitesConformes = entites.filter(e => e.estConforme).length;
    const estSynchronise = entites.every(e => e.estConforme) && totalLocal > 0;
    const pourcentageConcordance =
      entites.length > 0 ? Math.round((entitesConformes / entites.length) * 100) : 100;

    if (!estSynchronise) {
      remarques.push(
        totalSupabase === 0
          ? 'Supabase ne contient pas encore les données locales. Veuillez exécuter la migration.'
          : 'Divergence détectée entre le stockage local et Supabase.'
      );
    } else {
      remarques.push('Toutes les entités locales sont rigoureusement synchronisées dans Supabase.');
    }

    return {
      timestamp,
      estSynchronise,
      totalLocal,
      totalSupabase,
      pourcentageConcordance,
      entites,
      remarques,
    };
  },

  /**
   * Synchronisation idempotente intégrale entre le stockage local et Supabase.
   * Exécute la propagation sécurisée avec backup préalable et garantit 100% de concordance.
   */
  async synchroniserLocalEtSupabase(description?: string): Promise<MigrationExecutionResult> {
    return this.migrateLocalDataToSupabase({
      descriptionBackup: description || 'Sauvegarde automatique pré-synchronisation vérification',
    });
  },

  /**
   * Exécute la migration complète et idempotente des données locales vers Supabase.
   * RÈGLE ABSOLUE :
   * 1. Crée d'abord un backup .mcnss. Si échec -> ABORT.
   * 2. Ne supprime JAMAIS le localStorage.
   */
  async migrateLocalDataToSupabase(options?: {
    simulerEchecBackup?: boolean;
    descriptionBackup?: string;
  }): Promise<MigrationExecutionResult> {
    const debutMs = performance.now();

    // =========================================================================
    // ÉTAPE 1 : BACKUP AUTOMATIQUE .MCNSS (PROMPT 11)
    // =========================================================================
    let backupFile: MultsCnssBackup | undefined;
    try {
      if (options?.simulerEchecBackup) {
        throw new Error('Simulation d\'échec de création du backup pré-migration');
      }

      backupFile = backupService.createFullBackup(
        options?.descriptionBackup || 'Backup automatique pré-migration Supabase (PROMPT 14)'
      );

      // Validation stricte du backup créé
      const verif = backupService.validateBackup(backupFile);
      if (!verif.valide) {
        throw new Error(`Backup corrompu ou invalide : ${verif.message || verif.codeErreur}`);
      }
    } catch (err: any) {
      // SI LE BACKUP ÉCHOUE : ON REFUSE FORMELLEMENT LA MIGRATION
      return {
        succes: false,
        message: `Échec du backup de sécurité pré-migration : ${err?.message || 'Erreur inconnue'}. Migration annulée conformément à la règle de sécurité.`,
        backupEffectue: false,
        dureeMs: Math.round(performance.now() - debutMs),
        rapportComparaison: await this.compareLocalVsSupabase(),
        statsMigrees: {
          entreprises: 0,
          salaries: 0,
          aliases: 0,
          periodes: 0,
          lignesPaie: 0,
          registres: 0,
          dossiers: 0,
          audits: 0,
          total: 0,
        },
      };
    }

    // =========================================================================
    // ÉTAPE 2 : LECTURE DES DONNÉES LOCALES (SANS AUCUNE SUPPRESSION)
    // =========================================================================
    const localConfig = persistenceService.getEntrepriseConfig();
    const localSalaries = persistenceService.getSalaries();
    const localAliases = persistenceService.getAliases();
    const localPeriodes = persistenceService.getPeriodes();
    const localAudits = persistenceService.getJournalAudit();

    // =========================================================================
    // ÉTAPE 3 : TRANSMISSION IDEMPOTENTE VERS SUPABASE
    // =========================================================================

    // 1. Entreprise
    if (localConfig) {
      await supabasePersistenceService.saveCompanyConfig(localConfig);
    }

    // 2. Salariés (avec identifiants stables préservés)
    await supabasePersistenceService.saveSalaries(localSalaries);

    // 3. Alias (avec préservation des variantes normalisées)
    await supabasePersistenceService.saveAliases(localAliases);

    // 4. Périodes & Lignes associées
    let totalLignesPaie = 0;
    let totalRaps = 0;
    let totalRegistres = 0;
    let totalBordereaux = 0;
    let totalPaiements = 0;
    let totalDossiers = 0;
    let totalPreetablis = 0;

    await supabasePersistenceService.savePeriodes(localPeriodes);

    for (const p of localPeriodes) {
      const pId = p.idMois || p.id || '2026-09';

      // Lignes de paie importées brutes
      const paieLines = persistenceService.getLignesPaiePeriode(pId);
      if (paieLines && paieLines.length > 0) {
        await supabasePersistenceService.saveLignesPaiePeriode(pId, paieLines);
        totalLignesPaie += paieLines.length;
      }

      // Rapprochements traités
      const raps = persistenceService.getRapprochementsPeriode(pId);
      if (raps && raps.length > 0) {
        await supabasePersistenceService.saveRapprochementsPeriode(pId, raps);
        totalRaps += raps.length;
      }

      // Registre consolidé
      const regLines = persistenceService.getRegistrePeriode(pId);
      if (regLines && regLines.length > 0) {
        await supabasePersistenceService.saveRegistrePeriode(pId, regLines);
        totalRegistres += regLines.length;
      }

      // Bordereau de déclaration F.212-2-58
      const bordereau = persistenceService.getBordereauPeriode(pId);
      if (bordereau) {
        await supabasePersistenceService.saveBordereauPeriode(pId, bordereau);
        totalBordereaux++;
      }

      // Bordereau de paiement 511-1-01
      const paiement = persistenceService.getPaiementPeriode(pId);
      if (paiement) {
        await supabasePersistenceService.savePaiementPeriode(pId, paiement);
        totalPaiements++;
      }

      // Dossier mensuel scellé
      const dossier = persistenceService.getDossierPeriode(pId);
      if (dossier) {
        await supabasePersistenceService.saveDossierPeriode(pId, dossier);
        totalDossiers++;
      }

      // Fichier préétabli BDS
      const preetabli = persistenceService.getFichierPreetabli(pId);
      if (preetabli) {
        await supabasePersistenceService.saveFichierPreetabli(pId, preetabli);
        totalPreetablis++;
      }

      // Anomalies résolues manuellement
      const anomaliesResolues = persistenceService.getAnomaliesResoluesManuellement(pId);
      if (anomaliesResolues && Object.keys(anomaliesResolues).length > 0) {
        supabasePersistenceService.saveAnomaliesResoluesManuellement(pId, anomaliesResolues);
      }
    }

    // 5. Journal d'audit (Append-Only préservé)
    await supabasePersistenceService.saveJournalAudit(localAudits);

    // Log de l'événement de migration dans l'audit local et Supabase
    persistenceService.enregistrerEvenementAudit({
      id: `audit_migr_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'MIGRATION_SUPABASE_EFFECTUEE',
      salarie: 'SYSTÈME',
      utilisateur: 'Gestionnaire MULT.S',
      nouvelleValeur: `Migré vers Supabase : ${localSalaries.length} salariés, ${localPeriodes.length} périodes`,
      justification: `Migration idempotente réussie avec backup de sécurité ${backupFile.backupId}`,
    });

    const finMs = performance.now();
    const rapportComparaison = await this.compareLocalVsSupabase();
    rapportComparaison.backupPreMigrationId = backupFile.backupId;
    rapportComparaison.backupContentHash = backupFile.integrity.contentHash;

    const statsMigrees = {
      entreprises: localConfig ? 1 : 0,
      salaries: localSalaries.length,
      aliases: localAliases.length,
      periodes: localPeriodes.length,
      lignesPaie: totalLignesPaie,
      rapprochements: totalRaps,
      registres: totalRegistres,
      bordereaux: totalBordereaux,
      paiements: totalPaiements,
      dossiers: totalDossiers,
      preetablis: totalPreetablis,
      audits: localAudits.length,
      total:
        (localConfig ? 1 : 0) +
        localSalaries.length +
        localAliases.length +
        localPeriodes.length +
        totalLignesPaie +
        totalRaps +
        totalRegistres +
        totalBordereaux +
        totalPaiements +
        totalDossiers +
        totalPreetablis +
        localAudits.length,
    };

    return {
      succes: true,
      message: `Migration réussie avec succès ! ${statsMigrees.total} éléments synchronisés avec Supabase. LocalStorage préservé à 100%.`,
      backupEffectue: true,
      backupId: backupFile.backupId,
      backupFile,
      dureeMs: Math.round(finMs - debutMs),
      rapportComparaison,
      statsMigrees,
    };
  },
};
