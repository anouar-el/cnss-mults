/**
 * Modèles de données stricts pour CNSS MULT.S - PROMPT 03
 */

export type SituationEmploye =
  | 'ACTIF'
  | 'SORTI'
  | 'ENTRANT'
  | 'A_VERIFIER'
  | 'À_VÉRIFIER'
  | 'NOUVEAU'
  | 'INACTIF'
  | 'ACCIDENT_TRAVAIL'
  | 'MALADIE'
  | 'CONGE_MATERNITE'
  | 'SUSPENDU'
  | string;

export interface SalarieReferentiel {
  id: string;
  immatriculationCnss?: string;
  cnss?: string; // alias de commodité
  cni?: string;
  nomComplet: string;
  nom?: string; // alias de commodité
  prenom?: string; // alias de commodité
  actif?: boolean; // alias de commodité
  nomNormalise: string;
  tokensNom: string[];
  aliases: string[];
  situation?: SituationEmploye;
  situationOriginale?: string; // Ex: 'so', 'AT'
  datePremiereApparition?: string;
  derniereDeclaration?: string;
}

export interface LignePaieImportee {
  id: string;
  nomCompletBrut: string;
  nomNormalise: string;
  tokensNom: string[];
  
  // Cette valeur originale ne doit JAMAIS être modifiée après import
  joursImportes: number;

  cniImportee?: string;
  cnssImportee?: string;

  // Ces champs ne doivent JAMAIS être modifiés après import
  salaireBase?: number;
  salaireBrut?: number;

  ligneFichier?: number;
  sourceFichier?: string;
  nomFichierSource?: string;
  situationImportee?: string;
  clientImporte?: string;
}

export interface ValidationJours {
  joursImportes: number;       // Valeur originale STRICTEMENT IMMUABLE
  joursDeclares?: number;      // Valeur destinée à la déclaration CNSS après décision humaine
  modifieManuellement: boolean;
  validationEffectuee: boolean;
  justification?: string;
  dateValidation?: string;
  ancienneValeurDeclaree?: number;
}

export type StatutRapprochement =
  | 'CORRESPONDANCE_CNI'
  | 'CORRESPONDANCE_CNSS'
  | 'CORRESPONDANCE_ALIAS'
  | 'CORRESPONDANCE_TOKEN_SORT'
  | 'CORRESPONDANCE_FUZZY'
  | 'NON_IDENTIFIE'
  | 'MANUEL';

export type StatutValidationRapprochement =
  | 'AUTOMATIQUE'
  | 'A_VALIDER'
  | 'VALIDE'
  | 'REJETE';

export type StatutLigneP5 =
  | 'IDENTIFIE'
  | 'A_VALIDER'
  | 'AMBIGU'
  | 'NON_IDENTIFIE'
  | 'NOUVEAU_CONFIRME'
  | 'SORTI_A_ARBITRER'
  | 'ANOMALIE_BLOQUANTE';

export type MethodeRapprochement =
  | 'CNI_EXACTE'
  | 'CNSS_EXACTE'
  | 'ALIAS_VALIDE'
  | 'NOM_NORMALISE_EXACT'
  | 'TOKEN_SORT'
  | 'FUZZY'
  | 'MANUEL'
  | 'AUCUNE';

export interface CandidatRapprochement {
  salarie: SalarieReferentiel;
  score: number;
  methode?: MethodeRapprochement;
  raison?: string;
  ecartAvecPremier?: number;
}

export interface ResultatRapprochement {
  id: string;
  lignePaieId: string;
  salarieBaseId?: string;

  score: number;
  secondScore?: number;
  ecartScore?: number;

  statut: StatutRapprochement;
  statutP5?: StatutLigneP5;
  methode?: MethodeRapprochement;
  explication: string;

  validation: StatutValidationRapprochement;
  enregistrerCommeAlias: boolean;

  salariePropose?: SalarieReferentiel;
  candidatsAmbigus?: Array<{ salarie: SalarieReferentiel; score: number; raison: string }>;
  candidats?: CandidatRapprochement[];
  estAmbigu?: boolean;

  // Gestion découplée des jours (Section 1)
  validationJours: ValidationJours;

  // Décisions et statuts PROMPT 02 & PROMPT 03
  estMarqueNouveau?: boolean;
  decisionSorti?: 'REACTIVATION_CONFIRMEE' | 'CONSERVE_SORTI';
  dateDecision?: string;
  dateRapprochement?: string;
  valideParHumain?: boolean;
  dateValidation?: string;
  justification?: string;
  historique?: HistoriqueDecision[];
  nomDeclareFinal?: string;
  cniDeclareeFinale?: string;
  cnssDeclareeFinale?: string;
  situationImportee?: string;
}

