/**
 * Moteur de rapprochement intelligent CNSS MULT.S - PROMPT 01 & PROMPT 05
 * Respecte strictement la hiérarchie en 6 niveaux :
 * NIVEAU 1 — CNI exacte
 * NIVEAU 2 — CNSS exacte
 * NIVEAU 3 — ALIAS validé
 * NIVEAU 4 — NOM NORMALISÉ EXACT
 * NIVEAU 5 — TOKEN SORT
 * NIVEAU 6 — FUZZY MATCHING (avec gestion obligatoire de l'ambiguïté)
 */

import {
  LignePaieImportee,
  SalarieReferentiel,
  ResultatRapprochement,
  StatutRapprochement,
  StatutValidationRapprochement,
  StatutLigneP5,
  MethodeRapprochement,
  CandidatRapprochement,
} from '../types/cnss';
import {
  normaliserNom,
  normaliserCni,
  normaliserCnss,
  scoreSimilariteAvancee,
  extraireTokensTries,
  correspondAvecVariantePrefixe,
} from './normalizer';
import { persistenceService } from './persistenceService';

/**
 * Détermine le statut strict P5 selon l'état actuel de la ligne
 */
export function determinerStatutLigneP5(rap: Partial<ResultatRapprochement>): StatutLigneP5 {
  const jours = rap.validationJours;

  // 1. Anomalie de jours bloquante non résolue (Section 12)
  if (jours) {
    const joursEffectifs = jours.joursDeclares ?? jours.joursImportes;
    const estAnomalieJours = joursEffectifs > 26 || joursEffectifs < 0 || isNaN(joursEffectifs);
    if (estAnomalieJours && !jours.validationEffectuee) {
      return 'ANOMALIE_BLOQUANTE';
    }
  }

  // 2. Salarié noté SORTI avec des jours travaillés sans arbitrage (Section 9)
  if (
    rap.salariePropose?.situation === 'SORTI' &&
    ((rap.validationJours?.joursDeclares ?? rap.validationJours?.joursImportes ?? 0) > 0) &&
    !rap.decisionSorti &&
    rap.validation !== 'VALIDE'
  ) {
    return 'SORTI_A_ARBITRER';
  }

  // 3. Nouveau salarié confirmé formellement par le gestionnaire (Section 7)
  if (rap.estMarqueNouveau) {
    return 'NOUVEAU_CONFIRME';
  }

  // 4. Cas ambigu non encore arbitré (Section 3)
  if (rap.estAmbigu && rap.validation !== 'VALIDE') {
    return 'AMBIGU';
  }

  // 5. Salarié non identifié (score < 80%) sans arbitrage (Section 3 & 6)
  if (rap.statut === 'NON_IDENTIFIE' && rap.validation !== 'VALIDE') {
    return 'NON_IDENTIFIE';
  }

  // 6. Ligne validée par humain ou validée automatiquement avec certitude (Section 3)
  if (rap.validation === 'VALIDE') {
    return 'IDENTIFIE';
  }

  if (rap.validation === 'AUTOMATIQUE' && (rap.score ?? 0) >= 98 && !rap.estAmbigu) {
    return 'IDENTIFIE';
  }

  // 7. Par défaut : en attente de validation humaine
  return 'A_VALIDER';
}

