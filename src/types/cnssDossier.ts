/**
 * Types pour le Dossier CNSS Mensuel Final MULT.S
 * PROMPT 09 — Contrôle Global, Clôture, Archivage, Versionnage et Traçabilité
 *
 * RÈGLE FONDAMENTALE :
 * Le dossier mensuel est une agrégation en lecture seule des modules validés :
 * Registre CNSS (06), Bordereau Salariés (07-B), Bordereau Paiement (08), Audit (04/05).
 * Ne modifie jamais les données sources.
 */

import { StatutPeriode } from './cnss';

export type StatutDossierCnss =
  | 'BROUILLON'
  | 'A_CONTROLER'
  | 'PRET_A_VALIDER'
  | 'VALIDE'
  | 'CLOTURE';

export type CategorieChecklistDossier =
  | 'IDENTIFICATION'
  | 'REGISTRE'
  | 'DECLARATION'
  | 'PAIEMENT'
  | 'FINAL';

export interface ItemChecklistDossier {
  id: string;
  categorie: CategorieChecklistDossier;
  libelle: string;
  estValide: boolean;
  bloquant: boolean;
  messageDetail?: string;
  lienVue?: 'REGISTRE' | 'BORDEREAU' | 'PAIEMENT' | 'ANOMALIES' | 'NOUVEAUX' | 'SORTIES' | 'RAPPROCHEMENT';
}

export interface LigneControleTripartite {
  id: string;
  libelle: string;
  sourceA: string; // Ex: 'Registre CNSS'
  sourceB: string; // Ex: 'Bordereau Déclaration (07-B)'
  sourceC: string; // Ex: 'Bordereau Paiement (08)'
  valeurA: string | number;
  valeurB: string | number;
  valeurC: string | number;
  estConforme: boolean;
  bloquant: boolean;
  difference?: string;
  details: string;
}

export interface ControleTripartiteFinal {
  estConforme: boolean;
  totalControles: number;
  totalBloquants: number;
  controles: LigneControleTripartite[];
}

export interface VersionHistoriqueDossier {
  numeroVersion: number;
  dateCreation: string;
  dateValidation?: string;
  dateCloture?: string;
  validePar?: string;
  cloturePar?: string;
  statut: StatutDossierCnss;
  hash: string;
  motifReouverture?: string;
  reouvertPar?: string;
  dateReouverture?: string;
  totalSalaries: number;
  totalGlobalAPayer: number;
}

export interface ResumeFinancierDossier {
  totalSalaries: number;
  nombreEntrants: number;
  nombreSortants: number;
  totalJoursDeclares: number;
  masseBruteDeclaree: number;
  masseCotisablePlafonnee: number;
  totalCotisationsRegimeGeneral: number;
  totalCotisationsAmo: number;
  totalGlobalAPayer: number;
  montantEnToutesLettres: string;
}

export interface DocumentDossierCnssItem {
  id: string;
  type:
    | 'REGISTRE'
    | 'BORDEREAU_SALARIES'
    | 'BORDEREAU_ENTRANTS'
    | 'BORDEREAU_PAIEMENT'
    | 'CONTROLE_CROISE'
    | 'RAPPORT_ANOMALIES'
    | 'JOURNAL_AUDIT';
  libelle: string;
  referenceOfficielle?: string;
  dateGeneration: string;
  estGenere: boolean;
  estVerrouille: boolean;
  hash?: string;
}

export interface DossierCnssMensuel {
  id: string;
  periodeId: string;
  mois: number;
  annee: number;
  numeroAffiliation: string;
  agence: string;
  raisonSociale: string;
  adresse: string;
  statut: StatutDossierCnss;
  versionCourante: number;
  version?: number; // alias de commodité
  versionsHistorique: VersionHistoriqueDossier[];
  historiqueVersions?: any[]; // alias de commodité
  registreHash: string;
  bordereauDeclarationHash: string;
  bordereauPaiementHash: string;
  dossierHash: string;
  dateCreation: string;
  dateValidation?: string;
  dateCloture?: string;
  validePar?: string;
  cloturePar?: string;
  resume: ResumeFinancierDossier;
  controleTripartite: ControleTripartiteFinal;
  checklist: ItemChecklistDossier[];
  documents: DocumentDossierCnssItem[];
  motifsBlocageValidation: string[];
  auditId?: string;
  justificationReouverture?: string;
  entreprise?: any; // alias de commodité
  synthese?: any; // alias de commodité
  piecesJointes?: any[]; // alias de commodité
  journalAuditDossier?: any[]; // alias de commodité
}