export interface HistoriqueDecision {
  id: string;
  lignePaieId: string;
  dateHeure: string;
  typeValidation:
    | 'VALIDATION_AUTOMATIQUE'
    | 'VALIDATION_RAPIDE'
    | 'VALIDATION_FUZZY'
    | 'MANUELLE'
    | 'CONFIRME_NOUVEAU'
    | 'REACTIVATION_SORTI'
    | 'CONSERVE_SORTI'
    | 'CORRECTION_JOURS'
    | 'REJET';
  ancienStatut: string;
  nouveauStatut: string;
  salarieSelectionneId?: string;
  nomSalarieSelectionne?: string;
  aliasCree?: string;
  commentaire?: string;
}

export type CodeAnomalie =
  | 'JOURS_NEGATIFS'          // Bloquante
  | 'JOURS_SUPERIEURS_26'     // Bloquante
  | 'JOURS_ZERO'              // Avertissement
  | 'JOURS_MANQUANTS'         // Bloquante (NaN, vide, texte)
  | 'CNI_MANQUANTE'           // Avertissement / Bloquante
  | 'CNSS_MANQUANTE'          // Avertissement
  | 'DOUBLON_CNI'
  | 'DOUBLON_CNSS'
  | 'CORRESPONDANCE_AMBIGUE'  // Bloquante
  | 'SALARIE_NON_IDENTIFIE'   // Bloquante
  | 'SALARIE_SORTI_AVEC_JOURS'; // Avertissement

export type SeveriteAnomalie = 'BLOQUANTE' | 'AVERTISSEMENT' | 'INFO';

export interface AnomalieLigne {
  id: string;
  salarieConcerne: string;
  ligneConcernee?: number;
  lignePaieId?: string;
  code: CodeAnomalie;
  gravite: SeveriteAnomalie;
  message: string;
  valeurOriginale: string | number;
  valeurSuggeree?: string | number;
  estResolue: boolean;
  actionResolution?: string;
  justificationResolution?: string;
  dateResolution?: string;
}

export interface AliasItem {
  id: string;
  aliasBrut: string;
  aliasNormalise?: string;
  nomDeclare?: string; // alias de commodité
  salarieId: string;
  nomOfficielSalarie: string;
  nomOfficiel?: string; // alias de commodité
  cniSalarie?: string;
  cnssSalarie?: string;
  dateCreation: string;
  creeParMois?: string;
  creePar?: string; // alias de commodité
}

export interface SortieItem {
  salarieId: string;
  salarie: SalarieReferentiel;
  situationPrecedente: string;
  derniersJours?: number;
  statutSortie: 'A_CONFIRMER' | 'SORTIE_CONFIRMEE' | 'MAINTENU_ACTIF';
  motif: string;
  dateDecision?: string;
  justification?: string;
}

export interface EvenementAudit {
  id: string;
  date: string;
  horodatage?: string; // alias de commodité
  action: string;
  categorie?: string;
  typeEvenement?: string;
  statut?: string;
  periodeConcernee?: string;
  valeurApres?: string;
  salarie?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  justification?: string;
  utilisateur?: string;
  auteur?: string;
  moisId?: string;
  description?: string;
  details?: string;
  typeAction?: string;
}

export type StatutPeriode =
  | 'BROUILLON'               // Traitement en cours
  | 'A_VERIFIER'              // Décisions restantes
  | 'IMPORTE'                 // Données importées
  | 'RAPPROCHE'               // Rapprochement calculé
  | 'A_CONTROLER'             // Anomalies à arbitrer
  | 'PRET_POUR_DECLARATION'   // Aucune anomalie bloquante
  | 'VALIDE'                  // Validé par le gestionnaire
  | 'CLOTURE';                // Période verrouillée

export interface BilanControlePret {
  estPret: boolean;
  statut: 'PRET' | 'NON_PRET';
  blocages: string[];
  avertissements: string[];
  totalBloquantes: number;
  totalAvertissements: number;
}

// =========================================================================
// TYPES PROMPT 06 — REGISTRE MENSUEL CNSS & CONSOLIDATION
// =========================================================================

export type StatutLigneRegistre =
  | 'BROUILLON'      // Registre créé mais pas entièrement contrôlé
  | 'A_COMPLETER'    // Information obligatoire manquante (CNI, CNSS)
  | 'A_CORRIGER'     // Anomalie nécessitant une décision ou réouverture
  | 'BLOQUE'         // Impossibilité de préparer la ligne (ambigu, non identifié, etc.)
  | 'PRET'           // Toutes les conditions sont remplies pour la déclaration
  | 'VALIDE';        // Ligne validée et verrouillée pour déclaration

