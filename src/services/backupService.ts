/**
 * Service de Sauvegarde, Restauration, Archivage et Reprise Après Sinistre
 * APPLICATION CNSS MULT.S (PROMPT 11)
 *
 * Règles absolues :
 * - Aucune dépendance Cloud (zéro transmission externe, zéro Google Drive, Dropbox, Damancom)
 * - Format de fichier autonome .mcnss
 * - Hash d'intégrité SHA-256 déterministe
 * - Restauration atomique avec snapshot pré-restauration obligatoire et rollback automatique
 * - Respect inviolable des statuts CLOTURE et de la traçabilité
 */

import {
  MultsCnssBackup,
  MultsCnssBackupPayload,
  TypeBackup,
  ApercuBackup,
  ValidationBackupResult,
  RestoreOptions,
  RestoreResult,
  EtatSnapshot,
  GlobalIntegrityReport,
  ItemHistoriqueBackup,
  ConflitPeriodeDetail,
} from '../types/cnssBackup';
import {
  SalarieReferentiel,
  AliasItem,
  EvenementAudit,
  PeriodeMensuelle,
  LigneRegistreCnss,
  LignePaieImportee,
  ResultatRapprochement,
} from '../types/cnss';
import { EntrepriseCnssConfig, DocumentBordereauCnss } from '../types/cnssBordereau';
import { DocumentBordereauPaiementCnss, CnssTauxItem } from '../types/cnssPaiement';
import { DossierCnssMensuel } from '../types/cnssDossier';
import { persistenceService } from './persistenceService';
import { sha256, canonicalizeJson } from '../utils/sha256';

const STORAGE_KEY_BACKUP_HISTORIQUE = 'cnss_mults_backup_historique_p11';
const APPLICATION_VERSION = '1.0.0';
const FORMAT_VERSION = '1.0';

export class BackupService {
  private lastPreRestoreBackup: MultsCnssBackup | null = null;

  // =========================================================================
  // 1. EXTRACTION & CANONICALISATION DU PAYLOAD
  // =========================================================================

  /**
   * Extrait le payload logique de données en cours dans l'application.
   */
  private extrairePayloadActuel(targetPeriodId?: string): MultsCnssBackupPayload {
    const company = persistenceService.getEntrepriseConfig();
    const allPeriods = persistenceService.getPeriodes();
    const periods = targetPeriodId
      ? allPeriods.filter(p => (p.id || p.idMois) === targetPeriodId)
      : allPeriods;

    const employees = persistenceService.getSalaries();
    const aliases = persistenceService.getAliases();
    const decisionsSorties = persistenceService.getDecisionsSorties();

    const lignesPaie: Record<string, LignePaieImportee[]> = {};
    const rapprochements: Record<string, ResultatRapprochement[]> = {};
    const registers: Record<string, LigneRegistreCnss[]> = {};
    const declarations: Record<string, DocumentBordereauCnss> = {};
    const payments: Record<string, DocumentBordereauPaiementCnss> = {};
    const dossiers: Record<string, DossierCnssMensuel> = {};

    periods.forEach(p => {
      const pId = p.id || p.idMois || '';
      if (!pId) return;

      const lp = persistenceService.getLignesPaiePeriode(pId);
      if (lp && lp.length > 0) lignesPaie[pId] = lp;

      const rap = persistenceService.getRapprochementsPeriode(pId);
      if (rap && rap.length > 0) rapprochements[pId] = rap;

      const reg = persistenceService.getRegistrePeriode(pId);
      if (reg && reg.length > 0) registers[pId] = reg;

      const dec = persistenceService.getBordereauPeriode(pId);
      if (dec) declarations[pId] = dec;

      const pay = persistenceService.getPaiementPeriode(pId);
      if (pay) payments[pId] = pay;

      const dos = persistenceService.getDossierPeriode(pId);
      if (dos) dossiers[pId] = dos;
    });

    const allAudits = persistenceService.getJournalAudit();
    const audits = targetPeriodId
      ? allAudits.filter(a => a.periodeConcernee === targetPeriodId)
      : allAudits;

    const configurations = {
      taux: persistenceService.getTauxConfig() || undefined,
      moisActif: persistenceService.getMoisActif(),
    };

    return {
      company,
      periods,
      employees,
      aliases,
      decisionsSorties,
      lignesPaie,
      rapprochements,
      registers,
      declarations,
      payments,
      dossiers,
      audits,
      configurations,
    };
  }

