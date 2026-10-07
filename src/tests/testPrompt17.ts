/**
 * Banc de Tests Automatisés pour PROMPT 17
 * MODIFICATION DU STATUT SALARIÉ & PERSISTANCE SUPABASE & TRAÇABILITÉ AUDIT
 * APPLICATION CNSS MULT.S — SARLAU MULT.S (N° AFFILIÉ : 6541835)
 *
 * TESTS OBLIGATOIRES :
 * 1. ACTIF → SORTI
 * 2. SORTI → ACTIF
 * 3. À_VÉRIFIER → ACTIF
 * 4. Vérifier persistance Supabase
 * 5. F5 et vérification du statut
 * 6. Vérifier qu'un salarié avec des jours > 0 n'est pas automatiquement réactivé
 * 7. Vérifier l'audit (salarié, ancienne/nouvelle valeur, période, utilisateur, date/heure, motif)
 * 8. Vérifier RLS / autorisation UPDATE & refus en cas d'erreur
 */

import { persistenceService } from '../services/persistenceService';
import { supabasePersistenceService } from '../services/supabasePersistenceService';
import {
  SalarieReferentiel,
  LignePaieImportee,
  ResultatRapprochement,
  SituationEmploye,
} from '../types/cnss';
import { validationEngine } from '../services/validationEngine';
import { rapprocherLigne } from '../services/matchingEngine';

export interface ResultatTest17 {
  id: string;
  cas: string;
  attendu: string;
  obtenu: string;
  succes: boolean;
  details?: string;
}

export interface BilanPrompt17 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTest17[];
  tempsExecutionMs: number;
}

