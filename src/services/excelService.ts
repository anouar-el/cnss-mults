/**
 * Service d'import, de parsing et de mapping Excel / CSV pour CNSS MULT.S
 * Conforme aux exigences du PROMPT 04.
 */

import * as XLSX from 'xlsx';
import {
  AnalyseFichierExcel,
  MappingColonne,
  ChampMappeType,
  LignePaieImportee,
  SalarieReferentiel,
  ResultatImportBaseCnss,
  SituationEmploye,
} from '../types/cnss';
import {
  normaliserNom,
  normaliserCni,
  normaliserCnss,
  extraireTokensTries,
} from './normalizer';
import { persistenceService } from './persistenceService';

// Dictionnaire des synonymes d'en-têtes reconnus
const DICTIONNAIRE_ENTETES: Record<ChampMappeType, string[]> = {
  nomComplet: [
    'NOM ET PRENOM',
    'NOM ET PRÉNOM',
    'NOM & PRENOM',
    'NOM & PRÉNOM',
    'NOM COMPLET',
    'NOM',
    'SALARIE',
    'SALARIÉ',
    'EMPLOYE',
    'EMPLOYÉ',
    'AGENT',
    'INTERIMAIRE',
    'INTÉRIMAIRE',
    'NOM PRENOM',
    'NOM ET PRENOM DU SALARIE',
  ],
  joursTravailles: [
    'JRS OUVRE',
    'JRS OUVRÉS',
    'JRS OUVRES',
    'JOURS',
    'JOURS TRAVAILLES',
    'JOURS TRAVAILLÉS',
    'NOMBRE DE JOURS',
    'NBRE JOURS',
    'NB JOURS',
    'NB DE JOURS',
    'JRS OUV',
    'JRS',
    'JOURS OUVRES',
    'TOTAL JOURS',
  ],
  salaireBase: [
    'BASE',
    'SALAIRE BASE',
    'SALAIRE DE BASE',
    'SAL. BASE',
    'SAL BASE',
  ],
  salaireBrut: [
    'BRUT',
    'SALAIRE BRUT',
    'SAL. BRUT',
    'BRUT GLOBAL',
    'SALAIRE GLOBAL',
    'TOTAL BRUT',
  ],
  cni: [
    'CNI',
    'CIN',
    'N° CNI',
    'N° CIN',
    'CARTE NATIONALE',
    'C.N.I',
    'NUMERO CNI',
  ],
  cnss: [
    'N° IMMATRICULE',
    'N° IMMATRICULATION',
    'N° CNSS',
    'CNSS',
    'IMMATRICULATION',
    'IMMATRICULE',
    'NUMERO CNSS',
    'MATRICULE CNSS',
    'IMMAT',
  ],
  situation: [
    'SITUATION',
    'ETAT',
    'ÉTAT',
    'STATUT',
    'SITUATION EMPLOYE',
    'OBSERVATION',
  ],
  client: [
    'CLIENT',
    'AFFECTATION',
    'CHANTIER',
    'SOCIETE CLIENTE',
    'MISSION',
    'ENTREPRISE',
  ],
  ignorer: [],
};

