/**
 * Modèles de données pour le module de Backup, Restauration, Archivage
 * et Reprise Après Sinistre - PROMPT 11
 */

import {
  SalarieReferentiel,
  AliasItem,
  EvenementAudit,
  PeriodeMensuelle,
  LigneRegistreCnss,
  LignePaieImportee,
  ResultatRapprochement,
} from './cnss';
import { EntrepriseCnssConfig, DocumentBordereauCnss } from './cnssBordereau';
import { DocumentBordereauPaiementCnss, CnssTauxItem } from './cnssPaiement';
import { DossierCnssMensuel } from './cnssDossier';

export type TypeBackup = 'FULL' | 'PERIOD_ARCHIVE' | 'PRE_RESTORE';

export interface MultsCnssBackupMetadata {
  totalPeriodes: number;
  totalSalaries: number;
  totalAudits: number;
  totalDossiers: number;
  periodesCloturees: string[];
  tailleEstimeeOctets?: number;
  exportePar?: string;
  sourceSysteme?: string;
}

export interface MultsCnssBackupIntegrity {
  contentHash: string; // SHA-256 du contenu canonicalisé
  algorithm: 'SHA-256';
  signatureVersion: string;
}

/**
 * Charge utile de données pures dont le contenu est soumis au hash cryptographique.
 * L'absence de champs dynamiques (backupId, createdAt) dans le payload canonicalisé
 * garantit l'idempotence stricte du hash de contenu (Content Hash déterministe).
 */
export interface MultsCnssBackupPayload {
  company: EntrepriseCnssConfig;
  periods: PeriodeMensuelle[];
  employees: SalarieReferentiel[];
  aliases: AliasItem[];
  decisionsSorties: Record<string, 'SORTIE_CONFIRMEE' | 'MAINTENU_ACTIF'>;
  lignesPaie: Record<string, LignePaieImportee[]>;
  rapprochements: Record<string, ResultatRapprochement[]>;
  registers: Record<string, LigneRegistreCnss[]>;
  declarations: Record<string, DocumentBordereauCnss>;
  payments: Record<string, DocumentBordereauPaiementCnss>;
  dossiers: Record<string, DossierCnssMensuel>;
  audits: EvenementAudit[];
  configurations: {
    taux?: CnssTauxItem[];
    moisActif?: string;
  };
}

/**
 * Modèle complet de fichier de sauvegarde (.mcnss)
 */
export interface MultsCnssBackup {
  formatVersion: '1.0';
  applicationVersion: string;
  backupId: string;
  backupType: TypeBackup;
  targetPeriodId?: string; // Spécifié si PERIOD_ARCHIVE
  createdAt: string; // ISO 8601
  company: EntrepriseCnssConfig;
  periods: PeriodeMensuelle[];
  employees: SalarieReferentiel[];
  aliases: AliasItem[];
  decisionsSorties: Record<string, 'SORTIE_CONFIRMEE' | 'MAINTENU_ACTIF'>;
  lignesPaie: Record<string, LignePaieImportee[]>;
  rapprochements: Record<string, ResultatRapprochement[]>;
  registers: Record<string, LigneRegistreCnss[]>;
  declarations: Record<string, DocumentBordereauCnss>;
  payments: Record<string, DocumentBordereauPaiementCnss>;
  dossiers: Record<string, DossierCnssMensuel>;
  audits: EvenementAudit[];
  configurations: {
    taux?: CnssTauxItem[];
    moisActif?: string;
  };
  metadata: MultsCnssBackupMetadata;
  integrity: MultsCnssBackupIntegrity;
}

export interface ValidationBackupResult {
  valide: boolean;
  codeErreur?:
    | 'FORMAT_INVALIDE'
    | 'VERSION_INCOMPATIBLE'
    | 'JSON_CORROMPU'
    | 'HASH_INVALID'
    | 'DONNEES_MANQUANTES'
    | 'STRUCTURE_INCORRECTE';
  message: string;
  details?: Record<string, any>;
}

export interface ApercuBackup {
  backupId: string;
  backupType: TypeBackup;
  targetPeriodId?: string;
  createdAt: string;
  formatVersion: string;
  applicationVersion: string;
  raisonSociale: string;
  numeroAffiliation: string;
  totalPeriodes: number;
  periodes: string[];
  periodesCloturees: string[];
  totalSalaries: number;
  totalAliases: number;
  totalAudits: number;
  totalDossiers: number;
  contentHash: string;
  tailleOctets: number;
  statutIntegrite: 'VALIDE' | 'CORROMPU' | 'NON_VERIFIE';
  conflitsPotentiels: string[];
}

export interface ConflitPeriodeDetail {
  periodeId: string;
  statutActuel: string;
  statutBackup: string;
  dateClotureActuelle?: string;
  dateClotureBackup?: string;
  dossierPresentActuel: boolean;
  dossierPresentBackup: boolean;
}

export interface RestoreOptions {
  ecraserConflits?: boolean;
  utilisateur?: string;
  ignorerAuditInterne?: boolean;
}

export interface RestoreResult {
  succes: boolean;
  statut: 'RESTAURATION_COMPLETE' | 'CONFLIT_PERIODE' | 'RESTAURATION_REFUSEE' | 'ROLLBACK_EFFECTUE';
  message: string;
  preRestoreBackupId?: string;
  details?: {
    periodesRestaurees: number;
    salariesRestaures: number;
    dossiersRestaures: number;
    conflits?: ConflitPeriodeDetail[];
    integriteApresRestauration?: boolean;
    anomaliesIntegrite?: string[];
  };
}

export interface EtatSnapshot {
  nombrePeriodes: number;
  periodesIds: string[];
  nombreSalaries: number;
  nombreAliases: number;
  nombreAudits: number;
  nombreRegistres: number;
  nombreDossiers: number;
  dossiersHashes: Record<string, string>;
  contentHash: string;
}

export interface GlobalIntegrityReport {
  valide: boolean;
  statut: 'INTEGRITY_CHECK_OK' | 'INTEGRITY_CHECK_FAILED';
  dateControle: string;
  anomalies: string[];
  details: {
    totalPeriodes: number;
    periodesValides: number;
    totalSalaries: number;
    totalAliases: number;
    totalAudits: number;
    totalDossiers: number;
    dossiersInviolables: number;
    referencesCroiseesValides: boolean;
  };
}

export interface ItemHistoriqueBackup {
  id: string;
  type: TypeBackup;
  targetPeriodId?: string;
  dateCreation: string;
  tailleOctets: number;
  contentHash: string;
  statut: 'VALIDE' | 'CORROMPU' | 'RESTAURE';
  description: string;
}
