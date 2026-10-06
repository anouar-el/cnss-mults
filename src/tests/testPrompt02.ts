/**
 * Banc de tests automatisés pour PROMPT 02 (Section 17 & 18)
 * Valide les 10 scénarios clés de l'interface de rapprochement et la traçabilité.
 */

import { SalarieReferentiel, LignePaieImportee } from '../types/cnss';
import { normaliserNom, extraireTokensTries } from '../services/normalizer';
import { rapprocherLigne } from '../services/matchingEngine';
import { validationEngine } from '../services/validationEngine';
import { persistenceService } from '../services/persistenceService';

export interface ResultatTestP2 {
  id: number;
  cas: string;
  succes: boolean;
  attendu: string;
  obtenu: string;
  details: string;
}

export interface BilanPrompt02 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTestP2[];
}

export function executerTestsPrompt02(): BilanPrompt02 {
  const resultats: ResultatTestP2[] = [];

  // Base de référence avec les cas représentatifs
  const baseSalaries: SalarieReferentiel[] = [
    {
      id: 'sal_saad',
      nomComplet: 'SAAD IMRAN',
      nomNormalise: normaliserNom('SAAD IMRAN'),
      tokensNom: extraireTokensTries('SAAD IMRAN'),
      cni: 'WA337745',
      immatriculationCnss: '110790458',
      situation: 'ACTIF',
      aliases: [],
    },
    {
      id: 'sal_zagouri',
      nomComplet: 'ACHRAF ZAGOURI',
      nomNormalise: normaliserNom('ACHRAF ZAGOURI'),
      tokensNom: extraireTokensTries('ACHRAF ZAGOURI'),
      cni: 'WA301743',
      immatriculationCnss: '132168924',
      situation: 'ACTIF',
      aliases: [],
    },
    {
      id: 'sal_ghaffour',
      nomComplet: 'YOUSSEF GHAFFOUR',
      nomNormalise: normaliserNom('YOUSSEF GHAFFOUR'),
      tokensNom: extraireTokensTries('YOUSSEF GHAFFOUR'),
      cni: 'WA306471',
      immatriculationCnss: '137586052',
      situation: 'ACTIF',
      aliases: [],
    },
    {
      id: 'sal_motahir',
      nomComplet: 'NOUR MOTAHIR',
      nomNormalise: normaliserNom('NOUR MOTAHIR'),
      tokensNom: extraireTokensTries('NOUR MOTAHIR'),
      cni: 'WA312421',
      immatriculationCnss: '996523809',
      situation: 'SORTI',
      aliases: [],
    },
    {
      id: 'sal_elatllati',
      nomComplet: 'MOAEZ ELATLLATI',
      nomNormalise: normaliserNom('MOAEZ ELATLLATI'),
      tokensNom: extraireTokensTries('MOAEZ ELATLLATI'),
      cni: 'RC55427',
      immatriculationCnss: '137493752',
      situation: 'ACTIF',
      aliases: [],
    },
    // Cas homonymes AYOUB EL WARDI
    {
      id: 'sal_wardi_ahmed',
      nomComplet: 'AHMED EL WARDI',
      nomNormalise: normaliserNom('AHMED EL WARDI'),
      tokensNom: extraireTokensTries('AHMED EL WARDI'),
      cni: 'WA198565',
      immatriculationCnss: '188026348',
      situation: 'ACTIF',
      aliases: [],
    },
    {
      id: 'sal_elwaridi_ayoub',
      nomComplet: 'AYOUB ELWARIDI',
      nomNormalise: normaliserNom('AYOUB ELWARIDI'),
      tokensNom: extraireTokensTries('AYOUB ELWARIDI'),
      cni: 'WA346550',
      immatriculationCnss: '177584359',
      situation: 'ACTIF',
      aliases: [],
    },
    // Marouane Moukrim (SORTI)
    {
      id: 'sal_moukrim',
      nomComplet: 'MAROUANE MOUKRIM',
      nomNormalise: normaliserNom('MAROUANE MOUKRIM'),
      tokensNom: extraireTokensTries('MAROUANE MOUKRIM'),
      cni: 'WA276247',
      immatriculationCnss: '139442036',
      situation: 'SORTI', // Situation base = SORTI
      aliases: [],
    },
    {
      id: 'sal_haoudi',
      nomComplet: 'NAOUFAL HAOUDI',
      nomNormalise: normaliserNom('NAOUFAL HAOUDI'),
      tokensNom: extraireTokensTries('NAOUFAL HAOUDI'),
      situation: 'ACTIF',
      aliases: [],
    },
    {
      id: 'sal_zellal',
      nomComplet: 'MAROINE ZELLAL',
      nomNormalise: normaliserNom('MAROINE ZELLAL'),
      tokensNom: extraireTokensTries('MAROINE ZELLAL'),
      cni: 'WA336867',
      immatriculationCnss: '146827764',
      situation: 'ACTIF',
      aliases: [],
    },
  ];

  const creerLigne = (nom: string, jours: number, id = nom.toLowerCase().replace(/\s+/g, '_')): LignePaieImportee => ({
    id: `paie_${id}`,
    nomCompletBrut: nom,
    nomNormalise: normaliserNom(nom),
    tokensNom: extraireTokensTries(nom),
    joursImportes: jours,
    ligneFichier: 2,
  });

  // TEST 1 : IMRAN SAAD -> Token Sort 98%
  {
    const ligne = creerLigne('IMRAN SAAD', 20);
    const res = rapprocherLigne(ligne, baseSalaries);
    const ok = res.statut === 'CORRESPONDANCE_TOKEN_SORT' && res.salariePropose?.nomComplet === 'SAAD IMRAN';
    resultats.push({
      id: 1,
      cas: '1. IMRAN SAAD (Inversion)',
      succes: ok,
      attendu: 'TOKEN_SORT avec SAAD IMRAN (Score: 98%)',
      obtenu: `${res.statut} (${res.score}%) -> ${res.salariePropose?.nomComplet}`,
      details: res.explication,
    });
  }

  // TEST 2 : ZAGOURI ACHRAF -> Token Sort 98%
  {
    const ligne = creerLigne('ZAGOURI ACHRAF', 22);
    const res = rapprocherLigne(ligne, baseSalaries);
    const ok = res.statut === 'CORRESPONDANCE_TOKEN_SORT' && res.salariePropose?.nomComplet === 'ACHRAF ZAGOURI';
    resultats.push({
      id: 2,
      cas: '2. ZAGOURI ACHRAF (Inversion)',
      succes: ok,
      attendu: 'TOKEN_SORT avec ACHRAF ZAGOURI (Score: 98%)',
      obtenu: `${res.statut} (${res.score}%) -> ${res.salariePropose?.nomComplet}`,
      details: res.explication,
    });
  }

  // TEST 3 : YOUSSEF GHAFOUR -> Fuzzy fort 96%
  {
    const ligne = creerLigne('YOUSSEF GHAFOUR', 25);
    const res = rapprocherLigne(ligne, baseSalaries);
    const ok = res.statut === 'CORRESPONDANCE_FUZZY' && res.score >= 90 && res.salariePropose?.nomComplet === 'YOUSSEF GHAFFOUR';
    resultats.push({
      id: 3,
      cas: '3. YOUSSEF GHAFOUR (Fuzzy double consonne)',
      succes: ok,
      attendu: 'FUZZY suggestion forte (Score >= 90%) avec YOUSSEF GHAFFOUR',
      obtenu: `${res.statut} (${res.score}%) -> ${res.salariePropose?.nomComplet}`,
      details: res.explication,
    });
  }

  // TEST 4 : NOUR MOTTAHIR -> Fuzzy fort 96%
  {
    const ligne = creerLigne('NOUR MOTTAHIR', 0);
    const res = rapprocherLigne(ligne, baseSalaries);
    const ok = res.statut === 'CORRESPONDANCE_FUZZY' && res.score >= 90 && res.salariePropose?.nomComplet === 'NOUR MOTAHIR';
    resultats.push({
      id: 4,
      cas: '4. NOUR MOTTAHIR (Fuzzy double consonne)',
      succes: ok,
      attendu: 'FUZZY suggestion forte (Score >= 90%) avec NOUR MOTAHIR',
      obtenu: `${res.statut} (${res.score}%) -> ${res.salariePropose?.nomComplet}`,
      details: res.explication,
    });
  }

  // TEST 5 : MOUAAZ EL AATLATI -> Fuzzy incertain 80-89%
  {
    const ligne = creerLigne('MOUAAZ EL AATLATI', 9);
    const res = rapprocherLigne(ligne, baseSalaries);
    const ok = res.statut === 'CORRESPONDANCE_FUZZY' && res.score >= 80 && res.score < 90 && res.validation === 'A_VALIDER';
    resultats.push({
      id: 5,
      cas: '5. MOUAAZ EL AATLATI (Transcription complexe)',
      succes: ok,
      attendu: 'FUZZY incertain (80-89%) avec validation A_VALIDER',
      obtenu: `${res.statut} (${res.score}%) -> validation: ${res.validation}`,
      details: res.explication,
    });
  }

  // TEST 6 : AYOUB EL WARDI -> Cas ambigu homonyme
  {
    const ligne = creerLigne('AYOUB EL WARDI', 25);
    const res = rapprocherLigne(ligne, baseSalaries);
    // Base a AHMED EL WARDI et AYOUB ELWARIDI avec des scores très proches
    const ok = res.estAmbigu === true && (res.candidatsAmbigus?.length ?? 0) >= 2;
    resultats.push({
      id: 6,
      cas: '6. AYOUB EL WARDI (Cas ambigu homonyme)',
      succes: ok,
      attendu: 'estAmbigu = true avec liste de candidats concurrents',
      obtenu: `estAmbigu: ${res.estAmbigu ? 'OUI' : 'NON'} (${res.candidatsAmbigus?.length || 0} candidats)`,
      details: res.explication,
    });
  }

  // TEST 7 : SAFWAN DAOU -> Non identifié (< 80%)
  {
    const ligne = creerLigne('SAFWAN DAOU', 4);
    const res = rapprocherLigne(ligne, baseSalaries);
    const ok = res.statut === 'NON_IDENTIFIE' && res.validation === 'A_VALIDER';
    resultats.push({
      id: 7,
      cas: '7. SAFWAN DAOU (Non identifié)',
      succes: ok,
      attendu: 'statut NON_IDENTIFIE et validation A_VALIDER (pas nouveau automatique)',
      obtenu: `${res.statut} (score: ${res.score}%, validation: ${res.validation})`,
      details: res.explication,
    });
  }

  // TEST 8 : MAROUANE MOUKRIM -> Sorti retravaillant (18 j)
  {
    const ligne = creerLigne('MAROUANE MOUKRIM', 18);
    const res = rapprocherLigne(ligne, baseSalaries);
    const anos = validationEngine.auditer([res], baseSalaries);
    const aAnomalieSorti = anos.some(a => a.code === 'SALARIE_SORTI_AVEC_JOURS');
    const ok = res.salariePropose?.situation === 'SORTI' && aAnomalieSorti;
    resultats.push({
      id: 8,
      cas: '8. MAROUANE MOUKRIM (Salarié sorti retravaillant)',
      succes: ok,
      attendu: 'Alerte SALARIE_SORTI_AVEC_JOURS (18j travaillés, situation base: SORTI)',
      obtenu: aAnomalieSorti ? 'Alerte bien générée (situation base: SORTI, 18 j)' : 'Alerte manquante',
      details: 'Nécessite arbitrage humain (confirmer réactivation ou conserver sorti).',
    });
  }

  // TEST 9 : NAOUFAL HAOUDI (27 jours) -> Conservation absolue joursImportes
  {
    const ligne = creerLigne('NAOUFAL HAOUDI', 27);
    const res = rapprocherLigne(ligne, baseSalaries);
    const anos = validationEngine.auditer([res], baseSalaries);
    const hasAno26 = anos.some(a => a.code === 'JOURS_SUPERIEURS_26');
    const joursIntacts = res.validationJours.joursImportes === 27;
    const ok = hasAno26 && joursIntacts;
    resultats.push({
      id: 9,
      cas: '9. NAOUFAL HAOUDI (27 jours > 26)',
      succes: ok,
      attendu: 'Anomalie JOURS_SUPERIEURS_26 et joursImportes = 27 (intact)',
      obtenu: `Anomalie: ${hasAno26 ? 'OUI' : 'NON'} | joursImportes: ${res.validationJours.joursImportes}`,
      details: 'La valeur originale 27 n\'a pas été altérée.',
    });
  }

  // TEST 10 : MAROINE ZELLAL (-5 jours) -> Conservation absolue joursImportes
  {
    const ligne = creerLigne('MAROINE ZELLAL', -5);
    const res = rapprocherLigne(ligne, baseSalaries);
    const anos = validationEngine.auditer([res], baseSalaries);
    const hasAnoNeg = anos.some(a => a.code === 'JOURS_NEGATIFS');
    const joursIntacts = res.validationJours.joursImportes === -5;
    const ok = hasAnoNeg && joursIntacts;
    resultats.push({
      id: 10,
      cas: '10. MAROINE ZELLAL (-5 jours négatifs)',
      succes: ok,
      attendu: 'Anomalie JOURS_NEGATIFS et joursImportes = -5 (intact)',
      obtenu: `Anomalie: ${hasAnoNeg ? 'OUI' : 'NON'} | joursImportes: ${res.validationJours.joursImportes}`,
      details: 'La valeur originale -5 n\'a pas été altérée.',
    });
  }

  const reussis = resultats.filter(r => r.succes).length;
  const echoues = resultats.length - reussis;

  return {
    total: resultats.length,
    reussis,
    echoues,
    resultats,
  };
}
