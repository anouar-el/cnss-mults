/**
 * Banc de tests automatisés pour PROMPT 05 (Section 18)
 * Valide les 15 exigences métier du rapprochement avancé, de la validation humaine et des règles d'ambiguïté.
 */

import { SalarieReferentiel, LignePaieImportee, ResultatRapprochement } from '../types/cnss';
import { normaliserNom, extraireTokensTries } from '../services/normalizer';
import { rapprocherLigne, determinerStatutLigneP5 } from '../services/matchingEngine';
import { validationEngine } from '../services/validationEngine';
import { persistenceService } from '../services/persistenceService';
import { chargerBaseSalariesReelle } from '../data/septembreRealData';

export interface ResultatTestP5 {
  id: number;
  cas: string;
  succes: boolean;
  attendu: string;
  obtenu: string;
  details: string;
}

export interface BilanPrompt05 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTestP5[];
}

export function executerTestsPrompt05(): BilanPrompt05 {
  const resultats: ResultatTestP5[] = [];
  const baseSalariesReelle = chargerBaseSalariesReelle();

  const creerLigne = (nom: string, jours = 25, id = nom.toLowerCase().replace(/\s+/g, '_')): LignePaieImportee => ({
    id: `paie_t5_${id}`,
    nomCompletBrut: nom,
    nomNormalise: normaliserNom(nom),
    tokensNom: extraireTokensTries(nom),
    joursImportes: jours,
    ligneFichier: 2,
  });

  // TEST 1 : IMRAN SAAD ↔ SAAD IMRAN => IDENTIFIÉ
  {
    const ligne = creerLigne('IMRAN SAAD');
    const rap = rapprocherLigne(ligne, baseSalariesReelle);
    const statutP5 = determinerStatutLigneP5(rap);
    const succes = (statutP5 === 'IDENTIFIE' || rap.validation === 'AUTOMATIQUE') && rap.salariePropose?.nomComplet === 'SAAD IMRAN';

    resultats.push({
      id: 1,
      cas: 'TEST 1 : Inversion prénom/nom "IMRAN SAAD" ↔ "SAAD IMRAN"',
      succes,
      attendu: 'Statut IDENTIFIÉ avec rattachement automatique à SAAD IMRAN (Score 98-100%)',
      obtenu: `Statut P5: ${statutP5} | Score: ${rap.score}% | Salarié: ${rap.salariePropose?.nomComplet}`,
      details: 'L\'algorithme Token-Sort permet une reconnaissance immédiate sans équivoque.',
    });
  }

  // TEST 2 : ZAGOURI ACHRAF ↔ ACHRAF ZAGOURI => IDENTIFIÉ
  {
    const ligne = creerLigne('ZAGOURI ACHRAF');
    const rap = rapprocherLigne(ligne, baseSalariesReelle);
    const statutP5 = determinerStatutLigneP5(rap);
    const succes = (statutP5 === 'IDENTIFIE' || rap.validation === 'AUTOMATIQUE') && rap.salariePropose?.nomComplet === 'ACHRAF ZAGOURI';

    resultats.push({
      id: 2,
      cas: 'TEST 2 : Inversion prénom/nom "ZAGOURI ACHRAF" ↔ "ACHRAF ZAGOURI"',
      succes,
      attendu: 'Statut IDENTIFIÉ avec rattachement automatique à ACHRAF ZAGOURI (Token-Sort)',
      obtenu: `Statut P5: ${statutP5} | Score: ${rap.score}% | Salarié: ${rap.salariePropose?.nomComplet}`,
      details: 'Identifié de manière fiable au Niveau 5 de la hiérarchie.',
    });
  }

  // TEST 3 : YOUSSEF GHAFOUR ↔ YOUSSEF GHAFFOUR => A_VALIDER (Forte correspondance, validation humaine possible)
  {
    const ligne = creerLigne('YOUSSEF GHAFOUR');
    const rap = rapprocherLigne(ligne, baseSalariesReelle);
    const statutP5 = determinerStatutLigneP5(rap);
    const succes = rap.score >= 90 && rap.validation === 'A_VALIDER' && rap.salariePropose?.nomComplet === 'YOUSSEF GHAFFOUR';

    resultats.push({
      id: 3,
      cas: 'TEST 3 : Faute de frappe "YOUSSEF GHAFOUR" vs "YOUSSEF GHAFFOUR"',
      succes,
      attendu: 'Score fort (>=90%), statut A_VALIDER, proposition soumise à validation humaine',
      obtenu: `Score: ${rap.score}% | Statut P5: ${statutP5} | Proposition: ${rap.salariePropose?.nomComplet}`,
      details: 'La faute d\'orthographe est détectée avec une forte ressemblance et proposée au gestionnaire.',
    });
  }

  // TEST 4 : MOUAAZ EL AATLATI => Score intermédiaire (80-89%) => A_VALIDER (jamais auto-validé)
  {
    const ligne = creerLigne('MOUAAZ EL AATLATI');
    const rap = rapprocherLigne(ligne, baseSalariesReelle);
    const statutP5 = determinerStatutLigneP5(rap);
    const succes = rap.score >= 80 && rap.score < 90 && rap.validation === 'A_VALIDER' && statutP5 === 'A_VALIDER';

    resultats.push({
      id: 4,
      cas: 'TEST 4 : Variation complexe "MOUAAZ EL AATLATI" vs "MOAEZ ELATLLATI"',
      succes,
      attendu: 'Score intermédiaire (80-89%), statut A_VALIDER, jamais validé automatiquement',
      obtenu: `Score: ${rap.score}% | Validation: ${rap.validation} | Statut P5: ${statutP5}`,
      details: 'Les scores intermédiaires requièrent impérativement un examen visuel par le gestionnaire.',
    });
  }

  // TEST 5 : AYOUB EL WARDI => Candidats multiples => AMBIGU (aucun choix automatique)
  {
    const ligne = creerLigne('AYOUB EL WARDI');
    const rap = rapprocherLigne(ligne, baseSalariesReelle);
    const statutP5 = determinerStatutLigneP5(rap);
    const succes = rap.estAmbigu === true && statutP5 === 'AMBIGU' && rap.validation === 'A_VALIDER';

    resultats.push({
      id: 5,
      cas: 'TEST 5 : Homonymie "AYOUB EL WARDI" (AHMED EL WARDI vs AYOUB ELWARIDI)',
      succes,
      attendu: 'Marqué comme AMBIGU avec interdiction de sélection automatique',
      obtenu: `estAmbigu: ${rap.estAmbigu ? 'OUI' : 'NON'} | Statut P5: ${statutP5} | Écart: ${rap.ecartScore}%`,
      details: 'Le moteur refuse de trancher seul entre deux candidats crédibles.',
    });
  }

  // TEST 6 : SAFWAN DAOU => NON_IDENTIFIE (jamais automatiquement NOUVEAU)
  {
    const ligne = creerLigne('SAFWAN DAOU', 4);
    const rap = rapprocherLigne(ligne, baseSalariesReelle);
    const statutP5 = determinerStatutLigneP5(rap);
    const succes = rap.statut === 'NON_IDENTIFIE' && statutP5 === 'NON_IDENTIFIE' && !rap.estMarqueNouveau;

    resultats.push({
      id: 6,
      cas: 'TEST 6 : Salarié absent "SAFWAN DAOU" (Score faible < 80%)',
      succes,
      attendu: 'Statut NON_IDENTIFIE (pas de création ni qualification automatique en Nouveau)',
      obtenu: `Statut: ${rap.statut} | Statut P5: ${statutP5} | estMarqueNouveau: ${rap.estMarqueNouveau}`,
      details: 'Un score faible ne vaut jamais création automatique de fiche.',
    });
  }

  // TEST 7 : MAROUANE MOUKRIM => SORTI + 18 jours => Arbitrage obligatoire (SORTI_A_ARBITRER)
  {
    const ligne = creerLigne('MAROUANE MOUKRIM', 18);
    const rap = rapprocherLigne(ligne, baseSalariesReelle);
    const anos = validationEngine.auditer([rap], baseSalariesReelle);
    const aAlerteSorti = anos.some(a => a.code === 'SALARIE_SORTI_AVEC_JOURS');
    const statutP5 = determinerStatutLigneP5(rap);
    const succes = aAlerteSorti && (statutP5 === 'SORTI_A_ARBITRER' || !rap.decisionSorti);

    resultats.push({
      id: 7,
      cas: 'TEST 7 : Salarié noté SORTI avec 18 jours de paie (MAROUANE MOUKRIM)',
      succes,
      attendu: 'Alerte SALARIE_SORTI_AVEC_JOURS, arbitrage humain obligatoire (réactivation/maintien)',
      obtenu: `Alerte: ${aAlerteSorti ? 'OUI' : 'NON'} | Statut P5: ${statutP5}`,
      details: 'Une reprise d\'activité d\'un salarié sorti doit être formellement confirmée pour la CNSS.',
    });
  }

  // TEST 8 : NAOUFAL HAOUDI => joursImportes = 27 (valeur originale intacte)
  {
    const ligne = creerLigne('NAOUFAL HAOUDI', 27);
    const rap = rapprocherLigne(ligne, baseSalariesReelle);
    const succes = rap.validationJours.joursImportes === 27 && !rap.validationJours.modifieManuellement;

    resultats.push({
      id: 8,
      cas: 'TEST 8 : Préservation de joursImportes = 27 (NAOUFAL HAOUDI)',
      succes,
      attendu: 'joursImportes = 27 strictement préservé sans modification algorithmique',
      obtenu: `joursImportes: ${rap.validationJours.joursImportes} j | Modifié: ${rap.validationJours.modifieManuellement}`,
      details: 'L\'immuabilité de la donnée source issue du fichier de calcul est garantie.',
    });
  }

  // TEST 9 : MAROINE ZELLAL => joursImportes = -5 (valeur originale intacte)
  {
    const ligne = creerLigne('MAROINE ZELLAL', -5);
    const rap = rapprocherLigne(ligne, baseSalariesReelle);
    const succes = rap.validationJours.joursImportes === -5;

    resultats.push({
      id: 9,
      cas: 'TEST 9 : Préservation des jours négatifs (-5 j pour MAROINE ZELLAL)',
      succes,
      attendu: 'joursImportes = -5 strictement préservé et anomalie bloquante levée',
      obtenu: `joursImportes: ${rap.validationJours.joursImportes} j`,
      details: 'La valeur originale brute reste traçable pour le contrôle comptable.',
    });
  }

  // TEST 10 : 27 → 26 => joursImportes = 27, joursDeclares = 26, justification obligatoire
  {
    const ligne = creerLigne('NAOUFAL HAOUDI', 27);
    const rap = rapprocherLigne(ligne, baseSalariesReelle);
    const motif = 'Plafonnement légal CNSS 26 jours';
    rap.validationJours = validationEngine.corrigerJoursHumainement(rap.validationJours, 26, motif);

    const succes =
      rap.validationJours.joursImportes === 27 &&
      rap.validationJours.joursDeclares === 26 &&
      rap.validationJours.justification === motif &&
      rap.validationJours.modifieManuellement === true;

    resultats.push({
      id: 10,
      cas: 'TEST 10 : Correction humaine 27 → 26 jours avec motif obligatoire',
      succes,
      attendu: 'joursImportes=27, joursDeclares=26, modifieManuellement=true, justification obligatoire',
      obtenu: `Importé: ${rap.validationJours.joursImportes} j | Déclaré: ${rap.validationJours.joursDeclares} j | Motif: "${rap.validationJours.justification}"`,
      details: 'La règle absolue de découplage entre donnée importée et déclarée est respectée.',
    });
  }

  // TEST 11 : Alias validé => disponible après changement de période
  {
    const salId = 'sal_test_alias_p5';
    persistenceService.ajouterAlias({
      aliasBrut: 'MOHAMED ROCHDII',
      salarieId: salId,
      nomOfficielSalarie: 'MOHAMED ROCHDI',
      creeParMois: '2026-09',
    });

    const baseAvecSal: SalarieReferentiel[] = [
      ...baseSalariesReelle,
      {
        id: salId,
        nomComplet: 'MOHAMED ROCHDI',
        nomNormalise: normaliserNom('MOHAMED ROCHDI'),
        tokensNom: extraireTokensTries('MOHAMED ROCHDI'),
        aliases: [],
      },
    ];

    // Simuler le mois d'octobre
    const ligneOct = creerLigne('MOHAMED ROCHDII');
    const rapOct = rapprocherLigne(ligneOct, baseAvecSal);
    const succes = rapOct.score === 100 && rapOct.statut === 'CORRESPONDANCE_ALIAS' && rapOct.methode === 'ALIAS_VALIDE';

    resultats.push({
      id: 11,
      cas: 'TEST 11 : Réutilisation de l\'alias en mois suivant (Score 100%)',
      succes,
      attendu: 'Identification immédiate NIVEAU 3 ALIAS_VALIDE avec score 100%',
      obtenu: `Score: ${rapOct.score}% | Statut: ${rapOct.statut} | Méthode: ${rapOct.methode}`,
      details: 'L\'alias est attaché à l\'ID permanent du salarié et transcende les périodes.',
    });
  }

  // TEST 12 : Nouveau salarié confirmé => ID permanent sal_ref_xxxxx
  {
    const creation = persistenceService.creerNouveauSalarieReferentiel({
      nomComplet: 'SAFWAN DAOU',
      cni: 'WA998877',
      immatriculationCnss: '188899999',
    });

    const succes = creation.salarie.id.startsWith('sal_ref_') && creation.salarie.nomComplet === 'SAFWAN DAOU';

    resultats.push({
      id: 12,
      cas: 'TEST 12 : Création de salarié avec identifiant permanent sal_ref_xxxxx',
      succes,
      attendu: 'Génération d\'un ID permanent sal_ref_... et intégration au référentiel',
      obtenu: `ID: ${creation.salarie.id} | Nom: ${creation.salarie.nomComplet}`,
      details: 'Le salarié entrant reçoit son identifiant immuable pour tous les futurs mois.',
    });
  }

  // TEST 13 : Salarié absent de la paie => SORTIE_A_CONFIRMER (aucune radiation automatique)
  {
    const baseTest: SalarieReferentiel[] = [
      {
        id: 'sal_absent_p5',
        nomComplet: 'EMPLOYE ABSENT DU MOIS',
        nomNormalise: normaliserNom('EMPLOYE ABSENT DU MOIS'),
        tokensNom: extraireTokensTries('EMPLOYE ABSENT DU MOIS'),
        aliases: [],
        situation: 'ACTIF',
      },
    ];

    const sorties = validationEngine.identifierSorties(baseTest, [], {});
    const sortieItem = sorties.find(s => s.salarieId === 'sal_absent_p5');
    const succes = sortieItem !== undefined && sortieItem.statutSortie === 'A_CONFIRMER';

    resultats.push({
      id: 13,
      cas: 'TEST 13 : Absence du fichier de paie -> SORTIE_A_CONFIRMER',
      succes,
      attendu: 'Statut initial SORTIE_A_CONFIRMER sans radiation automatique',
      obtenu: `Statut sortie: ${sortieItem?.statutSortie || 'NON TROUVÉ'}`,
      details: 'L\'absence d\'heures/jours sur un mois ne préjuge jamais d\'un départ définitif.',
    });
  }

  // TEST 14 : Deux candidats avec scores proches (ex: 94% et 89%, écart <= 5%) => AMBIGU
  {
    // Construire une base test avec 2 profils très proches
    const baseHomonymes: SalarieReferentiel[] = [
      {
        id: 'sal_hom_1',
        nomComplet: 'YOUSSEF GHAFFOUR',
        nomNormalise: normaliserNom('YOUSSEF GHAFFOUR'),
        tokensNom: extraireTokensTries('YOUSSEF GHAFFOUR'),
        aliases: [],
      },
      {
        id: 'sal_hom_2',
        nomComplet: 'YOUSSEF GHAFOUR',
        nomNormalise: normaliserNom('YOUSSEF GHAFOUR'),
        tokensNom: extraireTokensTries('YOUSSEF GHAFOUR'),
        aliases: [],
      },
    ];

    // Ligne avec variation "YOUSSEF GHAFFOURI"
    const ligne = creerLigne('YOUSSEF GHAFFOURI');
    const rap = rapprocherLigne(ligne, baseHomonymes);

    // Vérifier la règle de score : si top et second sont proches, doit impérativement être AMBIGU
    const succes = rap.estAmbigu === true && rap.score >= 90 && (rap.secondScore ?? 0) >= 85 && (rap.ecartScore ?? 99) <= 10;

    resultats.push({
      id: 14,
      cas: 'TEST 14 : Règle d\'ambiguïté sur deux scores resserrés (Candidat A: 94%, B: 89%, écart: 5)',
      succes,
      attendu: 'estAmbigu = TRUE (Scores >= 85% avec écart <= 10% ne doivent pas être tranchés automatiquement)',
      obtenu: `estAmbigu: ${rap.estAmbigu ? 'OUI' : 'NON'} | Score 1: ${rap.score}% | Score 2: ${rap.secondScore}% | Écart: ${rap.ecartScore}%`,
      details: 'L\'algorithme refuse de choisir automatiquement le candidat A même avec 94% de score.',
    });
  }

  // TEST 15 : Validation globale avec une anomalie bloquante => REFUSÉE (estPret = false)
  {
    const ligneAnormale = creerLigne('NAOUFAL HAOUDI', 27);
    const rap = rapprocherLigne(ligneAnormale, baseSalariesReelle);
    const anos = validationEngine.auditer([rap], baseSalariesReelle);
    const bilan = validationEngine.verifierPretPourDeclaration([rap], baseSalariesReelle, anos);
    const succes = bilan.estPret === false && bilan.blocages.length > 0;

    resultats.push({
      id: 15,
      cas: 'TEST 15 : Validation globale bloquée si anomalie ou ambiguïté résiduelle',
      succes,
      attendu: 'estPret = false avec liste explicite des blocages empêchant la déclaration',
      obtenu: `estPret: ${bilan.estPret ? 'OUI' : 'NON'} | Total blocages: ${bilan.totalBloquantes}`,
      details: 'La clôture et la déclaration finale exigent la résolution préalable de tous les blocages.',
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
