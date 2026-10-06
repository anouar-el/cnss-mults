/**
 * Types pour la Génération du Bordereau de Déclaration des Salariés CNSS MULT.S
 * PROMPT 07-B — Conforme aux documents administratifs officiels CNSS Maroc :
 * 1. Bordereau de Déclaration des Salariés (Formulaire F.212-2-58)
 * 2. Bordereau de Déclaration des Salariés Entrants (Formulaire F.212-2-59)
 *
 * RÈGLE FONDAMENTALE :
 * Projection en lecture seule du Registre CNSS validé.
 * Séparation stricte : Le bordereau de paiement des cotisations est un module séparé.
 */

import { SituationEmploye } from './cnss';

/**
 * Configuration de l'entreprise pour la déclaration CNSS
 */
export interface EntrepriseCnssConfig {
  raisonSociale: string;
  numeroAffiliation: string; // Ex: '6541835'
  agence: string;            // Ex: 'SIDI BELYOUT'
  adresse: string;           // Ex: '77 RUE MOHAMED SMIHA ETG 10 N 57'
  ville: string;             // Ex: 'CASABLANCA'
  codeFormulaireOrdinaires: string; // 'F.212-2-58'
  codeFormulaireEntrants: string;   // 'F.212-2-59'
  lignesParPage: number;     // Défaut: 12 lignes par page
}

/**
 * Classification métier d'une ligne du registre pour la ventilation
 */
export type CategorieSalarieBordereau =
  | 'SALARIE_ORDINAIRE' // Déclaré sur F.212-2-58
  | 'SALARIE_ENTRANT'   // Déclaré sur F.212-2-59 (CNI obligatoire)
  | 'SALARIE_SORTANT'   // Déclaré sur F.212-2-58 avec code situation 'SO'
  | 'SALARIE_A_EXAMINER'; // Non résolu -> BLOQUANT

/**
 * Ligne du Bordereau des Salariés Ordinaires (F.212-2-58)
 */
export interface LigneBordereauOrdinaire {
  index: number;
  ligneRegistreId: string;
  numeroImmatriculation: string; // 9 chiffres CNSS
  nomPrenom: string;
  nombreJours: number;          // Issu STRICTEMENT de joursDeclares
  situation: string;            // Vide si normal, 'SO' si sorti, 'AT' si accident...
  situationLibelle?: string;
}

/**
 * Ligne du Bordereau des Salariés Entrants (F.212-2-59)
 */
export interface LigneBordereauEntrant {
  index: number;
  ligneRegistreId: string;
  numeroImmatriculation: string; // 9 chiffres CNSS
  nomPrenom: string;
  cni: string;                  // OBLIGATOIRE pour les entrants
  nombreJours: number;          // Issu STRICTEMENT de joursDeclares
}

/**
 * Page du Bordereau des Salariés Ordinaires
 */
export interface PageBordereauOrdinaire {
  numeroPage: number;
  totalPages: number;
  lignes: LigneBordereauOrdinaire[];
  totalJoursPage: number;
  totalJoursCumulePrecedents: number;
  totalJoursCumuleGlobal: number;
}

/**
 * Page du Bordereau des Salariés Entrants
 */
export interface PageBordereauEntrant {
  numeroPage: number;
  totalPages: number;
  lignes: LigneBordereauEntrant[];
  totalJoursPage: number;
  totalJoursCumulePrecedents: number;
  totalJoursCumuleGlobal: number;
}

/**
 * Bordereau des Salariés Ordinaires consolidé
 */
export interface BordereauOrdinaires {
  numeroAffiliation: string;
  agence: string;
  mois: number;
  annee: number;
  dateEmission: string;
  referenceStructuree: string;
  pages: PageBordereauOrdinaire[];
  totalSalaries: number;
  totalJours: number;
  codeFormulaire: string;
}

/**
 * Bordereau des Salariés Entrants consolidé
 */
export interface BordereauEntrants {
  numeroAffiliation: string;
  agence: string;
  mois: number;
  annee: number;
  dateEmission: string;
  pages: PageBordereauEntrant[];
  totalSalaries: number;
  totalJours: number;
  codeFormulaire: string;
}

/**
 * Statut du document généré
 */
export type StatutDocumentBordereau =
  | 'BROUILLON'    // Généré, modifiable si registre réouvert
  | 'VALIDE'       // Validé formellement par l'utilisateur
  | 'VERROUILLE';  // Verrouillé et scellé pour archivage

/**
 * Document complet du Bordereau CNSS MULT.S
 */
export interface DocumentBordereauCnss {
  idExport: string;
  periodeId: string;
  mois: number;
  annee: number;
  dateCreation: string;
  utilisateur: string;
  entreprise: EntrepriseCnssConfig;
  referenceStructuree: string;
  
  // Statistiques
  nombreSalariesOrdinaires: number;
  nombreSalariesEntrants: number;
  totalSalariesDeclares: number;
  totalJoursDeclares: number;
  
  // Pagination
  nombrePagesOrdinaires: number;
  nombrePagesEntrants: number;
  totalPages: number;
  
  // Contenus
  bordereauOrdinaires: BordereauOrdinaires;
  bordereauEntrants: BordereauEntrants;
  
  // Intégrité & Audit
  statut: StatutDocumentBordereau;
  hash: string;
  versionGenerateur: string;
  auditId?: string;
  dateValidation?: string;
  validePar?: string;
}

/**
 * Rapport d'éligibilité avant génération
 */
export interface BilanEligibiliteBordereau {
  estEligible: boolean;
  totalLignesControlees: number;
  totalOrdinaires: number;
  totalEntrants: number;
  totalSortants: number;
  bloquants: string[];
  avertissements: string[];
  detailsErreurs: Array<{
    ligneRegistreId?: string;
    nom?: string;
    champ?: string;
    motif: string;
  }>;
}