export interface CorrectionRegistre {
  id: string;
  champ: 'jours' | 'base' | 'salaireBrut' | 'cni' | 'cnss' | 'salarie';
  ancienneValeur: string | number;
  nouvelleValeur: string | number;
  motif: string;
  date: string;
  auteur: string;
}

export interface LigneRegistreCnss {
  id: string;
  periodeId: string;
  lignePaieId: string;
  sourceFileId?: string;
  numeroLigneSource?: number;
  salarieId?: string;
  nomSource: string;
  nomOfficiel: string;
  cni: string;
  cnss: string;
  joursImportes: number;
  joursDeclares: number;
  baseImportee: number;
  baseDeclaree: number;
  salaireBrutImporte: number;
  salaireBrutDeclare: number;
  situation: SituationEmploye | 'ACTIF' | 'SORTI' | 'ENTRANT' | 'NOUVEAU' | 'INCONNU' | string;
  situationOriginale?: string;
  statutRapprochement: StatutRapprochement | StatutLigneP5;
  statut: StatutLigneRegistre;
  anomalies: AnomalieLigne[];
  corrections: CorrectionRegistre[];
  motifsBlocage: string[];
  derniereModification: string;
  valide: boolean;
  dateValidation?: string;
  verrouille: boolean;
  dateVerrouillage?: string;
  justificationReouverture?: string;
}

export interface BilanRegistreMensuel {
  pret: boolean;
  total: number;
  prets: number;
  valides: number;
  bloques: number;
  aCompleter: number;
  aCorriger: number;
  avecAnomalies: number;
  avecCorrections: number;
  erreurs: string[];
  avertissements: string[];
}

// =========================================================================
// TYPES PROMPT 04 — IMPORT EXCEL, MAPPING ET WORKFLOW MENSUEL
// =========================================================================

export type ChampMappeType =
  | 'nomComplet'
  | 'joursTravailles'
  | 'salaireBase'
  | 'salaireBrut'
  | 'cni'
  | 'cnss'
  | 'situation'
  | 'client'
  | 'ignorer';

export interface MappingColonne {
  colonneSource: string;
  champCible: ChampMappeType;
  confiance: 'AUTOMATIQUE' | 'MANUEL';
  apercuValeurs: string[];
}

export interface AnalyseFichierExcel {
  nomFichier: string;
  taille: number;
  dateDerniereModif: string;
  feuilles: string[];
  feuilleSelectionnee: string;
  lignesBrutes: any[];
  entetesDetectees: string[];
  mappings: MappingColonne[];
  lignesPrevisualisation: Record<string, any>[];
  totalLignesDetectees: number;
  lignesValidesCount: number;
  lignesIgnoreesTotalCount: number;
  lignesAnomaliesCount: number;
  doublonsDetectes: Array<{
    ligne: number;
    nom: string;
    cni?: string;
    cnss?: string;
    motif: string;
  }>;
}

export interface PeriodeMensuelle {
  idMois: string;             // Ex: "2026-09", "2026-10"
  id?: string;                // alias de commodité (id === idMois)
  libelle: string;            // Ex: "Septembre 2026", "Octobre 2026"
  statut: StatutPeriode;
  etapeWorkflow: number;      // 1 à 10
  dateCreation: string;
  dateDerniereModification?: string;
  dateCloture?: string;       // alias de commodité
  annee?: number;             // alias de commodité
  mois?: number;              // alias de commodité
  nomFichierPaie?: string;
  tailleFichierPaie?: number;
  feuillePaie?: string;
  lignesPaieCount: number;
  salariesDeclaresCount?: number;
  justificationCloture?: string;
}

export interface ResultatImportBaseCnss {
  lignesImportees: number;
  salariesExistants: number;
  nouveauxSalaries: Array<{
    nomComplet: string;
    cni?: string;
    cnss?: string;
    situation?: SituationEmploye;
    situationOriginale?: string;
  }>;
  modificationsDetectees: Array<{
    salarieId: string;
    nom: string;
    champ: string;
    ancienneValeur: string;
    nouvelleValeur: string;
  }>;
  doublonsDetectes: Array<{
    identifiant: string;
    type: 'CNI' | 'CNSS' | 'NOM';
    lignes: number[];
  }>;
  anomaliesDetectees: Array<{
    ligne: number;
    nom: string;
    motif: string;
  }>;
}