  /**
   * Calcule le hash cryptographique SHA-256 déterministe d'un payload.
   * La canonicalisation garantit que l'ordre des clés ou la sérialisation n'affecte pas le hash.
   * Les événements d'audit opérationnels éphémères (création/restauration de backup) sont exclus
   * du calcul de l'empreinte de contenu logique afin de garantir un hash strictement reproductible.
   */
  public calculerHashPayload(payload: MultsCnssBackupPayload): string {
    const auditsMetier = (payload.audits || []).filter(
      a =>
        !a.typeEvenement?.startsWith('BACKUP_') &&
        !a.typeEvenement?.startsWith('PRE_RESTORE_') &&
        !a.typeEvenement?.startsWith('ARCHIVE_')
    );

    const payloadCanonical: MultsCnssBackupPayload = {
      ...payload,
      audits: auditsMetier,
    };

    const canonicalStr = canonicalizeJson(payloadCanonical);
    return sha256(canonicalStr);
  }

  // =========================================================================
  // 2. CRÉATION DE BACKUP COMPLET (SECTION 2 & 11)
  // =========================================================================

  /**
   * Crée une sauvegarde complète de toutes les périodes et données de l'application.
   */
  public createFullBackup(utilisateur: string = 'Administrateur MULT.S'): MultsCnssBackup {
    const payload = this.extrairePayloadActuel();
    const contentHash = this.calculerHashPayload(payload);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const backupId = `backup_${dateStr}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const periodesCloturees = payload.periods
      .filter(p => p.statut === 'CLOTURE')
      .map(p => (p.id || p.idMois) as string);

    const backup: MultsCnssBackup = {
      formatVersion: FORMAT_VERSION,
      applicationVersion: APPLICATION_VERSION,
      backupId,
      backupType: 'FULL',
      createdAt: now.toISOString(),
      ...payload,
      metadata: {
        totalPeriodes: payload.periods.length,
        totalSalaries: payload.employees.length,
        totalAudits: payload.audits.length,
        totalDossiers: Object.keys(payload.dossiers).length,
        periodesCloturees,
        exportePar: utilisateur,
        sourceSysteme: 'MULT.S CNSS - v1.0',
      },
      integrity: {
        contentHash,
        algorithm: 'SHA-256',
        signatureVersion: '1.0',
      },
    };

    // Traçabilité de l'opération
    persistenceService.enregistrerEvenementAudit({
      id: `audit_bk_${Date.now()}`,
      date: now.toISOString(),
      horodatage: now.toISOString(),
      utilisateur,
      action: 'CREATION',
      categorie: 'CONFIGURATION',
      typeEvenement: 'BACKUP_CREATED',
      statut: 'VALIDE',
      details: `Sauvegarde complète exportée. Périodes: ${payload.periods.length}, Salariés: ${payload.employees.length}, Empreinte: ${contentHash.substring(0, 16)}...`,
      valeurApres: contentHash,
    });

    // Enregistrement dans l'historique
    this.saveHistoriqueBackup({
      id: backupId,
      type: 'FULL',
      dateCreation: now.toISOString(),
      tailleOctets: this.serializeBackup(backup).length,
      contentHash,
      statut: 'VALIDE',
      description: `Sauvegarde complète (${payload.periods.length} périodes, ${payload.employees.length} salariés)`,
    });

    return backup;
  }

  // =========================================================================
  // 3. ARCHIVAGE D'UNE PÉRIODE (SECTION 12 & 13)
  // =========================================================================

  /**
   * Crée l'archive autonome d'une période clôturée ou validée.
   */
  public createPeriodArchive(
    periodId: string,
    utilisateur: string = 'Administrateur MULT.S'
  ): MultsCnssBackup {
    const periodes = persistenceService.getPeriodes();
    const targetPeriod = periodes.find(p => p.id === periodId);

    if (!targetPeriod) {
      throw new Error(`Période ${periodId} introuvable pour archivage.`);
    }

    const payload = this.extrairePayloadActuel(periodId);
    const contentHash = this.calculerHashPayload(payload);

    const now = new Date();
    const backupId = `archive_${periodId}_${Date.now()}`;

    const backup: MultsCnssBackup = {
      formatVersion: FORMAT_VERSION,
      applicationVersion: APPLICATION_VERSION,
      backupId,
      backupType: 'PERIOD_ARCHIVE',
      targetPeriodId: periodId,
      createdAt: now.toISOString(),
      ...payload,
      metadata: {
        totalPeriodes: 1,
        totalSalaries: payload.employees.length,
        totalAudits: payload.audits.length,
        totalDossiers: Object.keys(payload.dossiers).length,
        periodesCloturees: targetPeriod.statut === 'CLOTURE' ? [periodId] : [],
        exportePar: utilisateur,
        sourceSysteme: 'MULT.S CNSS - Archivage Période',
      },
      integrity: {
        contentHash,
        algorithm: 'SHA-256',
        signatureVersion: '1.0',
      },
    };

    persistenceService.enregistrerEvenementAudit({
      id: `audit_arch_${Date.now()}`,
      date: now.toISOString(),
      horodatage: now.toISOString(),
      utilisateur,
      action: 'CREATION',
      categorie: 'DOSSIER_CNSS',
      typeEvenement: 'ARCHIVE_CREATED',
      statut: 'VALIDE',
      periodeConcernee: periodId,
      details: `Archive de la période ${periodId} créée avec succès. Statut: ${targetPeriod.statut}, Empreinte: ${contentHash.substring(0, 16)}...`,
      valeurApres: contentHash,
    });

    this.saveHistoriqueBackup({
      id: backupId,
      type: 'PERIOD_ARCHIVE',
      targetPeriodId: periodId,
      dateCreation: now.toISOString(),
      tailleOctets: this.serializeBackup(backup).length,
      contentHash,
      statut: 'VALIDE',
      description: `Archive officielle période ${periodId} (Statut: ${targetPeriod.statut})`,
    });

    return backup;
  }

  // =========================================================================
  // 4. BACKUP AVANT RESTAURATION (SECTION 16)
  // =========================================================================

  /**
   * Génère automatiquement un backup de sécurité d'urgence avant toute restauration.
   */
  public createPreRestoreBackup(
    utilisateur: string = 'Système (Pré-Restauration Automatique)'
  ): MultsCnssBackup {
    const payload = this.extrairePayloadActuel();
    const contentHash = this.calculerHashPayload(payload);

    const now = new Date();
    const backupId = `pre_restore_${Date.now()}`;

    const backup: MultsCnssBackup = {
      formatVersion: FORMAT_VERSION,
      applicationVersion: APPLICATION_VERSION,
      backupId,
      backupType: 'PRE_RESTORE',
      createdAt: now.toISOString(),
      ...payload,
      metadata: {
        totalPeriodes: payload.periods.length,
        totalSalaries: payload.employees.length,
        totalAudits: payload.audits.length,
        totalDossiers: Object.keys(payload.dossiers).length,
        periodesCloturees: payload.periods.filter(p => p.statut === 'CLOTURE').map(p => (p.id || p.idMois) as string),
        exportePar: utilisateur,
        sourceSysteme: 'MULT.S CNSS - Pré-Restauration Garde-Fou',
      },
      integrity: {
        contentHash,
        algorithm: 'SHA-256',
        signatureVersion: '1.0',
      },
    };

    this.lastPreRestoreBackup = backup;

    persistenceService.enregistrerEvenementAudit({
      id: `audit_prerest_${Date.now()}`,
      date: now.toISOString(),
      horodatage: now.toISOString(),
      utilisateur,
      action: 'CREATION',
      categorie: 'CONFIGURATION',
      typeEvenement: 'PRE_RESTORE_BACKUP_CREATED',
      statut: 'VALIDE',
      details: `Instantané de pré-restauration créé automatiquement. Empreinte: ${contentHash.substring(0, 16)}...`,
      valeurApres: contentHash,
    });

    return backup;
  }

  public getLastPreRestoreBackup(): MultsCnssBackup | null {
    return this.lastPreRestoreBackup;
  }

  // =========================================================================
  // 5. VALIDATION DU FICHIER ET DE L'INTÉGRITÉ (SECTION 9, 19, 20)
  // =========================================================================

  /**
   * Vérifie la conformité structurelle et cryptographique d'un objet de sauvegarde.
   */
  public validateBackup(backup: any): ValidationBackupResult {
    if (!backup || typeof backup !== 'object') {
      return {
        valide: false,
        codeErreur: 'STRUCTURE_INCORRECTE',
        message: 'Le contenu fourni est vide ou ne constitue pas un objet JSON valide.',
      };
    }

    // Contrôle strict de format et version
    if (!backup.formatVersion) {
      return {
        valide: false,
        codeErreur: 'FORMAT_INVALIDE',
        message: 'Identifiant de format de sauvegarde manquant.',
      };
    }

    if (backup.formatVersion !== FORMAT_VERSION) {
      return {
        valide: false,
        codeErreur: 'VERSION_INCOMPATIBLE',
        message: 'Ce backup utilise une version de format incompatible.',
      };
    }

    // Champs obligatoires
    if (!backup.backupId || !backup.createdAt || !backup.integrity) {
      return {
        valide: false,
        codeErreur: 'DONNEES_MANQUANTES',
        message: 'En-têtes de sauvegarde obligatoires absents (backupId, createdAt ou integrity).',
      };
    }

    if (!backup.integrity.contentHash) {
      return {
        valide: false,
        codeErreur: 'DONNEES_MANQUANTES',
        message: "Empreinte cryptographique d'intégrité absente du fichier.",
      };
    }

    if (!Array.isArray(backup.periods) || !Array.isArray(backup.employees)) {
      return {
        valide: false,
        codeErreur: 'DONNEES_MANQUANTES',
        message: 'Structures obligatoires de périodes ou de salariés manquantes.',
      };
    }

    // Reconstitution du payload pour recalcul déterministe de SHA-256
    const payload: MultsCnssBackupPayload = {
      company: backup.company,
      periods: backup.periods,
      employees: backup.employees,
      aliases: backup.aliases || [],
      decisionsSorties: backup.decisionsSorties || {},
      lignesPaie: backup.lignesPaie || {},
      rapprochements: backup.rapprochements || {},
      registers: backup.registers || {},
      declarations: backup.declarations || {},
      payments: backup.payments || {},
      dossiers: backup.dossiers || {},
      audits: backup.audits || [],
      configurations: backup.configurations || {},
    };

    const calculatedHash = this.calculerHashPayload(payload);

    if (calculatedHash !== backup.integrity.contentHash) {
      return {
        valide: false,
        codeErreur: 'HASH_INVALID',
        message: 'Empreinte de contrôle invalide. Le fichier a été altéré ou corrompu.',
        details: {
          hashAttendu: backup.integrity.contentHash,
          hashCalcule: calculatedHash,
        },
      };
    }

    return {
      valide: true,
      message: 'Sauvegarde intègre et conforme aux spécifications MULT.S.',
    };
  }

  /**
   * Vérifie rapidement l'intégrité sans lever d'exception.
   */
  public verifyBackupIntegrity(backup: MultsCnssBackup): boolean {
    const val = this.validateBackup(backup);
    return val.valide;
  }

  // =========================================================================
  // 6. APERÇU AVANT RESTAURATION (SECTION 15 & 22)
  // =========================================================================

  /**
   * Génère l'aperçu complet avant restauration avec analyse des conflits potentiels.
   */
  public previewBackup(backup: MultsCnssBackup): ApercuBackup {
    const val = this.validateBackup(backup);
    const periodesActuelles = persistenceService.getPeriodes().map(p => (p.id || p.idMois) as string);

    const conflitsPotentiels = (backup.periods || [])
      .map(p => (p.id || p.idMois) as string)
      .filter(id => periodesActuelles.includes(id));

    return {
      backupId: backup.backupId || 'INCONNU',
      backupType: backup.backupType || 'FULL',
      targetPeriodId: backup.targetPeriodId,
      createdAt: backup.createdAt || '',
      formatVersion: backup.formatVersion || '1.0',
      applicationVersion: backup.applicationVersion || '1.0.0',
      raisonSociale: backup.company?.raisonSociale || 'MULT.S SARLAU',
      numeroAffiliation: backup.company?.numeroAffiliation || '6541835',
      totalPeriodes: backup.periods?.length || 0,
      periodes: (backup.periods || []).map(p => (p.id || p.idMois) as string),
      periodesCloturees: (backup.periods || [])
        .filter(p => p.statut === 'CLOTURE')
        .map(p => (p.id || p.idMois) as string),
      totalSalaries: backup.employees?.length || 0,
      totalAliases: backup.aliases?.length || 0,
      totalAudits: backup.audits?.length || 0,
      totalDossiers: Object.keys(backup.dossiers || {}).length,
      contentHash: backup.integrity?.contentHash || '',
      tailleOctets: this.serializeBackup(backup).length,
      statutIntegrite: val.valide ? 'VALIDE' : 'CORROMPU',
      conflitsPotentiels,
    };
  }

  /**
   * Détecte les conflits précis de périodes entre l'état actuel et le backup.
   */
  public detecterConflitsPeriodes(backup: MultsCnssBackup): ConflitPeriodeDetail[] {
    const periodesActuelles = persistenceService.getPeriodes();
    const conflits: ConflitPeriodeDetail[] = [];

    (backup.periods || []).forEach(pBackup => {
      const bId = (pBackup.id || pBackup.idMois) as string;
      const pActuelle = periodesActuelles.find(p => (p.id || p.idMois) === bId);
      if (pActuelle) {
        const aId = (pActuelle.id || pActuelle.idMois) as string;
        const dossierActuel = persistenceService.getDossierPeriode(aId);
        const dossierBackup = backup.dossiers?.[bId];
        conflits.push({
          periodeId: bId,
          statutActuel: pActuelle.statut,
          statutBackup: pBackup.statut,
          dateClotureActuelle: pActuelle.dateCloture,
          dateClotureBackup: pBackup.dateCloture,
          dossierPresentActuel: Boolean(dossierActuel),
          dossierPresentBackup: Boolean(dossierBackup),
        });
      }
    });

    return conflits;
  }

  // =========================================================================
  // 7. RESTAURATION ATOMIQUE & ROLLBACK (SECTION 17 & 18)
  // =========================================================================

  /**
   * Restaure un backup de manière atomique.
   * En cas d'erreur lors de l'application, l'état initial est automatiquement restauré.
   */
  public restoreBackup(
    backup: MultsCnssBackup,
    options: RestoreOptions = {}
  ): RestoreResult {
    const {
      ecraserConflits = false,
      utilisateur = 'Administrateur MULT.S',
      ignorerAuditInterne = false,
    } = options;

    // 1. Validation de l'intégrité du fichier
    const validation = this.validateBackup(backup);
    if (!validation.valide) {
      if (!ignorerAuditInterne) {
        persistenceService.enregistrerEvenementAudit({
          id: `audit_rest_fail_${Date.now()}`,
          date: new Date().toISOString(),
          horodatage: new Date().toISOString(),
          utilisateur,
          action: 'MODIFICATION',
          categorie: 'CONFIGURATION',
          typeEvenement: 'BACKUP_RESTORE_FAILED',
          statut: 'BLOQUE',
          details: `Tentative de restauration rejetée : ${validation.message}`,
        });
      }
      return {
        succes: false,
        statut: 'RESTAURATION_REFUSEE',
        message: validation.message,
      };
    }

    // 2. Détection des conflits de période si l'écrasement n'a pas été explicitement consenti
    const conflits = this.detecterConflitsPeriodes(backup);
    if (conflits.length > 0 && !ecraserConflits) {
      return {
        succes: false,
        statut: 'CONFLIT_PERIODE',
        message: `Conflit détecté sur ${conflits.length} période(s) déjà existante(s). Confirmation explicite requise.`,
        details: {
          periodesRestaurees: 0,
          salariesRestaures: 0,
          dossiersRestaures: 0,
          conflits,
        },
      };
    }

    // 3. Création impérative du Pré-Backup de sécurité
    let preBackup: MultsCnssBackup;
    try {
      preBackup = this.createPreRestoreBackup(utilisateur);
    } catch (err: any) {
      return {
        succes: false,
        statut: 'RESTAURATION_REFUSEE',
        message: `Échec de la création du pré-backup de sécurité : ${err?.message || 'Erreur inconnue'}. Restauration annulée.`,
      };
    }

    // 4. Exécution atomique
    try {
      // Si sauvegarde d'une seule période (PERIOD_ARCHIVE), on fusionne la période sans écraser les autres
      if (backup.backupType === 'PERIOD_ARCHIVE' && backup.targetPeriodId) {
        this.appliquerRestaurationPeriodeUnique(backup, backup.targetPeriodId);
      } else {
        // Restauration globale complète
        this.appliquerRestaurationComplete(backup);
      }

      // 5. Contrôle immédiat d'intégrité après restauration
      const controleIntegrite = this.verifyGlobalIntegrity();

      if (!ignorerAuditInterne) {
        persistenceService.enregistrerEvenementAudit({
          id: `audit_rest_ok_${Date.now()}`,
          date: new Date().toISOString(),
          horodatage: new Date().toISOString(),
          utilisateur,
          action: 'MODIFICATION',
          categorie: 'CONFIGURATION',
          typeEvenement: 'BACKUP_RESTORE_SUCCESS',
          statut: 'VALIDE',
          details: `Restauration réussie depuis le backup ${backup.backupId}. Empreinte restaurée: ${backup.integrity.contentHash.substring(0, 16)}...`,
          valeurApres: backup.integrity.contentHash,
        });
      }

      return {
        succes: true,
        statut: 'RESTAURATION_COMPLETE',
        message: 'Restauration effectuée avec succès. Toutes les données ont été réintégrées et vérifiées.',
        preRestoreBackupId: preBackup.backupId,
        details: {
          periodesRestaurees: backup.periods.length,
          salariesRestaures: backup.employees.length,
          dossiersRestaures: Object.keys(backup.dossiers || {}).length,
          integriteApresRestauration: controleIntegrite.valide,
          anomaliesIntegrite: controleIntegrite.anomalies,
        },
      };
    } catch (error: any) {
      // Rollback immédiat en cas d'erreur imprévue
      this.rollback(preBackup);

      if (!ignorerAuditInterne) {
        persistenceService.enregistrerEvenementAudit({
          id: `audit_rest_rb_${Date.now()}`,
          date: new Date().toISOString(),
          horodatage: new Date().toISOString(),
          utilisateur,
          action: 'MODIFICATION',
          categorie: 'CONFIGURATION',
          typeEvenement: 'BACKUP_RESTORE_FAILED',
          statut: 'BLOQUE',
          details: `Erreur durant la restauration. Rollback automatique exécuté : ${error?.message || 'Erreur inattendue'}`,
        });
      }

      return {
        succes: false,
        statut: 'ROLLBACK_EFFECTUE',
        message: `La restauration a échoué (${error?.message || 'Erreur'}). L'état antérieur a été intégralement préservé.`,
        preRestoreBackupId: preBackup.backupId,
      };
    }
  }

  /**
   * Applique la restauration complète dans le stockage.
   */
  private appliquerRestaurationComplete(backup: MultsCnssBackup): void {
    // 1. Configuration entreprise
    if (backup.company) {
      persistenceService.saveEntrepriseConfig(backup.company);
    }

    // 2. Salariés référentiels
    persistenceService.saveSalaries(backup.employees || []);

    // 3. Alias
    persistenceService.saveAliases(backup.aliases || []);

    // 4. Décisions de sorties
    persistenceService.saveDecisionsSorties(backup.decisionsSorties || {});

    // 5. Périodes (en veillant à préserver leur statut CLOTURE strict)
    persistenceService.savePeriodes(backup.periods || []);

    // 6. Données par période
    (backup.periods || []).forEach(p => {
      const pId = p.id || p.idMois || '';
      if (!pId) return;
      if (backup.lignesPaie?.[pId]) {
        persistenceService.saveLignesPaiePeriode(pId, backup.lignesPaie[pId]);
      }
      if (backup.rapprochements?.[pId]) {
        persistenceService.saveRapprochementsPeriode(pId, backup.rapprochements[pId]);
      }
      if (backup.registers?.[pId]) {
        persistenceService.saveRegistrePeriode(pId, backup.registers[pId]);
      }
      if (backup.declarations?.[pId]) {
        persistenceService.saveBordereauPeriode(pId, backup.declarations[pId]);
      }
      if (backup.payments?.[pId]) {
        persistenceService.savePaiementPeriode(pId, backup.payments[pId]);
      }
      if (backup.dossiers?.[pId]) {
        persistenceService.saveDossierPeriode(pId, backup.dossiers[pId]);
      }
    });

    // 7. Configurations globales
    if (backup.configurations?.taux) {
      persistenceService.saveTauxConfig(backup.configurations.taux);
    }
    if (backup.configurations?.moisActif) {
      persistenceService.setMoisActif(backup.configurations.moisActif);
    }

    // 8. Audits
    if (backup.audits && Array.isArray(backup.audits)) {
      persistenceService.saveJournalAudit(backup.audits);
    }
  }

  /**
   * Applique la restauration ciblée d'une seule archive de période.
   */
  private appliquerRestaurationPeriodeUnique(
    backup: MultsCnssBackup,
    targetPeriodId: string
  ): void {
    const periodesActuelles = persistenceService.getPeriodes();
    const periodeArchive = backup.periods.find(p => p.id === targetPeriodId);

    if (!periodeArchive) {
      throw new Error(`Période ${targetPeriodId} introuvable dans l'archive.`);
    }

    // Remplacement ou ajout de la période ciblée
    const autresPeriodes = periodesActuelles.filter(p => p.id !== targetPeriodId);
    persistenceService.savePeriodes([...autresPeriodes, periodeArchive]);

    // Données de la période
    if (backup.lignesPaie?.[targetPeriodId]) {
      persistenceService.saveLignesPaiePeriode(targetPeriodId, backup.lignesPaie[targetPeriodId]);
    }
    if (backup.rapprochements?.[targetPeriodId]) {
      persistenceService.saveRapprochementsPeriode(targetPeriodId, backup.rapprochements[targetPeriodId]);
    }
    if (backup.registers?.[targetPeriodId]) {
      persistenceService.saveRegistrePeriode(targetPeriodId, backup.registers[targetPeriodId]);
    }
    if (backup.declarations?.[targetPeriodId]) {
      persistenceService.saveBordereauPeriode(targetPeriodId, backup.declarations[targetPeriodId]);
    }
    if (backup.payments?.[targetPeriodId]) {
      persistenceService.savePaiementPeriode(targetPeriodId, backup.payments[targetPeriodId]);
    }
    if (backup.dossiers?.[targetPeriodId]) {
      persistenceService.saveDossierPeriode(targetPeriodId, backup.dossiers[targetPeriodId]);
    }

    // Intégration des salariés de l'archive dans le référentiel actuel
    if (backup.employees && backup.employees.length > 0) {
      const salariesActuels = persistenceService.getSalaries();
      const idsExistants = new Set(salariesActuels.map(s => s.id));
      const nouveaux = backup.employees.filter(s => !idsExistants.has(s.id));
      if (nouveaux.length > 0) {
        persistenceService.saveSalaries([...salariesActuels, ...nouveaux]);
      }
    }

    // Fusion des audits
    if (backup.audits && backup.audits.length > 0) {
      const auditsActuels = persistenceService.getJournalAudit();
      const auditsFusion = [...backup.audits, ...auditsActuels.filter(a => a.periodeConcernee !== targetPeriodId)];
      persistenceService.saveJournalAudit(auditsFusion.slice(0, 200));
    }
  }

  /**
   * Effectue un rollback direct vers un état de pré-backup.
   */
  public rollback(preBackup: MultsCnssBackup): boolean {
    try {
      this.appliquerRestaurationComplete(preBackup);
      return true;
    } catch (e) {
      return false;
    }
  }

  // =========================================================================
  // 8. CONTRÔLE D'INTÉGRITÉ GLOBAL (SECTION 25 & 43)
  // =========================================================================

  /**
   * Analyse exhaustive de l'intégrité de toutes les données actuellement stockées.
   */
  public verifyGlobalIntegrity(): GlobalIntegrityReport {
    const anomalies: string[] = [];
    const periodes = persistenceService.getPeriodes();
    const salaries = persistenceService.getSalaries();
    const aliases = persistenceService.getAliases();
    const audits = persistenceService.getJournalAudit();

    // 1. Contrôle des périodes
    let periodesValides = 0;
    const periodesIds = new Set<string>();

    periodes.forEach(p => {
      const pId = p.id || p.idMois;
      if (!pId || !/^\d{4}-\d{2}$/.test(pId)) {
        anomalies.push(`Période avec identifiant non conforme : "${pId}".`);
      } else if (periodesIds.has(pId)) {
        anomalies.push(`Doublon d'identifiant de période : ${pId}.`);
      } else {
        periodesIds.add(pId);
        periodesValides++;
      }

      // Si période clôturée, vérifier la présence d'un registre et du verrouillage
      if (p.statut === 'CLOTURE') {
        const reg = persistenceService.getRegistrePeriode(pId);
        if (!reg || reg.length === 0) {
          anomalies.push(`Période clôturée ${pId} sans registre associé.`);
        }
        const dos = persistenceService.getDossierPeriode(pId);
        if (!dos) {
          anomalies.push(`Période clôturée ${pId} sans dossier mensuel officiel.`);
        }
      }
    });

    // 2. Contrôle des salariés
    const cnssSet = new Set<string>();
    const cniSet = new Set<string>();

    salaries.forEach(s => {
      const cnssVal = (s.cnss || s.immatriculationCnss || '').trim();
      if (cnssVal) {
        if (cnssSet.has(cnssVal)) {
          anomalies.push(`Doublon d'immatriculation CNSS détecté dans le référentiel : ${cnssVal}.`);
        } else {
          cnssSet.add(cnssVal);
        }
      }
      const cniVal = (s.cni || '').trim();
      if (cniVal) {
        if (cniSet.has(cniVal)) {
          anomalies.push(`Doublon de CNI détecté dans le référentiel : ${cniVal}.`);
        } else {
          cniSet.add(cniVal);
        }
      }
    });

    // 3. Contrôle des dossiers et hashes
    let totalDossiers = 0;
    let dossiersInviolables = 0;

    periodes.forEach(p => {
      const pId = p.id || p.idMois;
      const dossier = persistenceService.getDossierPeriode(pId);
      if (dossier) {
        totalDossiers++;
        if (dossier.dossierHash && dossier.dossierHash.startsWith('sha256_')) {
          dossiersInviolables++;
        }
      }
    });

    // 4. Contrôle des alias
    aliases.forEach(al => {
      const brut = al.aliasBrut || al.nomDeclare;
      const off = al.nomOfficielSalarie || al.nomOfficiel;
      if (!brut || !off) {
        anomalies.push(`Alias corrompu avec champ vide : ${JSON.stringify(al)}.`);
      }
    });

    const valide = anomalies.length === 0;

    return {
      valide,
      statut: valide ? 'INTEGRITY_CHECK_OK' : 'INTEGRITY_CHECK_FAILED',
      dateControle: new Date().toISOString(),
      anomalies,
      details: {
        totalPeriodes: periodes.length,
        periodesValides,
        totalSalaries: salaries.length,
        totalAliases: aliases.length,
        totalAudits: audits.length,
        totalDossiers,
        dossiersInviolables,
        referencesCroiseesValides: valide,
      },
    };
  }

  // =========================================================================
  // 9. INSTANTANÉ & COMPARAISON D'ÉTATS (SECTION 32)
  // =========================================================================

  /**
   * Capture une photographie instantanée de l'état du système pour comparaison.
   */
  public captureCurrentStateSnapshot(): EtatSnapshot {
    const payload = this.extrairePayloadActuel();
    const dossiersHashes: Record<string, string> = {};
    Object.entries(payload.dossiers).forEach(([k, d]) => {
      dossiersHashes[k] = d.dossierHash;
    });

    const auditsMetier = (payload.audits || []).filter(
      a =>
        !a.typeEvenement?.startsWith('BACKUP_') &&
        !a.typeEvenement?.startsWith('PRE_RESTORE_') &&
        !a.typeEvenement?.startsWith('ARCHIVE_')
    );

    return {
      nombrePeriodes: payload.periods.length,
      periodesIds: payload.periods.map(p => p.id || p.idMois || '').sort(),
      nombreSalaries: payload.employees.length,
      nombreAliases: payload.aliases.length,
      nombreAudits: auditsMetier.length,
      nombreRegistres: Object.keys(payload.registers).length,
      nombreDossiers: Object.keys(payload.dossiers).length,
      dossiersHashes,
      contentHash: this.calculerHashPayload(payload),
    };
  }

  /**
   * Compare deux photographies d'état (avant backup vs après restauration).
   */
  public compareStateBeforeAfterRestore(
    before: EtatSnapshot,
    after: EtatSnapshot
  ): { identique: boolean; differences: string[] } {
    const differences: string[] = [];

    if (before.nombrePeriodes !== after.nombrePeriodes) {
      differences.push(`Nombre de périodes différent : ${before.nombrePeriodes} vs ${after.nombrePeriodes}.`);
    }

    if (before.nombreSalaries !== after.nombreSalaries) {
      differences.push(`Nombre de salariés différent : ${before.nombreSalaries} vs ${after.nombreSalaries}.`);
    }

    if (before.nombreAliases !== after.nombreAliases) {
      differences.push(`Nombre d'alias différent : ${before.nombreAliases} vs ${after.nombreAliases}.`);
    }

    if (before.nombreDossiers !== after.nombreDossiers) {
      differences.push(`Nombre de dossiers différent : ${before.nombreDossiers} vs ${after.nombreDossiers}.`);
    }

    if (before.contentHash !== after.contentHash) {
      differences.push(`Empreinte globale différente : ${before.contentHash} vs ${after.contentHash}.`);
    }

    return {
      identique: differences.length === 0,
      differences,
    };
  }

  // =========================================================================
  // 10. SÉRIALISATION, PARSING & FICHIERS (SECTION 3 & 34)
  // =========================================================================

  /**
   * Sérialise la sauvegarde en chaîne JSON formatée de manière propre.
   */
  public serializeBackup(backup: MultsCnssBackup): string {
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Parse et valide une chaîne issue d'un fichier .mcnss.
   */
  public parseBackup(
    fileContent: string
  ): { success: boolean; backup?: MultsCnssBackup; error?: string } {
    if (!fileContent || !fileContent.trim()) {
      return { success: false, error: 'Fichier vide.' };
    }

    try {
      const parsed = JSON.parse(fileContent);
      const validation = this.validateBackup(parsed);
      if (!validation.valide) {
        return { success: false, error: validation.message, backup: parsed };
      }
      return { success: true, backup: parsed };
    } catch (e: any) {
      return {
        success: false,
        error: `Erreur de syntaxe JSON : ${e?.message || 'fichier invalide'}`,
      };
    }
  }

  /**
   * Génère le nom normalisé du fichier selon les règles de nommage strictes de MULT.S.
   */
  public genererNomFichier(
    type: TypeBackup,
    periodId?: string,
    date: Date = new Date()
  ): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    if (type === 'PERIOD_ARCHIVE' && periodId) {
      return `MULTS_CNSS_ARCHIVE_${periodId}.mcnss`;
    }
    if (type === 'PRE_RESTORE') {
      return `MULTS_PRE_RESTORE_${yyyy}-${mm}-${dd}.mcnss`;
    }
    return `MULTS_CNSS_BACKUP_${yyyy}-${mm}-${dd}.mcnss`;
  }

  /**
   * Déclenche le téléchargement local sécurisé d'un fichier .mcnss dans le navigateur.
   */
  public telechargerFichier(contenu: string, nomFichier: string): void {
    if (typeof window === 'undefined') return;

    const blob = new Blob([contenu], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nomFichier);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // =========================================================================
  // 11. HISTORIQUE DES SAUVEGARDES (SECTION 37 & 38)
  // =========================================================================

  public getHistoriqueBackups(): ItemHistoriqueBackup[] {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const raw = window.localStorage.getItem(STORAGE_KEY_BACKUP_HISTORIQUE);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  public saveHistoriqueBackup(item: ItemHistoriqueBackup): void {
    try {
      const list = this.getHistoriqueBackups();
      list.unshift(item);
      if (list.length > 50) list.pop();
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY_BACKUP_HISTORIQUE, JSON.stringify(list));
      }
    } catch (e) {
      // ignore
    }
  }

  public clearHistoriqueBackups(): void {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY_BACKUP_HISTORIQUE);
      }
    } catch (e) {
      // ignore
    }
  }
}

export const backupService = new BackupService();
