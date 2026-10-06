/**
 * Types pour le Bordereau de Paiement des Cotisations CNSS MULT.S
 * PROMPT 08 — Régime Général et Assurance Maladie Obligatoire (AMO)
 * Conforme aux documents administratifs officiels CNSS Maroc (Réf: 511-1-01)
 */

export type CodeRegimePaiement = 'REGIME_GENERAL' | 'AMO';

export type StatutRubriquePaiement = 'CONFIRME' | 'A_CONFIRMER' | 'NON_APPLICABLE';

export type StatutBordereauPaiement = 'BROUILLON' | 'VALIDE' | 'VERROUILLE';

export type NiveauEcartPaiement = 'INFO' | 'WARNING' | 'BLOCKING';

/**
 * Taux officiel ou paramétré d'une cotisation
 */
export interface CnssTauxItem {
  id: string;
  codeRubrique: string;
  libelle: string;
  regime: CodeRegimePaiement;
  tauxTotal: number;      // Taux global en pourcentage (ex: 6.40 pour 6.40%)
  tauxPatronal?: number;  // Part patronale (ex: 8.98)
  tauxSalarial?: number;  // Part salariale (ex: 4.48)
  estPlafonne: boolean;   // Si vrai, plafonné à 6000 MAD par salarié
  plafondMensuel?: number;// 6000 MAD pour Prestations Sociales
  source: string;         // 'Document Officiel CNSS Maroc Réf: 511-1-01'
  confirme: boolean;      // Bloquant si false
  actif: boolean;
  dateEffet?: string;
  formule: string;        // 'assiette * taux'
}

/**
 * Ligne de décompte d'une cotisation sur le bordereau officiel
 */
export interface LigneCotisationBordereau {
  caseNumero: number;     // Numéro de case sur le formulaire officiel (ex: 1, 2, 8)
  codeRubrique: string;   // 'ALLOCATIONS_FAMILIALES', 'PRESTATIONS_SOCIALES', 'TFP', 'AMO_PARTICIPATION', 'AMO_COTISATION'
  libelleFr: string;
  libelleAr: string;
  regime: CodeRegimePaiement;
  assietteAvantPlafond: number;
  assietteRetenue: number; // Après éventuel plafonnement
  taux: number;            // Ex: 6.40
  tauxPatronal?: number;
  tauxSalarial?: number;
  montantCalcule: number;  // Avant arrondi
  montantArrondi: number;  // Arrondi final officiel à 2 décimales
  regleArrondi: string;    // 'Arrondi arithmétique officiel à 2 décimales (au centime)'
  statut: StatutRubriquePaiement;
  sourceRegle: string;
  formule: string;
  salariesConcernesCount: number;
}

/**
 * Cotisation détaillée calculée par salarié individuel (pour traçabilité)
 */
export interface CotisationIndividuelleSalarie {
  salarieId: string;
  nomOfficiel: string;
  cnss: string;
  joursDeclares: number;
  salaireBrutDeclare: number;
  salaireCotisablePlafonne: number; // Plafond 6000 MAD
  cotisationAllocationsFamiliales: number; // 6.40%
  cotisationPrestationsSociales: number;   // 13.46% (sur base plafonnée)
  cotisationTfp: number;                  // 1.60%
  cotisationParticipationAmo: number;     // 1.85%
  cotisationAmo: number;                  // 4.52%
  totalCotisationsSalarie: number;
}

/**
 * Volet de paiement Régime Général (Page 1 Réf 511-1-01)
 */
export interface VoletPaiementRegimeGeneral {
  referenceStructuree: string;
  numeroAffiliation: string;
  agence: string;
  dateEmission: string;
  moisVersement: string;      // Ex: 'août 2026' ou 'septembre 2026'
  aRegulariserAvantLe: string;// Ex: '10/09/2026' ou '10/10/2026'
  masseSalarialeDeclaree: number;
  masseSalarialePlafonnee: number;
  lignes: LigneCotisationBordereau[];
  totalCotisationsVersees: number; // Case 3: C1 + C2
  penalitesCotisations: number;    // Case 4: 0.00
  montantAfReversees: number;      // Case 5: 0.00
  astreintes: number;              // Case 6: 0.00
  taxeFormationProfessionnelle: number; // Case 8: TFP 1.60%
  penalitesTfp: number;            // Case 9: 0.00
  montantGlobalVersement: number;  // Case 10: Total cotisations + TFP
}

/**
 * Volet de paiement Assurance Maladie Obligatoire (Page 2 Réf 511-1-01)
 */
export interface VoletPaiementAmo {
  referenceStructuree: string;
  numeroAffiliation: string;
  agence: string;
  dateEmission: string;
  moisVersement: string;
  aRegulariserAvantLe: string;
  masseSalarialeDeclaree: number;
  lignes: LigneCotisationBordereau[];
  totalCotisationsAmo: number;      // Case 3: C1 + C2
  penalitesAmo: number;             // Case 4: 0.00
  montantGlobalVersementAmo: number;// Case 10: Total AMO
}

/**
 * Écart détecté lors des contrôles croisés
 */
export interface EcartPaiementCnss {
  id: string;
  type: 'REGISTRE_VS_PAIEMENT' | 'DECLARATION_VS_PAIEMENT' | 'TAUX_INVALIDE' | 'ASSIETTE_INVALIDE';
  niveau: NiveauEcartPaiement;
  bloquant: boolean;
  rubrique?: string;
  salarieId?: string;
  nomSalarie?: string;
  valeurAttendue: string | number;
  valeurObtenue: string | number;
  difference?: number;
  message: string;
}

/**
 * Bilan du contrôle croisé (Registre vs Déclaration vs Paiement)
 */
export interface BilanControleCroisePaiement {
  estConforme: boolean;
  totalControles: number;
  totalBloquants: number;
  totalAvertissements: number;
  ecarts: EcartPaiementCnss[];
  concordanceRegistre: boolean;
  concordanceBordereauSalaries: boolean;
  concordanceTaux: boolean;
}

/**
 * Document complet du Bordereau de Paiement des Cotisations CNSS
 */
export interface DocumentBordereauPaiementCnss {
  id: string;
  periodeId: string;
  mois: number;
  annee: number;
  dateCreation: string;
  dateValidation?: string;
  validePar?: string;
  statut: StatutBordereauPaiement;
  verrouille: boolean;
  numeroAffiliation: string;
  agence: string;
  raisonSociale: string;
  
  // Synthèse financière
  nombreSalariesDeclares: number;
  totalJoursDeclares: number;
  masseBruteDeclaree: number;
  masseCotisablePlafonnee: number;
  totalCotisationsRegimeGeneral: number;
  totalCotisationsAmo: number;
  totalGlobalAPayer: number; // Régime Général + AMO
  montantEnToutesLettres: string;
  
  // Volets officiels
  voletRegimeGeneral: VoletPaiementRegimeGeneral;
  voletAmo: VoletPaiementAmo;
  
  // Détail par salarié pour audit
  cotisationsSalaries: CotisationIndividuelleSalarie[];
  
  // Contrôle croisé
  controleCroise: BilanControleCroisePaiement;
  
  // Versionnage et audit
  versionRegles: string;
  hash: string;
  auditId?: string;
  justificationReouverture?: string;
}
