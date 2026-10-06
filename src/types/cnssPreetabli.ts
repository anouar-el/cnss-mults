/**
 * Types pour l'Import, l'Analyse et le Rapprochement du Préétabli CNSS / BDS - PROMPT 07-BIS
 * Respect strict du principe : Conservation du fichier original en lecture seule,
 * détection de structure sans supposition, et séparation stricte entre données observées et inférences.
 */

export type CertitudeChamp =
  | 'CONFIRMÉ'     // Vérifié par documentation officielle ou alignement parfait
  | 'PROBABLE'     // Forte cohérence statistique avec le référentiel MULT.S
  | 'À_CONFIRMER'  // Segment identifié mais signification à valider
  | 'INCONNU';     // Segment technique non encore interprété

export type StatutRapprochementPreetabli =
  | 'NON_ANALYSE'
  | 'ANALYSE'
  | 'IDENTIFIE'
  | 'A_VALIDER'
  | 'AMBIGU'
  | 'NON_IDENTIFIE'
  | 'INCOHERENT'
  | 'VALIDÉ';

export type TypeEnregistrementCode =
  | 'ENTETE_EMPLOYEUR'
  | 'PERIODE'
  | 'SALARIE'
  | 'MOUVEMENT'
  | 'TOTAL_CONTROLE'
  | 'FIN_FICHIER'
  | 'INCONNU';

export interface TypeEnregistrementPreetabli {
  code: TypeEnregistrementCode;
  positionCode?: number;
  longueur?: number;
  occurrences: number;
  exempleAnonymise: string;
  statutComprehension: 'CONFIRMÉ' | 'PROBABLE' | 'À_CONFIRMER';
  description: string;
}

export interface LignePreetabliOriginale {
  numeroLigne: number;
  contenuOriginal: string; // STRICT : pas de trim() définitif, préserve les espaces d'origine
  longueur: number;
  typeEnregistrement: TypeEnregistrementCode;
  caracteresSpeciaux: string[];
  hash?: string;
}

export interface ChampCandidat {
  id: string;
  nomTechniqueProvisoire: string; // Ex: CNSS_CANDIDAT, CNI_CANDIDATE, NOM_CANDIDAT, etc.
  positionDebut: number; // 1-indexé (position de départ dans la ligne)
  positionFin: number;   // 1-indexé inclus
  longueur: number;
  type: 'TEXTE' | 'NUMERIQUE' | 'DECIMAL' | 'DATE';
  valeurExemple: string;
  frequence: number;
  interpretation: string;
  certitude: CertitudeChamp;
}

export interface FichierPreetabliCnss {
  id: string;
  nomFichier: string;
  taille: number; // en octets
  extension: string;
  dateImport: string;
  hash: string;
  encodage: string;
  nombreLignes: number;
  longueurMin: number;
  longueurMax: number;
  longueurDominante: number;
  lignesOriginales: LignePreetabliOriginale[];
  periodeDetectee?: string;
  employeurDetecte?: {
    numAffiliation?: string;
    nomEmployeur?: string;
    statut: 'CONFIRME' | 'EMPLOYEUR_CNSS_A_COMPLETER';
  };
  statutAnalyse: 'BRUT' | 'STRUCTURE_DETECTEE' | 'RAPPROCHE' | 'A_CONFIRMER';
  estFixtureTest?: boolean;
}

export type DifferenceCategorie =
  | 'IDENTIQUE'
  | 'DIFFÉRENT'
  | 'MANQUANT_PRÉÉTABLI'
  | 'MANQUANT_REGISTRE'
  | 'NON_INTERPRÉTÉ';

export interface DifferenceDetail {
  champ: 'CNSS' | 'CNI' | 'NOM' | 'JOURS' | 'MONTANT' | 'SITUATION' | 'PERIODE';
  valeurPreetabli: any;
  valeurRegistre: any;
  categorie: DifferenceCategorie;
  message: string;
}

export interface DecisionHumainePreetabli {
  date: string;
  auteur: string;
  action: 'VALIDER' | 'IGNORER' | 'ASSOCIER_SALARIE' | 'MARQUER_NOUVEAU';
  salarieCibleId?: string;
  motif?: string;
}

export interface RapprochementPreetabli {
  id: string;
  numeroLignePreetabli: number;
  lignePreetabliId: string;
  preetabliCnss?: string;
  preetabliCni?: string;
  preetabliNom?: string;
  preetabliJours?: number;
  preetabliMontant?: number;
  preetabliSituation?: string;
  salarieId?: string;
  registreLigneId?: string;
  score: number; // 0 à 100
  methode:
    | 'CNSS_EXACT'
    | 'CNI_EXACT'
    | 'ALIAS'
    | 'NOM_NORMALISE'
    | 'TOKEN_SORT'
    | 'FUZZY'
    | 'AUCUNE'
    | 'ARBITRAGE_MANUEL';
  statut: StatutRapprochementPreetabli;
  candidats: Array<{
    salarieId: string;
    nom: string;
    cni?: string;
    cnss?: string;
    score: number;
  }>;
  ecartScore: number;
  anomalies: string[];
  differences: DifferenceDetail[];
  valideParHumain: boolean;
  decisionHumaine?: DecisionHumainePreetabli;
}

export interface BilanAnalysePreetabli {
  totalLignes: number;
  lignesParLongueur: Record<number, number>;
  lignesParType: Record<string, number>;
  lignesSuspectes: number;
  lignesVides: number;
  doublonsExacts: number;
  caracteresInhabituels: string[];
  totalPreetabliSalaries: number;
  totalIdentifies: number;
  totalAValider: number;
  totalAmbigus: number;
  totalNonIdentifies: number;
  totalIncoherents: number;
  totalValides: number;
  totalPresentsPreetabliNonRegistre: number; // Présents préétabli, absents registre
  totalNouveauxAExaminer: number;            // Présents registre MULT.S, absents préétabli
  totalDifferencesJours: number;
  totalDifferencesMontants: number;
}