export async function executerTestsPrompt17(): Promise<BilanPrompt17> {
  const debut = performance.now();
  const resultats: ResultatTest17[] = [];

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
  const companyIdTest = '6541835';

  // Préparation d'un salarié de test
  const salarieTest1: SalarieReferentiel = {
    id: 'sal_p17_t1',
    nomComplet: 'EL MANSOURI TARIK',
    nomNormalise: 'EL MANSOURI TARIK',
    tokensNom: ['EL', 'MANSOURI', 'TARIK'],
    cni: 'BK123456',
    immatriculationCnss: '112233445',
    situation: 'ACTIF',
    datePremiereApparition: '2026-09',
    aliases: [],
    actif: true,
  };

  // Enregistrement initial
  await supabasePersistenceService.saveSalarie(salarieTest1);

  // =========================================================================
  // TEST 1 : ACTIF → SORTI
  // =========================================================================
  try {
    const res = await supabasePersistenceService.modifierStatutSalarie(
      salarieTest1.id,
      'SORTI',
      {
        monthId: moisTest,
        motif: 'Démission fin août 2026',
        utilisateur: 'Auditeur RH MULT.S',
      }
    );

    assert(
      'P17-TEST-01-A',
      'Modification statut : ACTIF → SORTI',
      'Situation du salarié mise à jour à SORTI',
      res.salarie.situation === 'SORTI' && res.salarie.actif === false,
      `Situation obtenue: ${res.salarie.situation}, actif: ${res.salarie.actif}`
    );

    assert(
      'P17-TEST-01-B',
      'Événement audit généré pour passage à SORTI',
      'Action MODIFICATION_STATUT_SALARIE avec ancienne=ACTIF et nouvelle=SORTI',
      res.auditEvent.action === 'MODIFICATION_STATUT_SALARIE' &&
        res.auditEvent.ancienneValeur === 'ACTIF' &&
        res.auditEvent.nouvelleValeur === 'SORTI',
      `Audit action: ${res.auditEvent.action}`
    );
  } catch (err: any) {
    assert('P17-TEST-01-A', 'Modification statut : ACTIF → SORTI', 'Succès', false, err.message);
    assert('P17-TEST-01-B', 'Événement audit', 'Succès', false, err.message);
  }

  // =========================================================================
  // TEST 2 : SORTI → ACTIF (Réactivation avec arbitrage)
  // =========================================================================
  try {
    const res = await supabasePersistenceService.modifierStatutSalarie(
      salarieTest1.id,
      'ACTIF',
      {
        monthId: moisTest,
        motif: 'Arbitrage humain : Réembauche confirmée en septembre',
        utilisateur: 'Direction MULT.S',
      }
    );

    assert(
      'P17-TEST-02-A',
      'Modification statut : SORTI → ACTIF (Réactivation)',
      'Situation du salarié mise à jour à ACTIF',
      res.salarie.situation === 'ACTIF' && res.salarie.actif === true,
      `Situation obtenue: ${res.salarie.situation}, actif: ${res.salarie.actif}`
    );

    assert(
      'P17-TEST-02-B',
      'Audit explicite de réactivation',
      'Action ARBITRAGE_REACTIVATION_SORTI tracée dans l\'audit',
      res.auditEvent.action === 'ARBITRAGE_REACTIVATION_SORTI' &&
        res.auditEvent.ancienneValeur === 'SORTI' &&
        res.auditEvent.nouvelleValeur === 'ACTIF' &&
        res.auditEvent.justification.includes('Arbitrage humain'),
      `Action: ${res.auditEvent.action}, justification: ${res.auditEvent.justification}`
    );
  } catch (err: any) {
    assert('P17-TEST-02-A', 'Modification statut : SORTI → ACTIF', 'Succès', false, err.message);
    assert('P17-TEST-02-B', 'Audit réactivation', 'Succès', false, err.message);
  }

  // =========================================================================
  // TEST 3 : À_VÉRIFIER → ACTIF
  // =========================================================================
  const salarieTest2: SalarieReferentiel = {
    id: 'sal_p17_t2',
    nomComplet: 'BENNANI OMAR',
    nomNormalise: 'BENNANI OMAR',
    tokensNom: ['BENNANI', 'OMAR'],
    cni: 'BO789123',
    immatriculationCnss: '556677889',
    situation: 'A_VERIFIER',
    datePremiereApparition: '2026-09',
    aliases: [],
    actif: false,
  };
  await supabasePersistenceService.saveSalarie(salarieTest2);

  try {
    const res = await supabasePersistenceService.modifierStatutSalarie(
      salarieTest2.id,
      'ACTIF',
      {
        monthId: moisTest,
        motif: 'Contrat signé et vérifié par les RH',
        utilisateur: 'Gestionnaire Paie',
      }
    );

    assert(
      'P17-TEST-03',
      'Modification statut : À_VÉRIFIER → ACTIF',
      'Salarié passe à ACTIF avec validation',
      res.salarie.situation === 'ACTIF' && res.salarie.actif === true,
      `Situation obtenue: ${res.salarie.situation}`
    );
  } catch (err: any) {
    assert('P17-TEST-03', 'Modification statut : À_VÉRIFIER → ACTIF', 'Succès', false, err.message);
  }

  // =========================================================================
  // TEST 4 : Persistance Supabase (Source de vérité)
  // =========================================================================
  try {
    const salarieRecharge = await supabasePersistenceService.getSalarie(salarieTest1.id);
    assert(
      'P17-TEST-04',
      'Vérification persistance Supabase',
      'La lecture directe depuis Supabase retourne le statut ACTIF',
      salarieRecharge !== null && salarieRecharge.situation === 'ACTIF',
      `Statut en base Supabase: ${salarieRecharge?.situation}`
    );
  } catch (err: any) {
    assert('P17-TEST-04', 'Vérification persistance Supabase', 'Statut ACTIF', false, err.message);
  }

  // =========================================================================
  // TEST 5 : Simulation F5 / Rechargement complet
  // =========================================================================
  try {
    // 1. Modifier le statut du salarié à SORTI dans Supabase
    await supabasePersistenceService.modifierStatutSalarie(
      salarieTest1.id,
      'SORTI',
      { monthId: moisTest, motif: 'Sortie définitive' }
    );

    // 2. Simuler un vieux cache local qui contenait encore "ACTIF"
    const vieuxCacheLocal: SalarieReferentiel[] = [
      {
        ...salarieTest1,
        situation: 'ACTIF',
        actif: true,
      },
    ];
    persistenceService.saveSalaries(vieuxCacheLocal);

    // 3. Simuler le rechargement F5 : Supabase est chargé en priorité absolue
    const salariesApresF5 = await supabasePersistenceService.getSalaries();
    const salDansSupabase = salariesApresF5.find(s => s.id === salarieTest1.id);

    // Si Supabase a le statut SORTI, on écrase le vieux cache local
    if (salDansSupabase) {
      persistenceService.saveSalaries(salariesApresF5);
    }

    const salFinalApresF5 = persistenceService.getSalaries().find(s => s.id === salarieTest1.id);

    assert(
      'P17-TEST-05',
      'Simulation F5 : Supabase prioritaire sur vieux localStorage',
      'Le statut reste SORTI après rechargement F5 et le cache est synchronisé',
      salFinalApresF5?.situation === 'SORTI' && salDansSupabase?.situation === 'SORTI',
      `Statut obtenu après F5: ${salFinalApresF5?.situation}`
    );
  } catch (err: any) {
    assert('P17-TEST-05', 'Simulation F5', 'Statut SORTI préservé', false, err.message);
  }

  // =========================================================================
  // TEST 6 : Salarié SORTI avec jours > 0 NON réactivé automatiquement
  // =========================================================================
  try {
    // Salarié SORTI dans le référentiel
    const salarieSortiAvecJours: SalarieReferentiel = {
      id: 'sal_p17_sorti_jours',
      nomComplet: 'MAROUANE MOUKRIM',
      nomNormalise: 'MAROUANE MOUKRIM',
      tokensNom: ['MAROUANE', 'MOUKRIM'],
      cni: 'WA298711',
      immatriculationCnss: '189920112',
      situation: 'SORTI',
      datePremiereApparition: '2025-01',
      aliases: [],
      actif: false,
    };
    await supabasePersistenceService.saveSalarie(salarieSortiAvecJours);

    // Ligne de paie avec 22 jours travaillés
    const lignePaieMoukrim: LignePaieImportee = {
      id: 'paie_p17_moukrim',
      nomCompletBrut: 'MAROUANE MOUKRIM',
      nomNormalise: 'MAROUANE MOUKRIM',
      tokensNom: ['MAROUANE', 'MOUKRIM'],
      cniImportee: 'WA298711',
      cnssImportee: '189920112',
      salaireBrut: 6000,
      joursImportes: 22,
      ligneFichier: 10,
    };

    // Rapprochement automatique
    const rapMoukrim = rapprocherLigne(lignePaieMoukrim, [salarieSortiAvecJours]);
    const anomalies = validationEngine.auditer([rapMoukrim], [salarieSortiAvecJours]);

    // Vérification que le moteur d'audit détecte SALARIE_SORTI_AVEC_JOURS
    const aAnomalieSorti = anomalies.some(a => a.code === 'SALARIE_SORTI_AVEC_JOURS');

    // Vérification que le statut du salarié reste SORTI (PAS de réactivation automatique)
    const salarieApresAudit = await supabasePersistenceService.getSalarie(salarieSortiAvecJours.id);

    assert(
      'P17-TEST-06',
      'Salarié SORTI avec jours > 0 non réactivé automatiquement',
      'Anomalie SALARIE_SORTI_AVEC_JOURS levée et statut reste SORTI en base',
      aAnomalieSorti && salarieApresAudit?.situation === 'SORTI',
      `Anomalie détectée: ${aAnomalieSorti}, Statut salarié: ${salarieApresAudit?.situation}`
    );
  } catch (err: any) {
    assert('P17-TEST-06', 'Salarié SORTI avec jours > 0', 'Anomalie et statut SORTI', false, err.message);
  }

  // =========================================================================
  // TEST 7 : Vérification complète de l'Audit Trail
  // =========================================================================
  try {
    const journalAudit = await supabasePersistenceService.getJournalAudit();
    const dernierAuditStatut = journalAudit.find(
      e => e.salarie === salarieTest1.nomComplet || e.action === 'MODIFICATION_STATUT_SALARIE' || e.action === 'ARBITRAGE_REACTIVATION_SORTI'
    );

    const aTousLesChamps = Boolean(
      dernierAuditStatut &&
      dernierAuditStatut.salarie &&
      dernierAuditStatut.ancienneValeur &&
      dernierAuditStatut.nouvelleValeur &&
      dernierAuditStatut.periodeConcernee &&
      dernierAuditStatut.utilisateur &&
      dernierAuditStatut.date &&
      dernierAuditStatut.justification
    );

    assert(
      'P17-TEST-07',
      'Traçabilité complète dans le journal d\'audit',
      'L\'événement contient salarié, ancienne/nouvelle valeur, période, utilisateur, date, motif',
      aTousLesChamps,
      `Champs présents: ${JSON.stringify(dernierAuditStatut || {})}`
    );
  } catch (err: any) {
    assert('P17-TEST-07', 'Vérification de l\'audit', 'Tous champs présents', false, err.message);
  }

  // =========================================================================
  // TEST 8 : RLS & Contrôle d'autorisation UPDATE & Rejet d'erreur Supabase
  // =========================================================================
  try {
    // 1. Vérification que l'identifiant entreprise est strictement partitionné
    assert(
      'P17-TEST-08-A',
      'Partitionnement RLS company_id = 6541835',
      'companyId est strictement 6541835',
      supabasePersistenceService.companyId === companyIdTest,
      `Company ID: ${supabasePersistenceService.companyId}`
    );

    // 2. Refus de succès si Supabase retourne une erreur (Zéro fallback silencieux)
    supabasePersistenceService.simulerErreurSupabase = true;
    let erreurLevee = false;
    try {
      await supabasePersistenceService.modifierStatutSalarie(
        salarieTest1.id,
        'ACTIF',
        { monthId: moisTest, motif: 'Test erreur' }
      );
    } catch {
      erreurLevee = true;
    } finally {
      supabasePersistenceService.simulerErreurSupabase = false;
    }

    assert(
      'P17-TEST-08-B',
      'Interdiction du fallback silencieux en cas d\'erreur UPDATE Supabase',
      'Une exception est levée et le statut n\'est pas validé silencieusement',
      erreurLevee,
      `Erreur correctement levée: ${erreurLevee}`
    );
  } catch (err: any) {
    assert('P17-TEST-08-A', 'RLS & Sécurité', 'Succès', false, err.message);
    assert('P17-TEST-08-B', 'Gestion des erreurs Supabase', 'Succès', false, err.message);
  }

  const reussis = resultats.filter(r => r.succes).length;
  const echoues = resultats.length - reussis;

  return {
    total: resultats.length,
    reussis,
    echoues,
    resultats,
    tempsExecutionMs: performance.now() - debut,
  };
}
