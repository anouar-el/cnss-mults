/**
 * Spécifications Techniques et Types pour l'Export CNSS / Damancom - PROMPT 07-A
 * Documente strictement la séparation entre le Registre interne MULT.S et les formats cibles officiels.
 * Respecte la règle d'or : Ne rien inventer — marquer toute information non confirmée.
 */

export type StatutCertitude =
  | 'CONFIRME'            // Vérifié par documentation officielle CNSS / Damancom
  | 'SOURCE_SECONDAIRE'   // Émis par éditeur de paie ou pratique métier marocaine
  | 'A_CONFIRMER'         // Hypothèse technique nécessitant validation client/CNSS
  | 'NON_DOCUMENTEE';     // Non précisé par les sources disponibles

export type FormatCibleDeclaration =
  | 'EDI_TXT_BDS_260'     // Fichier plat .txt longueur 260 caractères (Bordereau Déclaration Salaires)
  | 'EFI_SAISIE_WEB'      // Saisie / télédéclaration directe sur le portail Damancom
  | 'BDSE_ENTRANTS_512'   // Formulaire Réf. 512-1-10 pour salariés entrants sans immatriculation
  | 'CSV_INTERNE_AUDIT';  // Fichier CSV de contrôle interne MULT.S (hors format officiel)

/**
 * Codes officiels de situation CNSS Maroc (Confirmés par guides utilisateurs et pratique CNSS)
 */
export type CodeSituationCnss =
  | ''     // Normal / Actif sans particularité
  | 'SO'   // Sortant (Fin de contrat, démission, licenciement)
  | 'CO'   // Congé sans solde
  | 'MS'   // Maintenu sans salaire
  | 'AT'   // Accident de travail
  | 'MP'   // Maladie professionnelle
  | 'ML'   // Maladie ordinaire
  | 'MT'   // Maternité
  | 'DE';  // Décédé

export interface DefinitionChampExport {
  position?: number;
  champOfficiel: string;
  type: 'TEXTE' | 'NUMERIQUE' | 'DECIMAL' | 'DATE';
  obligatoire: boolean;
  formatAttendu: string;
  longueurFixe?: number;
  longueurMax?: number;
  sourceRegistreMultS: string;
  transformationRequise: string;
  regleValidation: string;
  statutCertitude: StatutCertitude;
  remarques: string;
}

export type CodeErreurExport =
  | 'CNSS_MANQUANT'
  | 'CNI_MANQUANTE'
  | 'SALARIE_NON_IDENTIFIE'
  | 'CORRESPONDANCE_AMBIGUE'
  | 'SALARIE_BLOQUE'
  | 'SALARIE_A_COMPLETER'
  | 'SALARIE_A_CORRIGER'
  | 'NOUVEAU_NON_CONFIRME'
  | 'SORTI_NON_ARBITRE'
  | 'JOURS_INVALIDES'
  | 'MONTANT_INVALIDE'
  | 'DOUBLON_CNSS'
  | 'DOUBLON_CNI'
  | 'PERIODE_INVALIDE'
  | 'PERIODE_NON_VALIDEE'
  | 'DONNEE_SOURCE_ALTEREE';

export interface RegleErreurExport {
  code: CodeErreurExport;
  intitule: string;
  gravite: 'BLOQUANTE' | 'AVERTISSEMENT';
  bloqueExport: boolean;
  actionCorrective: string;
}

export interface BilanEligibiliteExport {
  estEligible: boolean;
  periodeId: string;
  formatVise: FormatCibleDeclaration;
  totalLignes: number;
  lignesEligibles: number;
  lignesBloquantes: number;
  erreursBloquantes: Array<{
    code: CodeErreurExport;
    salarie: string;
    message: string;
  }>;
  avertissements: Array<{
    code: CodeErreurExport;
    salarie: string;
    message: string;
  }>;
  dateControle: string;
}

export interface SpecificationExportVersionnee {
  version: string;
  dateMiseAJour: string;
  formatCible: FormatCibleDeclaration;
  extensionFichier: string;
  conventionNommage: string;
  encodage: string;
  separateurLigne: string;
  longueurEnregistrement?: number;
  champs: DefinitionChampExport[];
}
