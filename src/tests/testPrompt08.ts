/**
 * Banc de tests automatisés pour PROMPT 08 (Section 32)
 * Validation du module Bordereau de Paiement des Cotisations CNSS MULT.S :
 * - Régime Général (Formulaire officiel Réf 511-1-01 Page 1)
 * - Assurance Maladie Obligatoire AMO (Formulaire officiel Réf 511-1-01 Page 2)
 * - Contrôle croisé tripartite (Registre vs Bordereau Déclaration vs Paiement)
 * - Immuabilité, traçabilité et validation formelle.
 */

import { cnssPaiementService } from '../services/cnssPaiementService';
import { cnssBordereauService } from '../services/cnssBordereauService';
import { LigneRegistreCnss, AnomalieLigne } from '../types/cnss';
import { EntrepriseCnssConfig } from '../types/cnssBordereau';
import { CnssTauxItem } from '../types/cnssPaiement';

export interface ResultatTest08 {
  id: string;
  cas: string;
  attendu: string;
  obtenu: string;
  succes: boolean;
  details?: string;
}

export interface BilanPrompt08 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTest08[];
}

const CONFIG_ENTREPRISE_TEST: EntrepriseCnssConfig = {
  raisonSociale: 'STE MULT.S',
  numeroAffiliation: '6541835',
  agence: 'SIDI BELYOUT',
  adresse: '77 RUE MOHAMED SMIHA ETG 10 N 57',
  ville: 'CASABLANCA',
  codeFormulaireOrdinaires: 'F.212-2-58',
  codeFormulaireEntrants: 'F.212-2-59',
  lignesParPage: 12,
};

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
    baseImportee: 4000,
    baseDeclaree: 4000,
    salaireBrutImporte: 4000,
    salaireBrutDeclare: 4000,
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

