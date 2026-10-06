/**
 * Banc de tests automatisés pour PROMPT 07-B (Section 24)
 * Validation du moteur de génération des Bordereaux CNSS MULT.S :
 * - Bordereau des Salariés (F.212-2-58)
 * - Bordereau des Entrants (F.212-2-59)
 * Contrôles stricts d'éligibilité, séparation déclaration/paiement,
 * immuabilité du registre et déterminisme absolu.
 */

import { cnssBordereauService } from '../services/cnssBordereauService';
import { LigneRegistreCnss, AnomalieLigne } from '../types/cnss';
import { EntrepriseCnssConfig } from '../types/cnssBordereau';

export interface ResultatTest07B {
  id: string;
  cas: string;
  attendu: string;
  obtenu: string;
  succes: boolean;
  details?: string;
}

export interface BilanPrompt07B {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTest07B[];
}

const CONFIG_VALIDE_TEST: EntrepriseCnssConfig = {
  raisonSociale: 'STE MULT.S',
  numeroAffiliation: '6541835',
  agence: 'SIDI BELYOUT',
  adresse: '77 RUE MOHAMED SMIHA ETG 10 N 57',
  ville: 'CASABLANCA',
  codeFormulaireOrdinaires: 'F.212-2-58',
  codeFormulaireEntrants: 'F.212-2-59',
  lignesParPage: 12,
};

/**
 * Crée une ligne de registre factice mais valide par défaut
 */
function creerLigneRegistreTest(overrides: Partial<LigneRegistreCnss> = {}): LigneRegistreCnss {
  const idGen = Math.random().toString(36).substring(2, 9);
  return {
    id: `reg_${idGen}`,
    periodeId: '2026-09',
    lignePaieId: `paie_${idGen}`,
    salarieId: `sal_${idGen}`,
    nomSource: 'ALAMI MOHAMED',
    nomOfficiel: 'ALAMI MOHAMED',
    cni: 'BE123456',
    cnss: '101455267',
    joursImportes: 22,
    joursDeclares: 22,
    baseImportee: 3500,
    baseDeclaree: 3500,
    salaireBrutImporte: 3500,
    salaireBrutDeclare: 3500,
    situation: 'ACTIF',
    statutRapprochement: 'CORRESPONDANCE_CNI',
    statut: 'VALIDE',
    anomalies: [],
    corrections: [],
    motifsBlocage: [],
    derniereModification: new Date().toISOString(),
    valide: true,
    verrouille: false,
    ...overrides,
  };
}