export function rapprocherLigne(
  ligne: LignePaieImportee,
  baseSalaries: SalarieReferentiel[]
): ResultatRapprochement {
  const normNom = normaliserNom(ligne.nomCompletBrut);
  const cniLigne = normaliserCni(ligne.cniImportee);
  const cnssLigne = normaliserCnss(ligne.cnssImportee);
  const maintenant = new Date().toISOString();

  // Initialisation de la traçabilité des jours (joursImportes reste STRICTEMENT IMMUABLE)
  const validationJoursInitiale = {
    joursImportes: ligne.joursImportes,
    joursDeclares: ligne.joursImportes,
    modifieManuellement: false,
    validationEffectuee: ligne.joursImportes >= 0 && ligne.joursImportes <= 26,
  };

  // =========================================================================
  // NIVEAU 1 — CNI EXACTE (Priorité absolue 100%)
  // =========================================================================
  if (cniLigne) {
    const matchCni = baseSalaries.find(s => normaliserCni(s.cni) === cniLigne);
    if (matchCni) {
      const res: ResultatRapprochement = {
        id: `rap_${ligne.id}`,
        lignePaieId: ligne.id,
        salarieBaseId: matchCni.id,
        salariePropose: matchCni,
        score: 100,
        statut: 'CORRESPONDANCE_CNI',
        statutP5: 'IDENTIFIE',
        methode: 'CNI_EXACTE',
        explication: `Correspondance exacte par CNI (${cniLigne})`,
        validation: 'AUTOMATIQUE',
        valideParHumain: false,
        dateRapprochement: maintenant,
        enregistrerCommeAlias: false,
        validationJours: validationJoursInitiale,
      };
      res.statutP5 = determinerStatutLigneP5(res);
      return res;
    }
  }

  // =========================================================================
  // NIVEAU 2 — CNSS EXACTE (Priorité 100%)
  // =========================================================================
  if (cnssLigne) {
    const matchCnss = baseSalaries.find(s => normaliserCnss(s.immatriculationCnss) === cnssLigne);
    if (matchCnss) {
      const res: ResultatRapprochement = {
        id: `rap_${ligne.id}`,
        lignePaieId: ligne.id,
        salarieBaseId: matchCnss.id,
        salariePropose: matchCnss,
        score: 100,
        statut: 'CORRESPONDANCE_CNSS',
        statutP5: 'IDENTIFIE',
        methode: 'CNSS_EXACTE',
        explication: `Correspondance exacte par N° Immatriculation CNSS (${cnssLigne})`,
        validation: 'AUTOMATIQUE',
        valideParHumain: false,
        dateRapprochement: maintenant,
        enregistrerCommeAlias: false,
        validationJours: validationJoursInitiale,
      };
      res.statutP5 = determinerStatutLigneP5(res);
      return res;
    }
  }

  // =========================================================================
  // NIVEAU 3 — ALIAS MÉMORISÉ (Persistant, prioritaire sur le nom brut)
  // =========================================================================
  const aliasTrouve = persistenceService.trouverAlias(ligne.nomCompletBrut);
  if (aliasTrouve) {
    const salarieAssocie = baseSalaries.find(s => s.id === aliasTrouve.salarieId);
    if (salarieAssocie) {
      const res: ResultatRapprochement = {
        id: `rap_${ligne.id}`,
        lignePaieId: ligne.id,
        salarieBaseId: salarieAssocie.id,
        salariePropose: salarieAssocie,
        score: 100,
        statut: 'CORRESPONDANCE_ALIAS',
        statutP5: 'IDENTIFIE',
        methode: 'ALIAS_VALIDE',
        explication: `Reconnu via l'alias historique validé -> ${aliasTrouve.nomOfficielSalarie}`,
        validation: 'AUTOMATIQUE',
        valideParHumain: false,
        dateRapprochement: maintenant,
        enregistrerCommeAlias: false,
        validationJours: validationJoursInitiale,
      };
      res.statutP5 = determinerStatutLigneP5(res);
      return res;
    }
  }

  // =========================================================================
  // NIVEAU 4 — NOM NORMALISÉ EXACT & NIVEAU 5 — TOKEN SORT
  // =========================================================================
  const tokensLigne = extraireTokensTries(ligne.nomCompletBrut).join(' ');
  const matchTokenExact = baseSalaries.filter(s => {
    const tokensBase = extraireTokensTries(s.nomComplet).join(' ');
    return tokensBase === tokensLigne;
  });

  if (matchTokenExact.length === 1) {
    const candidat = matchTokenExact[0];
    const estIdentiqueStrict = normaliserNom(candidat.nomComplet) === normNom;

    const res: ResultatRapprochement = {
      id: `rap_${ligne.id}`,
      lignePaieId: ligne.id,
      salarieBaseId: candidat.id,
      salariePropose: candidat,
      score: estIdentiqueStrict ? 100 : 98,
      statut: 'CORRESPONDANCE_TOKEN_SORT',
      statutP5: 'IDENTIFIE',
      methode: estIdentiqueStrict ? 'NOM_NORMALISE_EXACT' : 'TOKEN_SORT',
      explication: estIdentiqueStrict
        ? 'Nom et prénom strictement identiques'
        : `Inversion Prénom/Nom détectée (Base: ${candidat.nomComplet})`,
      validation: 'AUTOMATIQUE',
      valideParHumain: false,
      dateRapprochement: maintenant,
      enregistrerCommeAlias: false,
      validationJours: validationJoursInitiale,
    };
    res.statutP5 = determinerStatutLigneP5(res);
    return res;
  }

  // Test complémentaire : variantes de préfixes (ex: EL AOUACHY vs ELAOUACHY)
  const matchPrefixe = baseSalaries.filter(s => correspondAvecVariantePrefixe(s.nomComplet, ligne.nomCompletBrut));
  if (matchPrefixe.length === 1) {
    const candidat = matchPrefixe[0];
    const res: ResultatRapprochement = {
      id: `rap_${ligne.id}`,
      lignePaieId: ligne.id,
      salarieBaseId: candidat.id,
      salariePropose: candidat,
      score: 95,
      statut: 'CORRESPONDANCE_TOKEN_SORT',
      statutP5: 'A_VALIDER',
      methode: 'TOKEN_SORT',
      explication: `Variante de préfixe sans espace détectée (Base: ${candidat.nomComplet})`,
      validation: 'A_VALIDER',
      valideParHumain: false,
      dateRapprochement: maintenant,
      enregistrerCommeAlias: true,
      validationJours: validationJoursInitiale,
    };
    res.statutP5 = determinerStatutLigneP5(res);
    return res;
  }

  // =========================================================================
  // NIVEAU 6 — FUZZY MATCHING AVEC DÉTECTION STRICTE DE L'AMBIGUÏTÉ (Section 3)
  // =========================================================================
  const scoresCandidats: CandidatRapprochement[] = baseSalaries
    .map(s => {
      const scoreRetenu = scoreSimilariteAvancee(ligne.nomCompletBrut, s.nomComplet);
      return {
        salarie: s,
        score: scoreRetenu,
        methode: 'FUZZY' as MethodeRapprochement,
        raison: 'Similarité orthographique et phonétique',
      };
    })
    .sort((a, b) => b.score - a.score);

  const topCandidat = scoresCandidats[0];
  const secondCandidat = scoresCandidats[1];

  const score1 = topCandidat ? topCandidat.score : 0;
  const score2 = secondCandidat ? secondCandidat.score : 0;
  const ecartScore = score1 - score2;

  // Calcul des écarts relatifs
  scoresCandidats.forEach(c => {
    c.ecartAvecPremier = score1 - c.score;
  });

  // RÈGLE D'OR D'AMBIGUÏTÉ (Section 3 & TEST 5, TEST 14) :
  // Un score élevé ne doit PAS suffire si deux candidats sont proches (ex: 93% vs 91%, écart 2)
  // On marque comme AMBIGU si :
  // 1) Au moins deux candidats
  // 2) Le meilleur candidat n'est pas un match parfait (score < 98)
  // 3) Le deuxième candidat est plausible (secondScore >= 70)
  // 4) L'écart est resserré :
  //    - Si top >= 90 et second >= 85 avec écart <= 10 (ex: 93% et 91%, écart = 2)
  //    - Ou si top >= 75 et second >= 70 avec écart <= 25 (homonymes fréquents)
  const estAmbigu = Boolean(
    topCandidat &&
    secondCandidat &&
    score1 < 98 &&
    score2 >= 70 &&
    (
      (score1 >= 90 && score2 >= 85 && ecartScore <= 10) ||
      (score1 >= 75 && score2 >= 70 && ecartScore <= 25)
    )
  );

  if (estAmbigu && topCandidat) {
    const res: ResultatRapprochement = {
      id: `rap_${ligne.id}`,
      lignePaieId: ligne.id,
      score: score1,
      secondScore: score2,
      ecartScore,
      statut: 'CORRESPONDANCE_FUZZY',
      statutP5: 'AMBIGU',
      methode: 'FUZZY',
      explication: `Ambiguïté : 2 candidats proches (${topCandidat.salarie.nomComplet} à ${score1}% vs ${secondCandidat.salarie.nomComplet} à ${score2}%, écart: ${ecartScore}%)`,
      validation: 'A_VALIDER',
      estAmbigu: true,
      valideParHumain: false,
      dateRapprochement: maintenant,
      candidats: scoresCandidats.slice(0, 5),
      candidatsAmbigus: scoresCandidats.slice(0, 3).map(c => ({
        salarie: c.salarie,
        score: c.score,
        raison: c.raison || 'Similarité proche',
      })),
      salariePropose: topCandidat.salarie,
      enregistrerCommeAlias: false,
      validationJours: validationJoursInitiale,
    };
    res.statutP5 = determinerStatutLigneP5(res);
    return res;
  }

  // Cas 90–99% : Forte correspondance sans ambiguïté (ex: YOUSSEF GHAFOUR vs YOUSSEF GHAFFOUR)
  if (topCandidat && score1 >= 90) {
    const res: ResultatRapprochement = {
      id: `rap_${ligne.id}`,
      lignePaieId: ligne.id,
      salarieBaseId: topCandidat.salarie.id,
      salariePropose: topCandidat.salarie,
      score: score1,
      secondScore: score2,
      ecartScore,
      statut: 'CORRESPONDANCE_FUZZY',
      statutP5: 'A_VALIDER',
      methode: 'FUZZY',
      explication: `Forte ressemblance (${score1}%) avec ${topCandidat.salarie.nomComplet} (faute de frappe probable)`,
      validation: 'A_VALIDER',
      valideParHumain: false,
      dateRapprochement: maintenant,
      enregistrerCommeAlias: true,
      candidats: scoresCandidats.slice(0, 5),
      candidatsAmbigus: scoresCandidats.slice(1, 3).filter(c => c.score >= 60).map(c => ({
        salarie: c.salarie,
        score: c.score,
        raison: c.raison || '',
      })),
      validationJours: validationJoursInitiale,
    };
    res.statutP5 = determinerStatutLigneP5(res);
    return res;
  }

  // Cas 80–89% : Correspondance à vérifier (ex: MOUAAZ EL AATLATI vs MOAEZ ELATLLATI)
  if (topCandidat && score1 >= 80) {
    const res: ResultatRapprochement = {
      id: `rap_${ligne.id}`,
      lignePaieId: ligne.id,
      salarieBaseId: topCandidat.salarie.id,
      salariePropose: topCandidat.salarie,
      score: score1,
      secondScore: score2,
      ecartScore,
      statut: 'CORRESPONDANCE_FUZZY',
      statutP5: 'A_VALIDER',
      methode: 'FUZZY',
      explication: `Correspondance incertaine (${score1}%) avec ${topCandidat.salarie.nomComplet} (arbitrage humain requis)`,
      validation: 'A_VALIDER',
      valideParHumain: false,
      dateRapprochement: maintenant,
      enregistrerCommeAlias: false,
      candidats: scoresCandidats.slice(0, 5),
      candidatsAmbigus: scoresCandidats.slice(1, 3).filter(c => c.score >= 60).map(c => ({
        salarie: c.salarie,
        score: c.score,
        raison: c.raison || '',
      })),
      validationJours: validationJoursInitiale,
    };
    res.statutP5 = determinerStatutLigneP5(res);
    return res;
  }

  // Cas < 80% : NON_IDENTIFIE / À VÉRIFIER (ex: SAFWAN DAOU)
  // RÈGLE D'OR : Ne JAMAIS classer automatiquement en nouveau salarié !
  const res: ResultatRapprochement = {
    id: `rap_${ligne.id}`,
    lignePaieId: ligne.id,
    salariePropose: topCandidat && score1 >= 50 ? topCandidat.salarie : undefined,
    score: score1,
    secondScore: score2,
    ecartScore,
    statut: 'NON_IDENTIFIE',
    statutP5: 'NON_IDENTIFIE',
    methode: 'AUCUNE',
    explication: topCandidat && score1 >= 50
      ? `Aucun profil fiable dans la base (plus proche suggestion : ${topCandidat.salarie.nomComplet} à ${score1}%)`
      : 'Aucun profil similaire dans la base CNSS',
    validation: 'A_VALIDER',
    valideParHumain: false,
    dateRapprochement: maintenant,
    candidats: scoresCandidats.slice(0, 5),
    candidatsAmbigus: scoresCandidats.slice(0, 3).filter(c => c.score >= 40).map(c => ({
      salarie: c.salarie,
      score: c.score,
      raison: c.raison || '',
    })),
    enregistrerCommeAlias: false,
    validationJours: validationJoursInitiale,
  };
  res.statutP5 = determinerStatutLigneP5(res);
  return res;
}

/**
 * Exécute le rapprochement de l'ensemble d'une liste de lignes de paie
 */
export function executerRapprochement(
  lignes: LignePaieImportee[],
  baseSalaries: SalarieReferentiel[]
): ResultatRapprochement[] {
  return lignes.map(l => rapprocherLigne(l, baseSalaries));
}

export const matchingEngine = {
  rapprocher: (lignes: LignePaieImportee[], baseSalaries: SalarieReferentiel[], _aliases?: any[]) =>
    executerRapprochement(lignes, baseSalaries),
  rapprocherLigne,
  determinerStatutLigneP5,
};