export function executerTestsPrompt08(): BilanPrompt08 {
  const resultats: ResultatTest08[] = [];

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
  // TEST 01 : Registre validé -> calcul possible si toutes les règles sont confirmées
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ id: 'r1', salaireBrutDeclare: 5000, joursDeclares: 25, cnss: '101455267' }),
      creerLigneRegistreTest({ id: 'r2', salaireBrutDeclare: 7000, joursDeclares: 26, cnss: '105318057' }),
    ];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_01',
      'Registre validé -> calcul possible avec toutes règles confirmées',
      res.succes === true && res.document !== null && res.document.totalGlobalAPayer > 0,
      'succes = true et document généré',
      `succes = ${res.succes}, total = ${res.document?.totalGlobalAPayer} MAD`,
      'Calcul exécuté sans anomalie sur un registre validé'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 02 : Registre non validé -> calcul bloqué
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ id: 'r1', valide: false, statut: 'BROUILLON' }),
    ];
    const res = cnssPaiementService.calculerBordereauPaiement(reg, null, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_02',
      'Registre non validé -> calcul bloqué',
      res.succes === false && res.document === null && res.controleCroise.totalBloquants > 0,
      'succes = false, calcul bloqué',
      `succes = ${res.succes}, bloquants = ${res.controleCroise.totalBloquants}`,
      'Une ligne non validée dans le registre bloque immédiatement le paiement'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 03 : Numéro affiliation absent -> bloqué
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest()];
    const configSansAff = { ...CONFIG_ENTREPRISE_TEST, numeroAffiliation: '' };
    const res = cnssPaiementService.calculerBordereauPaiement(reg, null, configSansAff, '2026-09');

    assertTest(
      'TEST_08_03',
      'Numéro affiliation absent -> bloqué',
      res.succes === false && res.controleCroise.ecarts.some(e => e.id.includes('aff_manquant')),
      'succes = false, blocage affiliation absente',
      `succes = ${res.succes}`,
      "Le numéro d'affiliation employeur est strictement obligatoire pour le bordereau de paiement"
    );
  }

  // -------------------------------------------------------------------------
  // TEST 04 : Taux non confirmé -> rubrique bloquée
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest()];
    const tauxModifies = cnssPaiementService.TAUX_OFFICIELS_DEFAUT.map(t =>
      t.codeRubrique === 'ALLOCATIONS_FAMILIALES' ? { ...t, confirme: false } : t
    );
    const res = cnssPaiementService.calculerBordereauPaiement(
      reg,
      null,
      CONFIG_ENTREPRISE_TEST,
      '2026-09',
      'Gestionnaire',
      tauxModifies
    );

    assertTest(
      'TEST_08_04',
      'Taux non confirmé -> rubrique et calcul bloqués',
      res.succes === false && res.controleCroise.ecarts.some(e => e.type === 'TAUX_INVALIDE'),
      'succes = false, taux non confirmé bloque le calcul',
      `succes = ${res.succes}`,
      'Ne rien inventer : si un taux n’est pas confirmé, le calcul de paiement est formellement bloqué'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 05 : Formule non confirmée -> rubrique bloquée
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest()];
    const tauxModifies = cnssPaiementService.TAUX_OFFICIELS_DEFAUT.map(t =>
      t.codeRubrique === 'PRESTATIONS_SOCIALES' ? { ...t, confirme: false } : t
    );
    const res = cnssPaiementService.calculerBordereauPaiement(
      reg,
      null,
      CONFIG_ENTREPRISE_TEST,
      '2026-09',
      'Gestionnaire',
      tauxModifies
    );

    assertTest(
      'TEST_08_05',
      'Formule non confirmée -> rubrique bloquée',
      res.succes === false && res.controleCroise.totalBloquants > 0,
      'succes = false, bloqué car règle non confirmée',
      `succes = ${res.succes}`,
      'Une règle dont la formule n’est pas confirmée ne peut être calculée'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 06 : Assiette manquante (registre vide) -> bloqué
  // -------------------------------------------------------------------------
  {
    const res = cnssPaiementService.calculerBordereauPaiement([], null, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_06',
      'Assiette manquante (registre vide) -> bloqué',
      res.succes === false && res.controleCroise.ecarts.some(e => e.id.includes('reg_vide')),
      'succes = false, registre vide bloquant',
      `succes = ${res.succes}`,
      'Sans assiette ni salarié, aucun bordereau de paiement ne peut être émis'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 07 : joursImportes = 27 / joursDeclares = 26 -> utiliser la donnée déclarée correspondante
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        joursImportes: 27,
        joursDeclares: 26,
        salaireBrutImporte: 4000,
        salaireBrutDeclare: 4000,
      }),
    ];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09');
    const sal = res.document?.cotisationsSalaries[0];

    assertTest(
      'TEST_08_07',
      'joursImportes = 27 / joursDeclares = 26 -> utilise strictement joursDeclares = 26',
      res.succes && sal?.joursDeclares === 26 && reg[0].joursImportes === 27,
      'joursDeclares = 26 et joursImportes = 27 intact',
      `sal.joursDeclares = ${sal?.joursDeclares}, reg.joursImportes = ${reg[0].joursImportes}`,
      'Le calcul financier se base exclusivement sur les valeurs validées déclarées'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 08 : Jours négatifs non corrigés -> bloqué
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        joursImportes: -4,
        joursDeclares: -4,
      }),
    ];
    const res = cnssPaiementService.calculerBordereauPaiement(reg, null, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_08',
      'Jours négatifs non corrigés -> bloqué',
      res.succes === false && res.controleCroise.ecarts.some(e => e.id.includes('jours_negatifs')),
      'succes = false, blocage jours négatifs',
      `succes = ${res.succes}`,
      'Des jours négatifs non régularisés interdisent le calcul de versement'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 09 : Salarié ambigu -> exclu du calcul et blocage global
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        motifsBlocage: ['Correspondance ambiguë à arbitrer'],
      }),
    ];
    const res = cnssPaiementService.calculerBordereauPaiement(reg, null, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_09',
      'Salarié ambigu -> exclu du calcul et blocage global',
      res.succes === false && res.controleCroise.ecarts.some(e => e.id.includes('ambigu')),
      'succes = false, bloqué pour ambiguïté',
      `succes = ${res.succes}`,
      'Toute ambiguïté résiduelle bloque le bordereau de paiement'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 10 : Salarié non identifié -> blocage
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        nomOfficiel: 'NON IDENTIFIE',
        salarieId: undefined,
      }),
    ];
    const res = cnssPaiementService.calculerBordereauPaiement(reg, null, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_10',
      'Salarié non identifié -> blocage',
      res.succes === false && res.controleCroise.ecarts.some(e => e.id.includes('non_identifie')),
      'succes = false, salarié non identifié bloquant',
      `succes = ${res.succes}`,
      'Un salarié non identifié ne peut avoir de cotisations déclarées'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 11 : Entrant validé -> pris en compte selon les règles
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        id: 'ent_1',
        nomOfficiel: 'ABDELKADER ALLAKI',
        cnss: '108918289',
        cni: 'TA95783',
        salaireBrutDeclare: 3000,
        joursDeclares: 26,
        situation: 'NOUVEAU',
        statutRapprochement: 'NOUVEAU_CONFIRME',
      }),
    ];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_11',
      'Entrant validé -> inclus dans les masses salariales et cotisations',
      res.succes === true && res.document?.masseBruteDeclaree === 3000 && res.document.nombreSalariesDeclares === 1,
      'masseBrute = 3000, salaries = 1',
      `masseBrute = ${res.document?.masseBruteDeclaree}, salaries = ${res.document?.nombreSalariesDeclares}`,
      'Les nouveaux entrants validés sont intégrés dans les cotisations'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 12 : Sortant validé -> pris en compte avec ses données validées
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({
        id: 'sort_1',
        nomOfficiel: 'AHMED KAWCHY',
        cnss: '133250160',
        salaireBrutDeclare: 1500,
        joursDeclares: 10,
        situation: 'SORTI',
      }),
    ];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_12',
      'Sortant validé -> pris en compte avec ses données validées (10 jours, 1500 MAD)',
      res.succes === true && res.document?.masseBruteDeclaree === 1500 && res.document.totalJoursDeclares === 10,
      'masseBrute = 1500, jours = 10',
      `masseBrute = ${res.document?.masseBruteDeclaree}, jours = ${res.document?.totalJoursDeclares}`,
      'Les sortants confirmés sont cotisés sur leurs salaires validés réels'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 13 : Doublon CNSS -> blocage
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ id: 'r1', nomOfficiel: 'SALARIE A', cnss: '101455267' }),
      creerLigneRegistreTest({ id: 'r2', nomOfficiel: 'SALARIE B', cnss: '101455267' }),
    ];
    const res = cnssPaiementService.calculerBordereauPaiement(reg, null, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_13',
      'Doublon CNSS -> blocage',
      res.succes === false && res.controleCroise.ecarts.some(e => e.id.includes('doublon_cnss')),
      'succes = false, blocage doublon CNSS',
      `succes = ${res.succes}`,
      'Deux lignes avec le même matricule CNSS bloquent le calcul du versement'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 14 : Masse brute calculée correctement
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ id: 'r1', salaireBrutDeclare: 3250.50, cnss: '101455267' }),
      creerLigneRegistreTest({ id: 'r2', salaireBrutDeclare: 4749.50, cnss: '105318057' }),
    ];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_14',
      'Masse brute calculée correctement : 3250.50 + 4749.50 = 8000.00 MAD',
      res.succes === true && res.document?.masseBruteDeclaree === 8000.00,
      'masseBruteDeclaree = 8000.00',
      `masseBruteDeclaree = ${res.document?.masseBruteDeclaree}`,
      'Somme arithmétique exacte des salaires bruts déclarés'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 15 : Base cotisable plafonnée à 6000 MAD pour Prestations Sociales
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ id: 'r1', salaireBrutDeclare: 8000, cnss: '101455267' }), // Plafonné à 6000
      creerLigneRegistreTest({ id: 'r2', salaireBrutDeclare: 4000, cnss: '105318057' }), // Inférieur -> 4000
    ];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_15',
      'Base déclarée plafonnée calculée correctement : Min(8000,6000) + 4000 = 10 000 MAD',
      res.succes === true && res.document?.masseCotisablePlafonnee === 10000.00 && res.document.masseBruteDeclaree === 12000.00,
      'masseCotisablePlafonnee = 10000.00, masseBrute = 12000.00',
      `plafonnee = ${res.document?.masseCotisablePlafonnee}, brute = ${res.document?.masseBruteDeclaree}`,
      'Plafonnement légal de 6 000 MAD appliqué individuellement par salarié pour les Prestations Sociales'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 16 : Assiette correcte selon la rubrique
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreTest({ id: 'r1', salaireBrutDeclare: 10000, cnss: '101455267' }),
    ];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09');

    const lAf = res.document?.voletRegimeGeneral.lignes.find(l => l.codeRubrique === 'ALLOCATIONS_FAMILIALES');
    const lPs = res.document?.voletRegimeGeneral.lignes.find(l => l.codeRubrique === 'PRESTATIONS_SOCIALES');
    const lAmo = res.document?.voletAmo.lignes.find(l => l.codeRubrique === 'AMO_COTISATION');

    assertTest(
      'TEST_08_16',
      'Assiette : Déplafonnée (10000) pour AF et AMO, Plafonnée (6000) pour PS',
      res.succes && lAf?.assietteRetenue === 10000 && lPs?.assietteRetenue === 6000 && lAmo?.assietteRetenue === 10000,
      'AF = 10000, PS = 6000, AMO = 10000',
      `AF = ${lAf?.assietteRetenue}, PS = ${lPs?.assietteRetenue}, AMO = ${lAmo?.assietteRetenue}`,
      'Ventilation exacte entre assiettes plafonnées et déplafonnées'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 17 : Taux confirmés appliqués fidèlement au document 511-1-01
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest({ salaireBrutDeclare: 10000 })];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09');

    const rg = res.document?.voletRegimeGeneral.lignes || [];
    const amo = res.document?.voletAmo.lignes || [];

    const tAf = rg.find(l => l.codeRubrique === 'ALLOCATIONS_FAMILIALES')?.taux;
    const tPs = rg.find(l => l.codeRubrique === 'PRESTATIONS_SOCIALES')?.taux;
    const tTfp = rg.find(l => l.codeRubrique === 'TFP')?.taux;
    const tAmoPart = amo.find(l => l.codeRubrique === 'AMO_PARTICIPATION')?.taux;
    const tAmoCotis = amo.find(l => l.codeRubrique === 'AMO_COTISATION')?.taux;

    assertTest(
      'TEST_08_17',
      'Taux officiels : AF=6.40%, PS=13.46%, TFP=1.60%, AMO Part=1.85%, AMO Cotis=4.52%',
      tAf === 6.40 && tPs === 13.46 && tTfp === 1.60 && tAmoPart === 1.85 && tAmoCotis === 4.52,
      '6.40%, 13.46%, 1.60%, 1.85%, 4.52%',
      `AF=${tAf}%, PS=${tPs}%, TFP=${tTfp}%, AMO Part=${tAmoPart}%, AMO Cotis=${tAmoCotis}%`,
      'Respect absolu des taux officiels CNSS du formulaire 511-1-01'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 18 : Arrondi officiel au centime conforme à la règle comptable
  // -------------------------------------------------------------------------
  {
    // 159 747.00 × 6.40% = 10 223.808 -> 10 223.81 (comme dans l'exemple réel fourni !)
    const totalVoulu = 159747.00;
    const nbSal = 40;
    const part = Math.floor((totalVoulu / nbSal) * 100) / 100; // 3993.67
    const reliquat = Math.round((totalVoulu - part * (nbSal - 1)) * 100) / 100; // 3993.87
    const regExempleReel = Array.from({ length: nbSal }, (_, i) =>
      creerLigneRegistreTest({
        id: `r_ex_${i}`,
        cnss: (100000000 + i).toString(),
        salaireBrutDeclare: i === nbSal - 1 ? reliquat : part,
      })
    );
    const decl = cnssBordereauService.genererBordereau(regExempleReel, CONFIG_ENTREPRISE_TEST, '2026-08').document;
    const res = cnssPaiementService.calculerBordereauPaiement(regExempleReel, decl, CONFIG_ENTREPRISE_TEST, '2026-08');

    const lAf = res.document?.voletRegimeGeneral.lignes.find(l => l.codeRubrique === 'ALLOCATIONS_FAMILIALES');

    assertTest(
      'TEST_08_18',
      'Arrondi officiel au centime : 159 747.00 × 6.40% = 10 223.81 MAD',
      lAf?.montantArrondi === 10223.81,
      '10223.81 MAD',
      `${lAf?.montantArrondi} MAD`,
      'Arrondi arithmétique au centime exactement identique à la valeur du document officiel fourni'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 19 : Total par rubrique correct
  // -------------------------------------------------------------------------
  {
    // Test avec les valeurs réelles du document CNSS officiel fourni
    // Masse = 159 747.00 (salariés sous le plafond 6 000 MAD)
    // C1 (AF 6.40%) = 10 223.81
    // C2 (PS 13.46%) = 21 501.95
    // C3 Total cotisations = 31 725.76
    // C8 TFP (1.60%) = 2 555.95
    // C10 Montant global versement RG = 34 281.71
    const totalVoulu = 159747.00;
    const nbSal = 40;
    const part = Math.floor((totalVoulu / nbSal) * 100) / 100;
    const reliquat = Math.round((totalVoulu - part * (nbSal - 1)) * 100) / 100;
    const reg = Array.from({ length: nbSal }, (_, i) =>
      creerLigneRegistreTest({
        id: `r_tot_${i}`,
        cnss: (200000000 + i).toString(),
        salaireBrutDeclare: i === nbSal - 1 ? reliquat : part,
      })
    );
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-08').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-08');

    const rg = res.document?.voletRegimeGeneral;

    assertTest(
      'TEST_08_19',
      'Total Régime Général : C1(10223.81) + C2(21501.95) = C3(31725.76) + TFP(2555.95) = C10(34281.71)',
      res.succes &&
      rg?.totalCotisationsVersees === 31725.76 &&
      rg?.taxeFormationProfessionnelle === 2555.95 &&
      rg?.montantGlobalVersement === 34281.71,
      'C3 = 31725.76, TFP = 2555.95, C10 = 34281.71',
      `C3 = ${rg?.totalCotisationsVersees}, TFP = ${rg?.taxeFormationProfessionnelle}, C10 = ${rg?.montantGlobalVersement}`,
      'Les totaux partiels et intermédiaires concordent au centime près avec le document de référence'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 20 : Total général correct (Régime Général + AMO)
  // -------------------------------------------------------------------------
  {
    // RG = 34 281.71, AMO = 2 955.32 + 7 220.56 = 10 175.88 -> Total = 44 457.59 MAD
    const totalVoulu = 159747.00;
    const nbSal = 40;
    const part = Math.floor((totalVoulu / nbSal) * 100) / 100;
    const reliquat = Math.round((totalVoulu - part * (nbSal - 1)) * 100) / 100;
    const reg = Array.from({ length: nbSal }, (_, i) =>
      creerLigneRegistreTest({
        id: `r_glob_${i}`,
        cnss: (300000000 + i).toString(),
        salaireBrutDeclare: i === nbSal - 1 ? reliquat : part,
      })
    );
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-08').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-08');

    const doc = res.document;
    const totalAttendu = 34281.71 + 10175.88; // 44 457.59

    assertTest(
      'TEST_08_20',
      'Total général correct : RG (34 281.71) + AMO (10 175.88) = 44 457.59 MAD',
      res.succes && doc?.totalGlobalAPayer === totalAttendu && doc.voletAmo.totalCotisationsAmo === 10175.88,
      'totalGlobalAPayer = 44457.59 MAD',
      `totalGlobalAPayer = ${doc?.totalGlobalAPayer} MAD`,
      'Consolidation exacte de la charge totale due à la CNSS'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 21 : Écart avec registre détecté
  // -------------------------------------------------------------------------
  {
    // Simulation d'une divergence : un salarié non validé dans le registre
    const reg = [
      creerLigneRegistreTest({ id: 'r1', salaireBrutDeclare: 5000, valide: true }),
      creerLigneRegistreTest({ id: 'r2', salaireBrutDeclare: 5000, valide: false, statut: 'A_CORRIGER' }),
    ];
    const res = cnssPaiementService.calculerBordereauPaiement(reg, null, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_21',
      'Écart avec registre détecté (ligne non validée)',
      res.succes === false && res.controleCroise.ecarts.some(e => e.type === 'REGISTRE_VS_PAIEMENT'),
      'Écart de type REGISTRE_VS_PAIEMENT détecté',
      `Écart détecté = ${res.controleCroise.ecarts.some(e => e.type === 'REGISTRE_VS_PAIEMENT')}`,
      'La divergence avec le registre est immédiatement interceptée'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 22 : Écart avec bordereau salariés détecté (période divergente)
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest({ periodeId: '2026-09' })];
    // Bordereau salariés sur 2026-08 au lieu de 2026-09
    const decl08 = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-08').document;
    const res = cnssPaiementService.calculerBordereauPaiement(reg, decl08, CONFIG_ENTREPRISE_TEST, '2026-09');

    assertTest(
      'TEST_08_22',
      'Écart avec bordereau salariés détecté (période 2026-08 vs 2026-09)',
      res.succes === false && res.controleCroise.ecarts.some(e => e.type === 'DECLARATION_VS_PAIEMENT'),
      'Écart DECLARATION_VS_PAIEMENT détecté',
      `Écart détecté = ${res.controleCroise.ecarts.some(e => e.type === 'DECLARATION_VS_PAIEMENT')}`,
      'Une divergence de période entre la déclaration et le paiement bloque le processus'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 23 : Validation refusée si écart bloquant
  // -------------------------------------------------------------------------
  {
    const docAvecEcartBloquant = {
      id: 'PAY_TEST',
      controleCroise: { estConforme: false, totalBloquants: 2 } as any,
    } as any;

    let erreurCapturee = false;
    try {
      cnssPaiementService.validerBordereauPaiement(docAvecEcartBloquant);
    } catch (e) {
      erreurCapturee = true;
    }

    assertTest(
      'TEST_08_23',
      'Validation refusée si écart bloquant',
      erreurCapturee === true,
      'Exception levée, validation refusée',
      erreurCapturee ? 'Refusé avec succès' : 'Autorisé à tort',
      'La validation humaine ne peut être forcée tant que des écarts bloquants subsistent'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 24 : Validation réussie si tout est conforme (statut VALIDE, verrouille true)
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest()];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const gen = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09');
    const docBrouillon = gen.document!;

    const docValide = cnssPaiementService.validerBordereauPaiement(docBrouillon, 'Directeur Financier');

    assertTest(
      'TEST_08_24',
      'Validation réussie si conforme -> statut VALIDE, verrouille=true, dateValidation et auditId',
      docValide.statut === 'VALIDE' &&
      docValide.verrouille === true &&
      docValide.validePar === 'Directeur Financier' &&
      !!docValide.dateValidation &&
      !!docValide.auditId,
      'statut = VALIDE, verrouille = true',
      `statut = ${docValide.statut}, verrouille = ${docValide.verrouille}`,
      'Le bordereau de paiement est scellé avec traçabilité complète'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 25 : Réouverture nécessite un motif obligatoire
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest()];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const docValide = cnssPaiementService.validerBordereauPaiement(
      cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09').document!
    );

    let erreurSansMotif = false;
    try {
      cnssPaiementService.reouvrirBordereauPaiement(docValide, '   ');
    } catch (e) {
      erreurSansMotif = true;
    }

    const docReouvert = cnssPaiementService.reouvrirBordereauPaiement(docValide, 'Ajustement de prime accordée');

    assertTest(
      'TEST_08_25',
      'Réouverture nécessite un motif obligatoire (>= 5 caractères)',
      erreurSansMotif === true &&
      docReouvert.statut === 'BROUILLON' &&
      docReouvert.verrouille === false &&
      docReouvert.justificationReouverture === 'Ajustement de prime accordée',
      'Erreur sans motif et réouverture tracée avec motif',
      `erreurSansMotif = ${erreurSansMotif}, statut après = ${docReouvert.statut}`,
      'La réouverture déverrouille le paiement tout en enregistrant le motif justificatif'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 26 : Immuabilité absolue du Registre CNSS lors du calcul
  // -------------------------------------------------------------------------
  {
    const regOriginal = [
      creerLigneRegistreTest({ id: 'r1', salaireBrutDeclare: 6000, joursDeclares: 26 }),
      creerLigneRegistreTest({ id: 'r2', salaireBrutDeclare: 4500, joursDeclares: 22 }),
    ];
    const snapshotAvant = JSON.stringify(regOriginal);
    const decl = cnssBordereauService.genererBordereau(regOriginal, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    cnssPaiementService.calculerBordereauPaiement(regOriginal, decl, CONFIG_ENTREPRISE_TEST, '2026-09');
    const snapshotApres = JSON.stringify(regOriginal);

    assertTest(
      'TEST_08_26',
      'Immuabilité absolue : Le registre source ne subit aucune altération lors du calcul',
      snapshotAvant === snapshotApres,
      'snapshotAvant === snapshotApres',
      snapshotAvant === snapshotApres ? 'Identique' : 'Modifié',
      'Le calcul de versement est une projection pure sans effet de bord sur le registre'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 27 : Export CSV du bordereau de paiement avec mentions obligatoires
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreTest({ salaireBrutDeclare: 10000 })];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_ENTREPRISE_TEST, '2026-09').document;
    const doc = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_ENTREPRISE_TEST, '2026-09').document!;
    const csv = cnssPaiementService.exporterPaiementCsv(doc);

    assertTest(
      'TEST_08_27',
      'Export CSV du paiement avec mentions administratives obligatoires',
      csv.includes('format administratif interne') &&
      csv.includes('Allocations Familiales') &&
      csv.includes('Prestations Sociales') &&
      csv.includes('AMO') &&
      csv.includes('Réf: 511-1-01'),
      'CSV contient disclaimer interne et rubriques 511-1-01',
      `Contient disclaimer = ${csv.includes('format administratif interne')}`,
      'Le fichier CSV de contrôle comporte expressément les disclaimers d’usage administratif'
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
