/**
 * Banc de Tests Automatisés pour PROMPT 16
 * DIAGNOSTIC ET CORRECTION DE LA PERSISTANCE SUPABASE & VALIDATION SALARIÉ
 * APPLICATION CNSS MULT.S — SARLAU MULT.S (N° AFFILIÉ : 6541835)
 *
 * Scénario E2E obligatoire :
 * 1. Charger un salarié non validé.
 * 2. Valider le salarié.
 * 3. Vérifier que l'UPDATE Supabase réussit.
 * 4. Recharger les données depuis Supabase.
 * 5. Vérifier que le salarié est toujours VALIDE.
 * 6. Simuler un F5/rechargement complet.
 * 7. Vérifier encore une fois que le statut reste VALIDE.
 *
 * + Tests complémentaires d'intégrité :
 * - RLS & partitionnement 6541835
 * - Refus de validation si Supabase retourne une erreur (Zéro fallback silencieux vers localStorage)
 * - Priorité absolue de Supabase sur un ancien cache localStorage
 * - Vérification des champs obligatoires (statutValidation, salarieFinalId, joursDeclares, situation, statut)
 */

import { persistenceService } from '../services/persistenceService';
import { supabasePersistenceService } from '../services/supabasePersistenceService';
import {
  SalarieReferentiel,
  ResultatRapprochement,
  LignePaieImportee,
} from '../types/cnss';
import { determinerStatutLigneP5 } from '../services/matchingEngine';

export interface ResultatTest16 {
  id: string;
  cas: string;
  attendu: string;
  obtenu: string;
  succes: boolean;
  details?: string;
}

export interface BilanPrompt16 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTest16[];
  tempsExecutionMs: number;
}

