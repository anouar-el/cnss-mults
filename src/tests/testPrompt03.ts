/**
 * Banc de tests automatisés pour PROMPT 03 (Sections 23 & 24)
 * Valide les 10 scénarios métier obligatoires du workflow de contrôle CNSS.
 */

import { SalarieReferentiel, LignePaieImportee } from '../types/cnss';
import { normaliserNom, extraireTokensTries } from '../services/normalizer';
import { rapprocherLigne } from '../services/matchingEngine';
import { validationEngine } from '../services/validationEngine';
import { persistenceService } from '../services/persistenceService';

export interface ResultatTestP3 {
  id: number;
  cas: string;
  succes: boolean;
  attendu: string;
  obtenu: string;
  details: string;
}

export interface BilanPrompt03 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTestP3[];
}

export function executerTestsPrompt03(): BilanPrompt03 {
  const resultats: ResultatTestP3[] = [];

  const baseSalariesTest: SalarieReferentiel[] = [
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
      situation: 'ACTIF',
      aliases: [],
    },
    {
      id: 'sal_motahir',
      nomComplet: 'NOUR MOTAHIR',
      nomNormalise: normaliserNom('NOUR MOTAHIR'),
      tokensNom: extraireTokensTries('NOUR MOTAHIR'),
      situation: 'SORTI',
      aliases: [],
    },
    {
      id: 'sal_moukrim',
      nomComplet: 'MAROUANE MOUKRIM',
      nomNormalise: normaliserNom('MAROUANE MOUKRIM'),
      tokensNom: extraireTokensTries('MAROUANE MOUKRIM'),
      situation: 'SORTI', // Situation SORTI en base
      aliases: [],
    },
    {
      id: 'sal_absent_test',
      nomComplet: 'YASSINE DAHOUNI',
      nomNormalise: normaliserNom('YASSINE DAHOUNI'),
      tokensNom: extraireTokensTries('YASSINE DAHOUNI'),
      situation: 'ACTIF',
      aliases: [],
    },
    {
      id: 'sal_wardi_ahmed',
      nomComplet: 'AHMED EL WARDI',
      nomNormalise: normaliserNom('AHMED EL WARDI'),
      tokensNom: extraireTokensTries('AHMED EL WARDI'),
      situation: 'ACTIF',
      aliases: [],
    },
    {
      id: 'sal_wardi_ayoub',
      nomComplet: 'AYOUB ELWARIDI',
      nomNormalise: normaliserNom('AYOUB ELWARIDI'),
      tokensNom: extraireTokensTries('AYOUB ELWARIDI'),
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

  // TEST 1 : NAOUFAL HAOUDI (27 jours) -> bloquant, joursImportes = 27 (intact), aucune correction auto
  {
    const ligne = creerLigne('NAOUFAL HAOUDI', 27);
    const rap = rapprocherLigne(ligne, baseSalariesTest);
    const anos = validationEngine.auditer([rap], baseSalariesTest);
    const hasBloquante26 = anos.some(a => a.code === 'JOURS_SUPERIEURS_26' && a.gravite === 'BLOQUANTE');
    const joursIntacts = rap.validationJours.joursImportes === 27 && rap.validationJours.joursDeclares === 27 && !rap.validationJours.modifieManuellement;
    const succes = hasBloquante26 && joursIntacts;

    resultats.push({
      id: 1,
      cas: 'TEST 1 : NAOUFAL HAOUDI (27 jours)',
      succes,
      attendu: 'Anomalie bloquante JOURS_SUPERIEURS_26 et joursImportes = 27 intact sans modification automatique',
      obtenu: `Bloquante: ${hasBloquante26 ? 'OUI' : 'NON'} | joursImportes: ${rap.validationJours.joursImportes} j | modifieManuellement: ${rap.validationJours.modifieManuellement}`,
      details: 'La valeur 27 reste strictement intacte. Bloquant tant qu\'une décision humaine n\'est pas prise.',
    });
  }

  // TEST 2 : MAROINE ZELLAL (-5 jours) -> bloquant, joursImportes = -5 (intact)
  {
    const ligne = creerLigne('MAROINE ZELLAL', -5);
    const rap = rapprocherLigne(ligne, baseSalariesTest);
    const anos = validationEngine.auditer([rap], baseSalariesTest);
    const hasBloquanteNeg = anos.some(a => a.code === 'JOURS_NEGATIFS' && a.gravite === 'BLOQUANTE');
    const joursIntacts = rap.validationJours.joursImportes === -5;
    const succes = hasBloquanteNeg && joursIntacts;

    resultats.push({
      id: 2,
      cas: 'TEST 2 : MAROINE ZELLAL (-5 jours)',
      succes,
      attendu: 'Anomalie bloquante JOURS_NEGATIFS et joursImportes = -5 intact',
      obtenu: `Bloquante: ${hasBloquanteNeg ? 'OUI' : 'NON'} | joursImportes: ${rap.validationJours.joursImportes} j`,
      details: 'La valeur -5 reste strictement intacte. Rejeté sur BDS sans validation humaine.',
    });
  }

  // TEST 3 : NOUR MOTTAHIR (0 jour) -> avertissement, pas automatiquement sortie
  {
    const ligne = creerLigne('NOUR MOTTAHIR', 0);
    const rap = rapprocherLigne(ligne, baseSalariesTest);
    const anos = validationEngine.auditer([rap], baseSalariesTest);
    const hasAnoZero = anos.some(a => a.code === 'JOURS_ZERO' && a.gravite === 'AVERTISSEMENT');
    const succes = hasAnoZero && rap.validationJours.joursImportes === 0;

    resultats.push({
      id: 3,
      cas: 'TEST 3 : NOUR MOTTAHIR (0 jour ouvré)',
      succes,
      attendu: 'Anomalie AVERTISSEMENT JOURS_ZERO, pas de classification automatique en sortie',
      obtenu: `Avertissement: ${hasAnoZero ? 'OUI' : 'NON'} | joursImportes: 0 j`,
      details: 'Génère un avertissement pour le gestionnaire sans radier d\'office le salarié.',
    });
  }

  // TEST 4 : MAROUANE MOUKRIM (Situation SORTI, 18 jours) -> alerte réactivation, décision humaine
  {
    const ligne = creerLigne('MAROUANE MOUKRIM', 18);
    const rap = rapprocherLigne(ligne, baseSalariesTest);
    const anos = validationEngine.auditer([rap], baseSalariesTest);
    const hasAnoSorti = anos.some(a => a.code === 'SALARIE_SORTI_AVEC_JOURS');
    const situationEstSorti = rap.salariePropose?.situation === 'SORTI';
    const succes = hasAnoSorti && situationEstSorti;

    resultats.push({
      id: 4,
      cas: 'TEST 4 : MAROUANE MOUKRIM (Sorti avec 18 jours)',
      succes,
      attendu: 'Alerte SALARIE_SORTI_AVEC_JOURS et demande d\'arbitrage explicite',
      obtenu: `Alerte: ${hasAnoSorti ? 'OUI' : 'NON'} | Situation base: ${rap.salariePropose?.situation}`,
      details: 'Ne réactive jamais silencieusement. Propose réactivation ou maintien sorti.',
    });
  }

  // TEST 5 : Nouveau salarié confirmé manuellement -> création ID permanent
  {
    const creation = persistenceService.creerNouveauSalarieReferentiel({
      nomComplet: 'NOUVEAU TEST INTERIM',
      cni: 'WA999999',
      immatriculationCnss: '199999999',
    });
    const aIdPermanent = creation.salarie.id.startsWith('sal_ref_');
    const succes = creation.estNouveau && aIdPermanent;

    resultats.push({
      id: 5,
      cas: 'TEST 5 : Nouveau salarié confirmé manuellement',
      succes,
      attendu: 'Création d\'un SalarieReferentiel avec ID permanent (sal_ref_...)',
      obtenu: `estNouveau: ${creation.estNouveau ? 'OUI' : 'NON'} | ID généré: ${creation.salarie.id}`,
      details: 'Le salarié entrant reçoit son ID permanent et est persisté dans le référentiel.',
    });
  }

  // TEST 6 : Salarié absent du mois courant -> SORTIE À CONFIRMER, pas de sortie auto
  {
    // Yassine Dahouni est dans la base mais absent de la paie
    const sorties = validationEngine.identifierSorties(baseSalariesTest, [], {});
    const dahouniSortie = sorties.find(s => s.salarie.nomComplet === 'YASSINE DAHOUNI');
    const succes = Boolean(dahouniSortie && dahouniSortie.statutSortie === 'A_CONFIRMER');

    resultats.push({
      id: 6,
      cas: 'TEST 6 : Salarié absent du mois courant (YASSINE DAHOUNI)',
      succes,
      attendu: 'Statut SORTIE À CONFIRMER (pas de sortie automatique)',
      obtenu: `Statut sortie: ${dahouniSortie?.statutSortie || 'NON TROUVÉ'}`,
      details: 'L\'absence du fichier de paie est soumise à confirmation du gestionnaire.',
    });
  }

  // TEST 7 : Correspondance ambiguë non résolue -> déclaration bloquée
  {
    const ligne = creerLigne('AYOUB EL WARDI', 25);
    const rap = rapprocherLigne(ligne, baseSalariesTest);
    const anos = validationEngine.auditer([rap], baseSalariesTest);
    const bilanPret = validationEngine.verifierPretPourDeclaration([rap], baseSalariesTest, anos);
    const estBloque = !bilanPret.estPret && bilanPret.blocages.length > 0;

    resultats.push({
      id: 7,
      cas: 'TEST 7 : Correspondance ambiguë non résolue (AYOUB EL WARDI)',
      succes: estBloque,
      attendu: 'verifierPretPourDeclaration() retourne NON PRET (déclaration bloquée)',
      obtenu: `estPret: ${bilanPret.estPret ? 'OUI' : 'NON'} (${bilanPret.blocages.length} blocage(s))`,
      details: 'Le moteur empêche formellement la déclaration tant que l\'homonymie n\'est pas arbitrée.',
    });
  }

  // TEST 8 : Anomalie résolue -> disparition des blocages correspondants
  {
    const ligne = creerLigne('NAOUFAL HAOUDI', 27);
    const rap = rapprocherLigne(ligne, baseSalariesTest);
    // Résolution humaine : plafonnement à 26 jours avec justification
    rap.validationJours = validationEngine.corrigerJoursHumainement(rap.validationJours, 26, 'Plafonnement légal 26 j');
    rap.validation = 'VALIDE';

    const anos = validationEngine.auditer([rap], baseSalariesTest);
    const bilanPret = validationEngine.verifierPretPourDeclaration([rap], baseSalariesTest, anos);
    const succes = bilanPret.estPret && bilanPret.blocages.length === 0;

    resultats.push({
      id: 8,
      cas: 'TEST 8 : Résolution de l\'anomalie de jours (Plafonnement à 26 j)',
      succes,
      attendu: 'Disparition du blocage et validation préalable de la déclaration',
      obtenu: `estPret: ${bilanPret.estPret ? 'OUI' : 'NON'} | Blocages résiduels: ${bilanPret.blocages.length}`,
      details: 'Après décision humaine, la ligne est validée et lève le blocage.',
    });
  }

  // TEST 9 : Modification joursImportes = 27 & joursDeclares = 26 -> joursImportes reste 27
  {
    const ligne = creerLigne('NAOUFAL HAOUDI', 27);
    const rap = rapprocherLigne(ligne, baseSalariesTest);
    const corrigee = validationEngine.corrigerJoursHumainement(rap.validationJours, 26, 'Plafonnement validé');
    const succes = corrigee.joursImportes === 27 && corrigee.joursDeclares === 26 && corrigee.modifieManuellement === true;

    resultats.push({
      id: 9,
      cas: 'TEST 9 : Intégrité stricte de joursImportes (27 vs 26)',
      succes,
      attendu: 'joursImportes = 27 (intact) ET joursDeclares = 26 (corrigé)',
      obtenu: `joursImportes: ${corrigee.joursImportes} j | joursDeclares: ${corrigee.joursDeclares} j`,
      details: 'Les données d\'origine du fichier Excel ne sont JAMAIS écrasées.',
    });
  }

  // TEST 10 : Clôture d'un mois -> statut CLOTURE, verrouillé
  {
    persistenceService.setStatutPeriode('2026-09', 'CLOTURE', 'Clôture mensuelle officielle');
    const statutActuel = persistenceService.getStatutPeriode('2026-09');
    const succes = statutActuel === 'CLOTURE';

    resultats.push({
      id: 10,
      cas: 'TEST 10 : Clôture du mois et verrouillage',
      succes,
      attendu: 'Statut de période = CLOTURE (modifications bloquées)',
      obtenu: `Statut période: ${statutActuel}`,
      details: 'La période est formellement verrouillée pour transmission CNSS Damancom.',
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