export function executerTestsPrompt07B(): BilanPrompt07B {
  const resultats: ResultatTest07B[] = [];

  function assertTest(
    id: string,
    cas: string,
    condition: boolean,
    attendu: string,
    obtenu: string,
    details?: string
  ) {
    resultats.push({
      id,
      cas,
      attendu,
      obtenu,
      succes: condition,
      details,
    });
  }

  // -------------------------------------------------------------------------
  // TEST 1 : Registre validé -> génération possible
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ id: 'r1', nomOfficiel: 'YOUSSEF RAZAKI', cnss: '101455267', joursDeclares: 25 }),
      creerLigneRegistreTest({ id: 'r2', nomOfficiel: 'ASSIA KOUTOUBI', cnss: '105318057', joursDeclares: 23 }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_01',
      'Registre validé -> génération possible',
      gen.succes === true && gen.document !== null && gen.document.totalSalariesDeclares === 2,
      'succes = true, totalSalariesDeclares = 2',
      `succes = ${gen.succes}, total = ${gen.document?.totalSalariesDeclares}`,
      'Un registre comportant 2 lignes validées sans anomalies permet la génération du bordereau'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 2 : Registre non validé -> génération refusée
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ id: 'r1', valide: false, statut: 'BROUILLON' }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_02',
      'Registre non validé -> génération refusée',
      gen.succes === false && gen.document === null && gen.bilanEligibilite.bloquants.length > 0,
      'succes = false, génération bloquée',
      `succes = ${gen.succes}, bloquants = ${gen.bilanEligibilite.bloquants.length}`,
      'Une ligne non validée (statut BROUILLON, valide=false) bloque immédiatement la génération'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 3 : N° affiliation absent -> refus
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest()];
    const configSansAff = { ...CONFIG_VALIDE_TEST, numeroAffiliation: '' };
    const gen = cnssBordereauService.genererBordereau(reg, configSansAff, '2026-09');
    assertTest(
      'TEST_07B_03',
      'N° affiliation absent -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('affiliation')),
      'succes = false avec blocage sur affiliation manquante',
      `succes = ${gen.succes}, bloquant détecté = ${gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('affiliation'))}`,
      "Le numéro d'affiliation CNSS est strictement obligatoire pour éditer le bordereau"
    );
  }

  // -------------------------------------------------------------------------
  // TEST 4 : Agence absente -> refus
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest()];
    const configSansAgence = { ...CONFIG_VALIDE_TEST, agence: '   ' };
    const gen = cnssBordereauService.genererBordereau(reg, configSansAgence, '2026-09');
    assertTest(
      'TEST_07B_04',
      'Agence absente -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('agence')),
      'succes = false avec blocage sur agence manquante',
      `succes = ${gen.succes}, bloquant détecté = ${gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('agence'))}`,
      "L'agence CNSS de rattachement doit être renseignée dans la configuration"
    );
  }

  // -------------------------------------------------------------------------
  // TEST 5 : CNSS absent -> refus
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest({ cnss: '' })];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_05',
      'CNSS absent pour un salarié -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('cnss absent')),
      'succes = false, blocage CNSS absent',
      `succes = ${gen.succes}, bloquants = ${gen.bilanEligibilite.bloquants.join('; ')}`,
      'Chaque salarié déclaré doit impérativement posséder une immatriculation CNSS'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 6 : CNSS invalide -> refus
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest({ cnss: '12345ABC' })]; // Non numérique et longueur < 9
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_06',
      'CNSS invalide (lettres ou != 9 chiffres) -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('invalide') || b.toLowerCase().includes('chiffres')),
      'succes = false, blocage CNSS invalide',
      `succes = ${gen.succes}`,
      'Un numéro CNSS comportant des lettres ou différent de 9 chiffres est rejeté'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 7 : Salarié ambigu -> refus
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        statut: 'BLOQUE',
        motifsBlocage: ['Correspondance ambiguë entre 2 candidats référentiels'],
      }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_07',
      'Salarié ambigu -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('ambigu') || b.toLowerCase().includes('bloqué')),
      'succes = false, bloqué car statut non résolu',
      `succes = ${gen.succes}`,
      'Une ligne avec ambiguïté non arbitrée bloque immédiatement la génération'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 8 : Salarié non identifié -> refus
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        nomOfficiel: 'NON IDENTIFIE',
        salarieId: undefined,
      }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_08',
      'Salarié non identifié -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('non identifié')),
      'succes = false, blocage salarié non identifié',
      `succes = ${gen.succes}`,
      'Aucun salarié non identifié ne peut figurer sur le bordereau officiel'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 9 : Anomalie bloquante non résolue -> refus
  // -------------------------------------------------------------------------
  {
    const anomalieBloquante: AnomalieLigne = {
      id: 'ano_1',
      salarieConcerne: 'TEST',
      code: 'JOURS_SUPERIEURS_26',
      gravite: 'BLOQUANTE',
      message: 'Jours supérieurs à 26',
      valeurOriginale: 28,
      estResolue: false,
    };
    const reg = [creerLigneRegistreTest({ anomalies: [anomalieBloquante] })];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_09',
      'Anomalie bloquante non résolue -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('anomalie bloquante')),
      'succes = false, blocage anomalie non résolue',
      `succes = ${gen.succes}`,
      'Une anomalie bloquante non résolue sur une ligne empêche toute génération'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 10 : joursImportes = 27 / joursDeclares = 26 -> bordereau = 26
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        nomOfficiel: 'YOUSSEF EL BAKKOURI',
        cnss: '133289464',
        joursImportes: 27,
        joursDeclares: 26, // Correction humaine validée
      }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    const doc = gen.document;
    const ligneBordereau = doc?.bordereauOrdinaires.pages[0]?.lignes[0];
    assertTest(
      'TEST_07B_10',
      'joursImportes = 27 / joursDeclares = 26 -> bordereau affiche 26',
      gen.succes === true && ligneBordereau?.nombreJours === 26 && reg[0].joursImportes === 27,
      'nombreJours = 26 et reg.joursImportes = 27 (immuable)',
      `nombreJours = ${ligneBordereau?.nombreJours}, reg.joursImportes = ${reg[0].joursImportes}`,
      'Le générateur utilise STRICTEMENT joursDeclares (26) tout en préservant intacts les joursImportes (27)'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 11 : joursImportes = -5 sans correction (joursDeclares = -5) -> refus
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        joursImportes: -5,
        joursDeclares: -5,
      }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_11',
      'joursImportes = -5 sans correction -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('négatif')),
      'succes = false, blocage jours négatifs',
      `succes = ${gen.succes}`,
      'Ne jamais transformer automatiquement -5 en 0. Le bordereau est formellement bloqué'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 12 : Entrant validé avec CNI -> présent dans BordereauEntrants
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        id: 'ent_1',
        nomOfficiel: 'ABDELKADER ALLAKI',
        cnss: '108918289',
        cni: 'TA95783',
        joursDeclares: 26,
        situation: 'NOUVEAU',
        statutRapprochement: 'NOUVEAU_CONFIRME',
      }),
      creerLigneRegistreTest({
        id: 'ord_1',
        nomOfficiel: 'YOUSSEF RAZAKI',
        cnss: '101455267',
        joursDeclares: 25,
        situation: 'ACTIF',
      }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    const doc = gen.document;
    const entrants = doc?.bordereauEntrants.pages[0]?.lignes || [];
    const ordinaires = doc?.bordereauOrdinaires.pages[0]?.lignes || [];

    assertTest(
      'TEST_07B_12',
      'Entrant validé avec CNI -> présent dans BordereauEntrants (F.212-2-59)',
      gen.succes === true &&
      entrants.length === 1 &&
      entrants[0].nomPrenom === 'ABDELKADER ALLAKI' &&
      entrants[0].cni === 'TA95783' &&
      ordinaires.length === 1 &&
      ordinaires[0].nomPrenom === 'YOUSSEF RAZAKI',
      '1 entrant dans bordereauEntrants, 1 ordinaire dans bordereauOrdinaires',
      `entrants = ${entrants.length}, ordinaires = ${ordinaires.length}`,
      'Ventilation exacte entre formulaire F.212-2-58 et F.212-2-59'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 13 : Entrant sans CNI -> refus
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        nomOfficiel: 'MOHAMED SAMIR',
        cnss: '146231468',
        cni: '', // CNI manquante pour un entrant !
        situation: 'NOUVEAU',
        statutRapprochement: 'NOUVEAU_CONFIRME',
      }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_13',
      'Entrant sans CNI -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('cni')),
      'succes = false, blocage CNI manquante pour entrant',
      `succes = ${gen.succes}`,
      'La CNI est strictement obligatoire sur le bordereau des salariés entrants'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 14 : Deux CNSS identiques dans le registre -> refus
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ id: 'r1', nomOfficiel: 'SALARIE 1', cnss: '101455267' }),
      creerLigneRegistreTest({ id: 'r2', nomOfficiel: 'SALARIE 2', cnss: '101455267' }), // Doublon CNSS
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_14',
      'Deux CNSS identiques -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.some(b => b.toLowerCase().includes('doublon')),
      'succes = false, blocage doublon CNSS',
      `succes = ${gen.succes}`,
      "Détection et blocage de deux lignes possédant le même numéro d'immatriculation CNSS"
    );
  }

  // -------------------------------------------------------------------------
  // TEST 15 : Salarié sorti non arbitré -> refus
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        nomOfficiel: 'SORTI INCONNU',
        situation: 'INCONNUE_SORTIE', // Pas arbitré 'SORTI' ou 'SO'
        statut: 'A_CORRIGER',
        valide: false,
      }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_15',
      'Salarié sorti non arbitré -> refus',
      gen.succes === false && gen.bilanEligibilite.bloquants.length > 0,
      'succes = false, non arbitré non éligible',
      `succes = ${gen.succes}`,
      'Un départ non confirmé et non validé bloque la déclaration'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 16 : Salarié sorti validé -> situation = 'SO' dans bordereau ordinaires
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        nomOfficiel: 'AHMED KAWCHY',
        cnss: '133250160',
        joursDeclares: 0,
        situation: 'SORTI',
        valide: true,
      }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    const doc = gen.document;
    const ligne = doc?.bordereauOrdinaires.pages[0]?.lignes[0];
    assertTest(
      'TEST_07B_16',
      'Salarié sorti validé -> présent avec situation SO sur F.212-2-58',
      gen.succes === true && ligne?.situation === 'SO' && ligne?.nombreJours === 0,
      'situation = "SO", nombreJours = 0 sur bordereau ordinaires',
      `situation = ${ligne?.situation}, jours = ${ligne?.nombreJours}`,
      'Les salariés sortants confirmés figurent sur le bordereau F.212-2-58 avec le code officiel SO'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 17 : Période Octobre 2026 -> mois=10 et annee=2026 corrects
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest()];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-10');
    const doc = gen.document;
    assertTest(
      'TEST_07B_17',
      'Période Octobre 2026 -> mois=10 et année=2026 corrects',
      gen.succes === true && doc?.mois === 10 && doc?.annee === 2026 && doc.bordereauOrdinaires.mois === 10,
      'mois = 10, annee = 2026',
      `mois = ${doc?.mois}, annee = ${doc?.annee}`,
      'Extraction et projection exacte du mois et de l’année de déclaration'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 18 : Numéro d'affiliation configuré -> affiché correctement
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest()];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    const doc = gen.document;
    assertTest(
      'TEST_07B_18',
      "Numéro d'affiliation configuré (6541835) -> projeté fidèlement",
      gen.succes === true &&
      doc?.entreprise.numeroAffiliation === '6541835' &&
      doc?.bordereauOrdinaires.numeroAffiliation === '6541835',
      'numeroAffiliation = 6541835',
      `numeroAffiliation = ${doc?.entreprise.numeroAffiliation}`,
      "Le numéro d'affiliation CNSS configuré pour MULT.S est projeté sur les bordereaux"
    );
  }

  // -------------------------------------------------------------------------
  // TEST 19 : Génération identique avec mêmes données -> résultat déterministe
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ id: 'r1', nomOfficiel: 'YOUSSEF RAZAKI', cnss: '101455267', joursDeclares: 25 }),
      creerLigneRegistreTest({ id: 'r2', nomOfficiel: 'ASSIA KOUTOUBI', cnss: '105318057', joursDeclares: 23 }),
    ];
    const gen1 = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    const gen2 = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    assertTest(
      'TEST_07B_19',
      'Génération identique avec mêmes données -> résultat déterministe',
      gen1.succes && gen2.succes &&
      gen1.document?.hash === gen2.document?.hash &&
      gen1.document?.referenceStructuree === gen2.document?.referenceStructuree &&
      gen1.document?.totalJoursDeclares === gen2.document?.totalJoursDeclares,
      'Même hash, même référence structurée, mêmes totaux',
      `hash1 = ${gen1.document?.hash}, hash2 = ${gen2.document?.hash}`,
      'Le moteur est purement déterministe et reproductible'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 20 : Génération ne modifie JAMAIS le registre source
  // -------------------------------------------------------------------------
  {
    const regOriginal = [
      creerLigneRegistreTest({ id: 'r1', nomOfficiel: 'ALPHA', cnss: '101455267', joursImportes: 27, joursDeclares: 26 }),
      creerLigneRegistreTest({ id: 'r2', nomOfficiel: 'BETA', cnss: '105318057', joursImportes: 20, joursDeclares: 20 }),
    ];
    const snapshotAvant = JSON.stringify(regOriginal);
    cnssBordereauService.genererBordereau(regOriginal, CONFIG_VALIDE_TEST, '2026-09');
    const snapshotApres = JSON.stringify(regOriginal);

    assertTest(
      'TEST_07B_20',
      'Génération ne modifie jamais le registre source (immuabilité absolue)',
      snapshotAvant === snapshotApres,
      'snapshotAvant === snapshotApres (strictement identique)',
      snapshotAvant === snapshotApres ? 'Identique' : 'Différent',
      'Le registre source reste scellé et totalement inaltéré par la projection'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 21 : Pagination automatique (12 lignes par page) conforme au PDF réel
  // -------------------------------------------------------------------------
  {
    const reg25Lignes = Array.from({ length: 25 }, (_, i) =>
      creerLigneRegistreTest({
        id: `r_${i}`,
        nomOfficiel: `SALARIE ${i + 1}`,
        cnss: (100000000 + i).toString(),
        joursDeclares: 20,
      })
    );
    const gen = cnssBordereauService.genererBordereau(reg25Lignes, CONFIG_VALIDE_TEST, '2026-09');
    const doc = gen.document;
    const pages = doc?.bordereauOrdinaires.pages || [];
    assertTest(
      'TEST_07B_21',
      'Pagination 25 salariés à 12 par page -> 3 pages (12, 12, 1)',
      gen.succes === true &&
      pages.length === 3 &&
      pages[0].lignes.length === 12 &&
      pages[1].lignes.length === 12 &&
      pages[2].lignes.length === 1,
      '3 pages : P1=12, P2=12, P3=1',
      `pages = ${pages.length} (${pages.map(p => p.lignes.length).join(', ')})`,
      'La pagination découpe fidèlement les enregistrements en respectant le gabarit par page'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 22 : Cumul des jours par page et cumul des pages précédentes
  // -------------------------------------------------------------------------
  {
    const reg15Lignes = Array.from({ length: 15 }, (_, i) =>
      creerLigneRegistreTest({
        id: `r_${i}`,
        cnss: (200000000 + i).toString(),
        joursDeclares: 10,
      })
    );
    const gen = cnssBordereauService.genererBordereau(reg15Lignes, CONFIG_VALIDE_TEST, '2026-09');
    const p1 = gen.document?.bordereauOrdinaires.pages[0];
    const p2 = gen.document?.bordereauOrdinaires.pages[1];

    assertTest(
      'TEST_07B_22',
      'Cumul des jours : Page 1 (12x10=120 j), Page 2 (3x10=30 j, cumul précédent=120 j)',
      gen.succes === true &&
      p1?.totalJoursPage === 120 &&
      p1?.totalJoursCumulePrecedents === 0 &&
      p2?.totalJoursPage === 30 &&
      p2?.totalJoursCumulePrecedents === 120 &&
      p2?.totalJoursCumuleGlobal === 150,
      'P1 = 120 j, P2 = 30 j (cumul précéd = 120 j, global = 150 j)',
      `P1 = ${p1?.totalJoursPage} j, P2 = ${p2?.totalJoursPage} j (précéd: ${p2?.totalJoursCumulePrecedents} j)`,
      'Les totaux cumulés de chaque page respectent la règle comptable officielle'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 23 : Validation humaine formelle et verrouillage du bordereau
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest()];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    const docBrouillon = gen.document!;
    const docValide = cnssBordereauService.validerBordereau(docBrouillon, 'Directeur RH MULT.S');

    assertTest(
      'TEST_07B_23',
      'Validation humaine formelle -> statut VALIDE et traçabilité audit',
      docBrouillon.statut === 'BROUILLON' &&
      docValide.statut === 'VALIDE' &&
      docValide.validePar === 'Directeur RH MULT.S' &&
      !!docValide.dateValidation &&
      !!docValide.auditId,
      'statut = VALIDE avec validePar, dateValidation et auditId',
      `statut = ${docValide.statut}, validePar = ${docValide.validePar}`,
      'La validation humaine scelle le bordereau avec traçabilité complète'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 24 : Export CSV administratif avec mentions d’avertissement obligatoires
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ nomOfficiel: 'YOUSSEF RAZAKI', cnss: '101455267', joursDeclares: 25 }),
    ];
    const gen = cnssBordereauService.genererBordereau(reg, CONFIG_VALIDE_TEST, '2026-09');
    const csv = cnssBordereauService.exporterBordereauOrdinairesCsv(gen.document!);

    assertTest(
      'TEST_07B_24',
      'Export CSV avec mention expresse « format administratif interne »',
      csv.includes('format administratif interne') &&
      csv.includes('F.212-2-58') &&
      csv.includes('YOUSSEF RAZAKI') &&
      csv.includes('101455267'),
      'CSV contient disclaimer interne et données salariés',
      `Contient disclaimer = ${csv.includes('format administratif interne')}`,
      'Le document exporté mentionne explicitement qu’il s’agit d’un document administratif interne'
    );
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