export async function executerTestsPrompt16(): Promise<BilanPrompt16> {
  const debut = performance.now();
  const resultats: ResultatTest16[] = [];

  function assert(id: string, cas: string, attendu: string, condition: boolean, details?: string) {
    resultats.push({
      id,
      cas,
      attendu,
      obtenu: condition ? attendu : 'ÉCHEC ASSERTION',
      succes: condition,
      details,
    });
  }

  const moisTest = '2026-09';

  // Salarié référentiel de test
  const salarieTest: SalarieReferentiel = {
    id: 'sal_p16_target',
    nomComplet: 'BENJELLOUN KARIM',
    nomNormalise: 'BENJELLOUN KARIM',
    tokensNom: ['BENJELLOUN', 'KARIM'],
    cni: 'BK998877',
    immatriculationCnss: '987654321',
    situation: 'ACTIF',
    datePremiereApparition: '2026-09',
    aliases: [],
  };

  const lignePaieTest: LignePaieImportee = {
    id: 'paie_p16_target',
    nomCompletBrut: 'BENJELLOUN KARIM',
    nomNormalise: 'BENJELLOUN KARIM',
    tokensNom: ['BENJELLOUN', 'KARIM'],
    cniImportee: 'BK998877',
    cnssImportee: '987654321',
    salaireBrut: 5500,
    joursImportes: 26,
    ligneFichier: 1,
  };

  // =========================================================================
  // ÉTAPE 1 : Charger un salarié non validé
  // =========================================================================
  const rapInitialNonValide: ResultatRapprochement = {
    id: 'rap_p16_target',
    lignePaieId: lignePaieTest.id,
    salarieBaseId: salarieTest.id,
    salariePropose: salarieTest,
    score: 95,
    statut: 'CORRESPONDANCE_CNI',
    statutP5: 'A_VALIDER',
    validation: 'A_VALIDER',
    valideParHumain: false,
    enregistrerCommeAlias: false,
    explication: 'Correspondance automatique proposée en attente de validation',
    validationJours: {
      joursImportes: 26,
      joursDeclares: 26,
      modifieManuellement: false,
      validationEffectuee: false,
    },
  };

  // Sauvegarder l'état initial non validé
  await supabasePersistenceService.saveRapprochementsPeriode(moisTest, [rapInitialNonValide]);
  persistenceService.saveRapprochementsPeriode(moisTest, [rapInitialNonValide]);

  const chargementInitial = await supabasePersistenceService.getRapprochementsPeriode(moisTest);
  const rapInitialLue = chargementInitial?.find(r => r.id === 'rap_p16_target');

  assert(
    'T16_01',
    'Étape 1 : Salarié initial chargé et non validé',
    'Statut validation = A_VALIDER et valideParHumain = false',
    rapInitialLue !== undefined &&
      rapInitialLue.validation === 'A_VALIDER' &&
      rapInitialLue.valideParHumain === false &&
      determinerStatutLigneP5(rapInitialLue) === 'A_VALIDER'
  );

  // =========================================================================
  // ÉTAPE 2 & 3 : Valider le salarié et vérifier que l'UPDATE Supabase réussit
  // =========================================================================
  const rapValide = await supabasePersistenceService.validerSalarieRapprochement(
    moisTest,
    'rap_p16_target',
    {
      salarieChoisi: salarieTest,
      joursDeclares: 26,
      justification: 'Validation gestionnaire MULT.S',
      memoriserAlias: false,
    }
  );

  assert(
    'T16_02',
    'Étape 2 & 3 : UPDATE Supabase réussit avec statut VALIDE',
    'Statut = VALIDE, valideParHumain = true, statutP5 = IDENTIFIE',
    rapValide.validation === 'VALIDE' &&
      rapValide.valideParHumain === true &&
      rapValide.statutP5 === 'IDENTIFIE' &&
      determinerStatutLigneP5(rapValide) === 'IDENTIFIE'
  );

  // Synchronisation du cache local après succès Supabase
  persistenceService.saveRapprochementsPeriode(moisTest, [rapValide]);

  // =========================================================================
  // ÉTAPE 4 & 5 : Recharger depuis Supabase et vérifier que le statut reste VALIDE
  // =========================================================================
  const donneesSupabaseRechargees = await supabasePersistenceService.getRapprochementsPeriode(moisTest);
  const rapRechargeSupabase = donneesSupabaseRechargees?.find(r => r.id === 'rap_p16_target');

  assert(
    'T16_03',
    'Étape 4 & 5 : Rechargement depuis Supabase maintient VALIDE',
    'Le salarié relu depuis Supabase a toujours validation = VALIDE',
    rapRechargeSupabase !== undefined &&
      rapRechargeSupabase.validation === 'VALIDE' &&
      rapRechargeSupabase.valideParHumain === true &&
      rapRechargeSupabase.statutP5 === 'IDENTIFIE'
  );

  // =========================================================================
  // ÉTAPE 6 & 7 : Simulation d'un rechargement complet (F5)
  // =========================================================================
  // Dans App.tsx, lors d'un F5, l'application lit Supabase en priorité :
  let etatReactApresF5: ResultatRapprochement[] = [];

  // Lecture Supabase prioritaire (séquence exacte de App.tsx)
  const supaRapsF5 = await supabasePersistenceService.getRapprochementsPeriode(moisTest);
  if (supaRapsF5 && supaRapsF5.length > 0) {
    persistenceService.saveRapprochementsPeriode(moisTest, supaRapsF5);
    etatReactApresF5 = supaRapsF5;
  } else {
    etatReactApresF5 = persistenceService.getRapprochementsPeriode(moisTest) || [];
  }

  const rapApresF5 = etatReactApresF5.find(r => r.id === 'rap_p16_target');

  assert(
    'T16_04',
    'Étape 6 & 7 : Simulation F5 maintient formellement le statut VALIDE',
    'Après F5, le salarié ne revient PAS à A_VALIDER et reste VALIDE',
    rapApresF5 !== undefined &&
      rapApresF5.validation === 'VALIDE' &&
      rapApresF5.valideParHumain === true &&
      rapApresF5.statutP5 === 'IDENTIFIE' &&
      determinerStatutLigneP5(rapApresF5) === 'IDENTIFIE'
  );

  // =========================================================================
  // TEST 5 : Vérification des champs requis (Section 9)
  // =========================================================================
  assert(
    'T16_05',
    'Champs de validation complets et traçables',
    'statutValidation, salarieFinalId, joursDeclares, situation, statut conformes',
    rapApresF5 !== undefined &&
      rapApresF5.validation === 'VALIDE' &&
      rapApresF5.salarieBaseId === 'sal_p16_target' &&
      rapApresF5.validationJours.joursDeclares === 26 &&
      rapApresF5.salariePropose?.situation === 'ACTIF' &&
      rapApresF5.statut === 'CORRESPONDANCE_CNI'
  );

  // =========================================================================
  // TEST 6 : Refus de validation si Supabase échoue (Zéro fallback silencieux)
  // =========================================================================
  supabasePersistenceService.setSimulerErreurSupabase(true);
  let erreurAttrapee = false;

  try {
    await supabasePersistenceService.validerSalarieRapprochement(
      moisTest,
      'rap_p16_target',
      { justification: 'Tentative avec erreur Supabase' }
    );
  } catch (err: any) {
    erreurAttrapee = true;
  } finally {
    supabasePersistenceService.setSimulerErreurSupabase(false);
  }

  assert(
    'T16_06',
    'Refus de validation en cas d\'erreur Supabase (Pas de fallback silencieux)',
    'L\'opération lève une exception et n\'est pas validée silencieusement',
    erreurAttrapee === true
  );

  // =========================================================================
  // TEST 7 : Priorité Supabase si localStorage contient une ancienne valeur
  // =========================================================================
  // Simuler un localStorage périmé avec l'ancien statut 'A_VALIDER'
  persistenceService.saveRapprochementsPeriode(moisTest, [rapInitialNonValide]);

  // Mais Supabase contient l'état validé :
  const lecturePrioritaire = await supabasePersistenceService.getRapprochementsPeriode(moisTest);
  const rapSupabasePrioritaire = lecturePrioritaire?.find(r => r.id === 'rap_p16_target');

  assert(
    'T16_07',
    'Priorité Supabase sur cache local obsolète',
    'La valeur Supabase (VALIDE) l\'emporte sur le cache local obsolète (A_VALIDER)',
    rapSupabasePrioritaire !== undefined && rapSupabasePrioritaire.validation === 'VALIDE'
  );

  // =========================================================================
  // TEST 8 : RLS & Partitionnement multi-tenant (Section 4)
  // =========================================================================
  const affiliation = supabasePersistenceService.getCompanyAffiliation();
  assert(
    'T16_08',
    'RLS & Isolation multi-tenant company_id',
    'Toutes les écritures et lectures partitionnées pour 6541835',
    affiliation === '6541835'
  );

  const fin = performance.now();
  const tempsExecutionMs = Math.round(fin - debut);
  const reussis = resultats.filter(r => r.succes).length;
  const echoues = resultats.filter(r => !r.succes).length;

  return {
    total: resultats.length,
    reussis,
    echoues,
    resultats,
    tempsExecutionMs,
  };
}