export const excelService = {
  /**
   * Analyse automatique d'un buffer ou fichier Excel/CSV
   */
  analyserBufferOuClasseur(
    buffer: ArrayBuffer | Uint8Array | string,
    nomFichier: string,
    taille = 0,
    dateModif?: string
  ): AnalyseFichierExcel {
    const workbook = typeof buffer === 'string'
      ? XLSX.read(buffer, { type: 'string' })
      : XLSX.read(buffer, { type: 'array' });

    const feuilles = workbook.SheetNames;
    if (feuilles.length === 0) {
      throw new Error('Le fichier Excel ne contient aucune feuille.');
    }

    // Détection de la feuille la plus probable
    const feuilleSelectionnee = this.detecterFeuilleProbable(feuilles);
    const worksheet = workbook.Sheets[feuilleSelectionnee];

    // Conversion en tableau brut avec en-têtes
    const lignesRaw: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (lignesRaw.length === 0) {
      return {
        nomFichier,
        taille,
        dateDerniereModif: dateModif || new Date().toISOString(),
        feuilles,
        feuilleSelectionnee,
        lignesBrutes: [],
        entetesDetectees: [],
        mappings: [],
        lignesPrevisualisation: [],
        totalLignesDetectees: 0,
        lignesValidesCount: 0,
        lignesIgnoreesTotalCount: 0,
        lignesAnomaliesCount: 0,
        doublonsDetectes: [],
      };
    }

    // Détection de la ligne d'en-tête (cherche sur les 5 premières lignes)
    const { indexEntete, entetes } = this.trouverLigneEntete(lignesRaw);

    // Mappage automatique des colonnes
    const mappings = this.determinerMappings(entetes, lignesRaw.slice(indexEntete + 1));

    // Extraction et contrôle des données
    const indexColNom = entetes.findIndex((_, idx) => mappings[idx]?.champCible === 'nomComplet');
    const indexColJours = entetes.findIndex((_, idx) => mappings[idx]?.champCible === 'joursTravailles');
    const indexColCni = entetes.findIndex((_, idx) => mappings[idx]?.champCible === 'cni');
    const indexColCnss = entetes.findIndex((_, idx) => mappings[idx]?.champCible === 'cnss');
    const indexColBase = entetes.findIndex((_, idx) => mappings[idx]?.champCible === 'salaireBase');
    const indexColBrut = entetes.findIndex((_, idx) => mappings[idx]?.champCible === 'salaireBrut');

    const lignesDonnees = lignesRaw.slice(indexEntete + 1);
    let lignesIgnoreesTotalCount = 0;
    const doublonsDetectes: AnalyseFichierExcel['doublonsDetectes'] = [];
    const nomsVus = new Map<string, number>();

    const lignesPrevisu: Record<string, any>[] = [];
    let lignesValidesCount = 0;
    let lignesAnomaliesCount = 0;

    lignesDonnees.forEach((row, rIdx) => {
      const numeroLigne = indexEntete + rIdx + 2;

      // 1. Détection des lignes Total (Section 6)
      if (this.estLigneTotal(row, indexColNom)) {
        lignesIgnoreesTotalCount++;
        return;
      }

      // 2. Détection des lignes vides
      const rowString = row.map(c => String(c).trim()).join('');
      if (!rowString) return;

      const nomBrut = indexColNom >= 0 ? String(row[indexColNom] || '').trim() : '';
      if (!nomBrut) return; // Pas de nom -> ligne non exploitable

      const joursBruts = indexColJours >= 0 ? row[indexColJours] : undefined;
      const joursNum = this.parseJours(joursBruts);

      // Détection des doublons intra-fichier (Section 12)
      const nomNorm = normaliserNom(nomBrut);
      if (nomsVus.has(nomNorm)) {
        doublonsDetectes.push({
          ligne: numeroLigne,
          nom: nomBrut,
          motif: `Doublon du salarié déjà présent à la ligne ${nomsVus.get(nomNorm)}`,
        });
      } else {
        nomsVus.set(nomNorm, numeroLigne);
      }

      // Détection des anomalies (jours négatifs, >26, ou NaN)
      if (isNaN(joursNum) || joursNum < 0 || joursNum > 26) {
        lignesAnomaliesCount++;
      } else {
        lignesValidesCount++;
      }

      // Prévisualisation (jusqu'à 10 lignes)
      if (lignesPrevisu.length < 10) {
        const itemPrevisu: Record<string, any> = {
          _ligneExcel: numeroLigne,
          nom: nomBrut,
          jours: joursBruts,
        };
        if (indexColBase >= 0) itemPrevisu.base = row[indexColBase];
        if (indexColBrut >= 0) itemPrevisu.brut = row[indexColBrut];
        if (indexColCni >= 0) itemPrevisu.cni = row[indexColCni];
        if (indexColCnss >= 0) itemPrevisu.cnss = row[indexColCnss];
        lignesPrevisu.push(itemPrevisu);
      }
    });

    const totalLignesDetectees = lignesValidesCount + lignesAnomaliesCount;

    return {
      nomFichier,
      taille,
      dateDerniereModif: dateModif || new Date().toISOString(),
      feuilles,
      feuilleSelectionnee,
      lignesBrutes: lignesDonnees,
      entetesDetectees: entetes,
      mappings,
      lignesPrevisualisation: lignesPrevisu,
      totalLignesDetectees,
      lignesValidesCount,
      lignesIgnoreesTotalCount,
      lignesAnomaliesCount,
      doublonsDetectes,
    };
  },

  /**
   * Convertit l'analyse en véritables entités `LignePaieImportee`
   * Respecte strictement l'immutabilité : `joursImportes` n'est jamais écrasé !
   */
  convertirEnLignesPaie(
    analyse: AnalyseFichierExcel,
    idMois = '2026-09'
  ): LignePaieImportee[] {
    const { entetesDetectees, mappings, lignesBrutes, feuilleSelectionnee, nomFichier } = analyse;

    const indexColNom = entetesDetectees.findIndex((_, idx) => mappings[idx]?.champCible === 'nomComplet');
    const indexColJours = entetesDetectees.findIndex((_, idx) => mappings[idx]?.champCible === 'joursTravailles');
    const indexColCni = entetesDetectees.findIndex((_, idx) => mappings[idx]?.champCible === 'cni');
    const indexColCnss = entetesDetectees.findIndex((_, idx) => mappings[idx]?.champCible === 'cnss');
    const indexColBase = entetesDetectees.findIndex((_, idx) => mappings[idx]?.champCible === 'salaireBase');
    const indexColBrut = entetesDetectees.findIndex((_, idx) => mappings[idx]?.champCible === 'salaireBrut');

    const resultats: LignePaieImportee[] = [];
    let sequence = 1;

    lignesBrutes.forEach((row, rIdx) => {
      // Ignorer Total
      if (this.estLigneTotal(row, indexColNom)) return;

      const nomBrut = indexColNom >= 0 ? String(row[indexColNom] || '').trim() : '';
      if (!nomBrut) return;

      const joursBruts = indexColJours >= 0 ? row[indexColJours] : undefined;
      const joursNum = this.parseJours(joursBruts);

      const cniBrute = indexColCni >= 0 && row[indexColCni] ? String(row[indexColCni]) : undefined;
      const cnssBrute = indexColCnss >= 0 && row[indexColCnss] ? String(row[indexColCnss]) : undefined;

      const baseBrut = indexColBase >= 0 && row[indexColBase] !== '' ? Number(row[indexColBase]) : undefined;
      const brutMontant = indexColBrut >= 0 && row[indexColBrut] !== '' ? Number(row[indexColBrut]) : undefined;

      resultats.push({
        id: `paie_${idMois.replace('-', '')}_${sequence++}`,
        nomCompletBrut: nomBrut, // Valeur originale
        nomNormalise: normaliserNom(nomBrut),
        tokensNom: extraireTokensTries(nomBrut),
        joursImportes: isNaN(joursNum) ? 0 : joursNum, // Conserve strictement la valeur brute
        cniImportee: cniBrute,
        cnssImportee: cnssBrute ? normaliserCnss(cnssBrute) : undefined,
        salaireBase: isNaN(Number(baseBrut)) ? undefined : baseBrut,
        salaireBrut: isNaN(Number(brutMontant)) ? undefined : brutMontant,
        ligneFichier: rIdx + 2,
      });
    });

    return resultats;
  },

  /**
   * Analyse et réconciliation d'un fichier de Base CNSS (Section 9, 10, 11, 12)
   */
  analyserBaseCnss(
    lignesExcel: any[][],
    baseSalariesActuelle: SalarieReferentiel[]
  ): ResultatImportBaseCnss {
    const { indexEntete, entetes } = this.trouverLigneEntete(lignesExcel);
    const lignesDonnees = lignesExcel.slice(indexEntete + 1);

    // Détection des colonnes Base CNSS
    const idxCnss = entetes.findIndex(e => this.colonneCorrespond(e, 'cnss'));
    const idxNom = entetes.findIndex(e => this.colonneCorrespond(e, 'nomComplet'));
    const idxCni = entetes.findIndex(e => this.colonneCorrespond(e, 'cni'));
    const idxSituation = entetes.findIndex(e => this.colonneCorrespond(e, 'situation'));

    let salariesExistants = 0;
    const nouveauxSalaries: ResultatImportBaseCnss['nouveauxSalaries'] = [];
    const modificationsDetectees: ResultatImportBaseCnss['modificationsDetectees'] = [];
    const doublonsDetectes: ResultatImportBaseCnss['doublonsDetectes'] = [];
    const anomaliesDetectees: ResultatImportBaseCnss['anomaliesDetectees'] = [];

    const cnisVues = new Map<string, number>();
    const cnssVues = new Map<string, number>();

    let totalLignes = 0;

    lignesDonnees.forEach((row, rIdx) => {
      const numLigne = indexEntete + rIdx + 2;
      const nomBrut = idxNom >= 0 ? String(row[idxNom] || '').trim() : '';
      if (!nomBrut) return; // Ligne vide

      totalLignes++;

      const cnssBrute = idxCnss >= 0 ? String(row[idxCnss] || '') : '';
      const cniBrute = idxCni >= 0 ? String(row[idxCni] || '') : '';
      const situationBrute = idxSituation >= 0 ? String(row[idxSituation] || '').trim() : '';

      // NORMALISATION CNSS STRICTE (Section 10) : texte, pas de .0
      const cnssNorm = normaliserCnss(cnssBrute);
      // NORMALISATION CNI (Section 10) : trim, majuscules
      const cniNorm = normaliserCni(cniBrute);
      const nomNorm = normaliserNom(nomBrut);

      // Détection des doublons intra-fichier
      if (cniNorm) {
        if (cnisVues.has(cniNorm)) {
          doublonsDetectes.push({
            identifiant: cniNorm,
            type: 'CNI',
            lignes: [cnisVues.get(cniNorm)!, numLigne],
          });
        } else {
          cnisVues.set(cniNorm, numLigne);
        }
      }

      if (cnssNorm) {
        if (cnssVues.has(cnssNorm)) {
          doublonsDetectes.push({
            identifiant: cnssNorm,
            type: 'CNSS',
            lignes: [cnssVues.get(cnssNorm)!, numLigne],
          });
        } else {
          cnssVues.set(cnssNorm, numLigne);
        }
      }

      // Anomalie d'identifiants manquants
      if (!cniNorm && !cnssNorm) {
        anomaliesDetectees.push({
          ligne: numLigne,
          nom: nomBrut,
          motif: 'Ni CNI ni immatriculation CNSS renseignées',
        });
      }

      // Rapprochement avec la base actuelle
      const salarieExistant = baseSalariesActuelle.find(s => {
        if (cnssNorm && s.immatriculationCnss && s.immatriculationCnss === cnssNorm) return true;
        if (cniNorm && s.cni && s.cni === cniNorm) return true;
        if (s.nomNormalise === nomNorm) return true;
        return false;
      });

      let sit: SituationEmploye = 'ACTIF';
      if (situationBrute === 'so') sit = 'SORTI';
      else if (situationBrute === 'AT') sit = 'ACCIDENT_TRAVAIL';

      if (salarieExistant) {
        salariesExistants++;

        // Détection de modifications potentielles
        if (cniNorm && salarieExistant.cni !== cniNorm) {
          modificationsDetectees.push({
            salarieId: salarieExistant.id,
            nom: salarieExistant.nomComplet,
            champ: 'CNI',
            ancienneValeur: salarieExistant.cni || 'Vide',
            nouvelleValeur: cniNorm,
          });
        }
        if (cnssNorm && salarieExistant.immatriculationCnss !== cnssNorm) {
          modificationsDetectees.push({
            salarieId: salarieExistant.id,
            nom: salarieExistant.nomComplet,
            champ: 'CNSS',
            ancienneValeur: salarieExistant.immatriculationCnss || 'Vide',
            nouvelleValeur: cnssNorm,
          });
        }
      } else {
        nouveauxSalaries.push({
          nomComplet: nomBrut,
          cni: cniNorm || undefined,
          cnss: cnssNorm || undefined,
          situation: sit,
        });
      }
    });

    return {
      lignesImportees: totalLignes,
      salariesExistants,
      nouveauxSalaries,
      modificationsDetectees,
      doublonsDetectes,
      anomaliesDetectees,
    };
  },

  // -------------------------------------------------------------------------
  // FONCTIONS UTILITAIRES PRIVÉES DE DÉTECTION
  // -------------------------------------------------------------------------

  detecterFeuilleProbable(feuilles: string[]): string {
    const motsCles = ['paie', 'salaire', 'calcul', 'septembre', 'octobre', 'donnee', 'salari'];
    for (const feuille of feuilles) {
      const fLower = feuille.toLowerCase();
      if (motsCles.some(mc => fLower.includes(mc))) {
        return feuille;
      }
    }
    return feuilles[0];
  },

  trouverLigneEntete(lignes: any[][]): { indexEntete: number; entetes: string[] } {
    for (let i = 0; i < Math.min(lignes.length, 5); i++) {
      const row = lignes[i];
      if (!row || !Array.isArray(row)) continue;

      const entetesStr = row.map(cell => String(cell || '').trim());
      const hasNom = entetesStr.some(h => this.colonneCorrespond(h, 'nomComplet'));
      const hasJours = entetesStr.some(h => this.colonneCorrespond(h, 'joursTravailles'));

      if (hasNom || hasJours) {
        return { indexEntete: i, entetes: entetesStr };
      }
    }

    // Fallback ligne 0
    return {
      indexEntete: 0,
      entetes: lignes[0] ? lignes[0].map(c => String(c || '').trim()) : [],
    };
  },

  determinerMappings(entetes: string[], previewRows: any[][]): MappingColonne[] {
    const savedMappings = persistenceService.getMappingsColonnes();

    return entetes.map((entete, colIdx) => {
      const enteteClean = entete.trim().toUpperCase();

      // 1. Vérifier si un mapping manuel sauvegardé existe déjà (Section 5)
      if (savedMappings[enteteClean]) {
        return {
          colonneSource: entete,
          champCible: savedMappings[enteteClean],
          confiance: 'MANUEL',
          apercuValeurs: previewRows.slice(0, 3).map(r => String(r[colIdx] || '')),
        };
      }

      // 2. Détection automatique par synonymes
      let cible: ChampMappeType = 'ignorer';
      let confiance: 'AUTOMATIQUE' | 'MANUEL' = 'MANUEL';

      for (const [champ, synonymes] of Object.entries(DICTIONNAIRE_ENTETES)) {
        if (champ === 'ignorer') continue;
        if (this.colonneCorrespond(enteteClean, champ as ChampMappeType)) {
          cible = champ as ChampMappeType;
          confiance = 'AUTOMATIQUE';
          break;
        }
      }

      return {
        colonneSource: entete,
        champCible: cible,
        confiance,
        apercuValeurs: previewRows.slice(0, 3).map(r => String(r[colIdx] || '')),
      };
    });
  },

  colonneCorrespond(nomColonne: string, champCible: ChampMappeType): boolean {
    const norm = nomColonne.trim().toUpperCase().replace(/[\n\r_]/g, ' ').replace(/\s+/g, ' ');
    const synonymes = DICTIONNAIRE_ENTETES[champCible] || [];

    return synonymes.some(syn => {
      const synNorm = syn.toUpperCase();
      return norm === synNorm || norm.startsWith(synNorm) || norm.includes(synNorm);
    });
  },

  estLigneTotal(row: any[], indexNom: number): boolean {
    if (!row || !Array.isArray(row)) return false;

    // Vérifier la colonne nom si connue
    if (indexNom >= 0 && row[indexNom]) {
      const valNom = String(row[indexNom]).trim().toUpperCase();
      if (valNom === 'TOTAL' || valNom === 'TOTAL GENERAL' || valNom === 'TOTAUX' || valNom.startsWith('TOTAL')) {
        return true;
      }
    }

    // Vérifier les 2 premières colonnes
    for (let i = 0; i < Math.min(row.length, 3); i++) {
      const val = String(row[i] || '').trim().toUpperCase();
      if (val === 'TOTAL' || val === 'TOTAL GENERAL' || val === 'TOTAUX' || val === 'SOMME') {
        return true;
      }
    }

    return false;
  },

  parseJours(val: any): number {
    if (val === undefined || val === null || val === '') return NaN;
    if (typeof val === 'number') return val;

    const str = String(val).trim().replace(',', '.');
    const parsed = parseFloat(str);
    return isNaN(parsed) ? NaN : parsed;
  },
};
