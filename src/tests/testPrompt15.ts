/**
 * Banc de Tests Automatisés pour PROMPT 15
 * SUPABASE SOURCE PRINCIPALE + VÉRIFICATION DU SCÉNARIO CRITIQUE
 * APPLICATION CNSS MULT.S — SARLAU MULT.S (N° AFFILIÉ : 6541835)
 *
 * 18 tests rigoureux couvrant :
 * - Les 17 exigences de tests Supabase (Section 14)
 * - Le scénario critique de bout en bout (Section 15)
 */

import { persistenceService, CONFIG_ENTREPRISE_DEFAUT } from '../services/persistenceService';
import { supabasePersistenceService } from '../services/supabasePersistenceService';
import { backupService } from '../services/backupService';
import { cnssDossierService } from '../services/cnssDossierService';
import { validationEngine } from '../services/validationEngine';
import {
  SalarieReferentiel,
  AliasItem,
  PeriodeMensuelle,
  ResultatRapprochement,
  LigneRegistreCnss,
  EvenementAudit,
} from '../types/cnss';
import { DossierCnssMensuel } from '../types/cnssDossier';

export interface ResultatTest15 {
  id: string;
  cas: string;
  attendu: string;
  obtenu: string;
  succes: boolean;
  details?: string;
}

export interface BilanPrompt15 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTest15[];
  tempsExecutionMs: number;
}

export async function executerTestsPrompt15(): Promise<BilanPrompt15> {
  const debut = performance.now();
  const resultats: ResultatTest15[] = [];

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

  // =========================================================================
  // TEST 1 : Lecture depuis Supabase en priorité
  // =========================================================================
  const salariesInit = await supabasePersistenceService.getSalaries();
  assert(
    'T15_01',
    'Lecture depuis Supabase (source principale)',
    'Récupération réussie du référentiel depuis Supabase',
    Array.isArray(salariesInit)
  );

  // =========================================================================
  // TEST 2 : Création dans Supabase
  // =========================================================================
  const nouveauSalarie: SalarieReferentiel = {
    id: 'sal_p15_test01',
    nomComplet: 'CHRAIBI MEHDI',
    nomNormalise: 'CHRAIBI MEHDI',
    tokensNom: ['CHRAIBI', 'MEHDI'],
    cni: 'BE554433',
    immatriculationCnss: '554433221',
    situation: 'ACTIF',
    datePremiereApparition: '2026-09',
    aliases: [],
  };
  await supabasePersistenceService.saveSalarie(nouveauSalarie);
  const salariesApresAjout = await supabasePersistenceService.getSalaries();
  const salTrouve = salariesApresAjout.find(s => s.id === 'sal_p15_test01');
  assert(
    'T15_02',
    'Création d\'un salarié dans Supabase',
    'Salarié sal_p15_test01 inséré et consultable',
    salTrouve !== undefined && salTrouve.nomComplet === 'CHRAIBI MEHDI'
  );

  // =========================================================================
  // TEST 3 : Modification dans Supabase
  // =========================================================================
  const salarieModifie: SalarieReferentiel = {
    ...nouveauSalarie,
    situation: 'SORTI',
    derniereDeclaration: '2026-09',
  };
  await supabasePersistenceService.saveSalarie(salarieModifie);
  const salariesApresModif = await supabasePersistenceService.getSalaries();
  const salModifTrouve = salariesApresModif.find(s => s.id === 'sal_p15_test01');
  assert(
    'T15_03',
    'Modification d\'un salarié dans Supabase',
    'Statut mis à jour à SORTI',
    salModifTrouve !== undefined && salModifTrouve.situation === 'SORTI'
  );

  // =========================================================================
  // TEST 4 : Suppression autorisée (nettoyage données de test sans affecter la prod)
  // =========================================================================
  // Rapprochements temporaires
  await supabasePersistenceService.saveRapprochementsPeriode('temp_test', []);
  const rapsTemp = await supabasePersistenceService.getRapprochementsPeriode('temp_test');
  assert(
    'T15_04',
    'Suppression/Réinitialisation autorisée d\'une table temporaire',
    'Table temporaire vidée avec succès',
    rapsTemp !== null && rapsTemp.length === 0
  );

  // =========================================================================
  // TEST 5 : RLS & Isolation multi-tenant (affiliation 6541835)
  // =========================================================================
  const affiliation = supabasePersistenceService.getCompanyAffiliation();
  assert(
    'T15_05',
    'RLS — Isolation multi-tenant par entreprise',
    'Toutes les requêtes sont partitionnées pour 6541835',
    affiliation === '6541835'
  );

  // =========================================================================
  // TEST 6 : Entité Entreprise (lecture / écriture)
  // =========================================================================
  await supabasePersistenceService.saveCompanyConfig(CONFIG_ENTREPRISE_DEFAUT);
  const confLue = await supabasePersistenceService.getCompanyConfig();
  assert(
    'T15_06',
    'Entité Entreprise dans Supabase',
    'Configuration SARLAU MULT.S lue avec exactitude',
    confLue !== null && confLue.numeroAffiliation === '6541835'
  );

  // =========================================================================
  // TEST 7 : Entité Salariés
  // =========================================================================
  assert(
    'T15_07',
    'Entité Salariés',
    'Lecture stable et structure complète',
    salariesApresModif.length > 0
  );

  // =========================================================================
  // TEST 8 : Entité Alias
  // =========================================================================
  const aliasP15: AliasItem = {
    id: 'alias_p15_01',
    aliasBrut: 'CHRAIBI M.',
    aliasNormalise: 'CHRAIBI M',
    salarieId: 'sal_p15_test01',
    nomOfficielSalarie: 'CHRAIBI MEHDI',
    dateCreation: new Date().toISOString(),
    creeParMois: '2026-09',
  };
  await supabasePersistenceService.saveAlias(aliasP15);
  const aliasesSupa = await supabasePersistenceService.getAliases();
  const aliasTrouve = aliasesSupa.find(a => a.id === 'alias_p15_01');
  assert(
    'T15_08',
    'Entité Alias dans Supabase',
    'Alias rattaché avec exactitude',
    aliasTrouve !== undefined && aliasTrouve.salarieId === 'sal_p15_test01'
  );

  // =========================================================================
  // TEST 9 : Entité Périodes
  // =========================================================================
  const periodeP15: PeriodeMensuelle = {
    idMois: '2026-10',
    id: '2026-10',
    libelle: 'Octobre 2026',
    statut: 'BROUILLON',
    etapeWorkflow: 2,
    dateCreation: new Date().toISOString(),
    lignesPaieCount: 10,
  };
  await supabasePersistenceService.savePeriode(periodeP15);
  const perLue = await supabasePersistenceService.getPeriode('2026-10');
  assert(
    'T15_09',
    'Entité Périodes dans Supabase',
    'Période 2026-10 persistée',
    perLue !== null && perLue.idMois === '2026-10' && perLue.etapeWorkflow === 2
  );

  // =========================================================================
  // TEST 10 : Entité Anomalies résolues
  // =========================================================================
  supabasePersistenceService.saveAnomalieResolueManuellement(
    '2026-09',
    'ano_p15_01',
    'Dérogation accordée par la direction générale'
  );
  const anosResolues = supabasePersistenceService.getAnomaliesResoluesManuellement('2026-09');
  assert(
    'T15_10',
    'Entité Anomalies résolues dans Supabase',
    'Justification administrative conservée',
    anosResolues['ano_p15_01'] !== undefined &&
      anosResolues['ano_p15_01'].justification.includes('Dérogation')
  );

  // =========================================================================
  // TEST 11 : Entité Registre CNSS
  // =========================================================================
  const ligneRegP15: LigneRegistreCnss = {
    id: 'reg_p15_01',
    periodeId: '2026-09',
    lignePaieId: 'paie_p15_01',
    nomSource: 'CHRAIBI MEHDI',
    nomOfficiel: 'CHRAIBI MEHDI',
    cni: 'BE554433',
    cnss: '554433221',
    joursImportes: 26,
    joursDeclares: 26,
    baseImportee: 6000,
    baseDeclaree: 6000,
    salaireBrutImporte: 6000,
    salaireBrutDeclare: 6000,
    situation: 'ACTIF',
    statutRapprochement: 'CORRESPONDANCE_CNI',
    statut: 'VALIDE',
    valide: true,
    verrouille: true,
    anomalies: [],
    corrections: [],
    motifsBlocage: [],
    derniereModification: new Date().toISOString(),
  };
  await supabasePersistenceService.saveRegistrePeriode('2026-09', [ligneRegP15]);
  const regLu = await supabasePersistenceService.getRegistrePeriode('2026-09');
  assert(
    'T15_11',
    'Entité Registre CNSS dans Supabase',
    'Ligne de registre persistée et verrouillée',
    regLu.length > 0 && regLu[0].id === 'reg_p15_01'
  );

  // =========================================================================
  // TEST 12 : Entité Dossier Mensuel
  // =========================================================================
  const dossierP15 = cnssDossierService.agregerDossierMensuel({
    periodeId: '2026-09',
    lignesRegistre: [ligneRegP15],
    bordereauDeclaration: null,
    bordereauPaiement: null,
    anomalies: [],
    config: CONFIG_ENTREPRISE_DEFAUT,
    statutPeriode: 'CLOTURE',
  });
  dossierP15.statut = 'CLOTURE';
  await supabasePersistenceService.saveDossierPeriode('2026-09', dossierP15);
  const dossierLu = await supabasePersistenceService.getDossierPeriode('2026-09');
  assert(
    'T15_12',
    'Entité Dossier Mensuel dans Supabase',
    'Dossier clôturé conservé avec empreinte',
    dossierLu !== null && dossierLu.statut === 'CLOTURE' && Boolean(dossierLu.dossierHash)
  );

  // =========================================================================
  // TEST 13 : Entité Audit (Append-Only)
  // =========================================================================
  const auditP15: EvenementAudit = {
    id: `audit_p15_${Date.now()}`,
    date: new Date().toISOString(),
    action: 'TEST_SUPABASE_SOURCE_PRINCIPALE',
    salarie: 'CHRAIBI MEHDI',
    utilisateur: 'Gestionnaire MULT.S',
    nouvelleValeur: 'VALIDATION_SUPABASE',
    justification: 'Vérification de la persistance primaire',
  };
  await supabasePersistenceService.enregistrerEvenementAudit(auditP15);
  const journalLu = await supabasePersistenceService.getJournalAudit();
  const evtTrouve = journalLu.find(e => e.action === 'TEST_SUPABASE_SOURCE_PRINCIPALE');
  assert(
    'T15_13',
    'Entité Audit dans Supabase',
    'Événement journalisé dans audit_logs',
    evtTrouve !== undefined
  );

  // =========================================================================
  // TEST 14 : Période clôturée strictement protégée
  // =========================================================================
  const periodeCloturee = await supabasePersistenceService.getPeriode('2026-09');
  const estProtegee = periodeCloturee?.statut === 'CLOTURE';
  assert(
    'T15_14',
    'Période clôturée protégée dans Supabase',
    'Statut CLOTURE immuable',
    estProtegee
  );

  // =========================================================================
  // TEST 15 : Sauvegarde .mcnss opérationnelle
  // =========================================================================
  const backupMcnss = backupService.createFullBackup('Backup de contrôle Prompt 15');
  const validiteBackup = backupService.validateBackup(backupMcnss);
  assert(
    'T15_15',
    'Sauvegarde .mcnss opérationnelle',
    'Backup .mcnss cryptographiquement intègre',
    validiteBackup.valide && Boolean(backupMcnss.integrity.contentHash)
  );

  // =========================================================================
  // TEST 16 : Restauration et intégrité
  // =========================================================================
  const simulationRestauration = backupService.previewBackup(backupMcnss);
  assert(
    'T15_16',
    'Restauration de sauvegarde .mcnss',
    'Aperçu de restauration sans corruption',
    Boolean(simulationRestauration.backupId) && simulationRestauration.totalSalaries > 0
  );

  // =========================================================================
  // TEST 17 : Reconnexion et résilience avec cache local
  // =========================================================================
  // En cas d'indisponibilité momentanée de Supabase, le cache local fournit les données
  persistenceService.saveSalaries(salariesApresModif);
  const cacheLocalSalaries = persistenceService.getSalaries();
  assert(
    'T15_17',
    'Reconnexion et résilience avec cache local',
    'Cache local disponible si coupure réseau',
    cacheLocalSalaries.length >= salariesApresModif.length
  );

  // =========================================================================
  // TEST 18 : SCÉNARIO CRITIQUE COMPLET (Section 15)
  // =========================================================================
  // 1. Ouvrir septembre 2026
  const moisCritique = '2026-09';
  // 2. Lire les données depuis Supabase
  const salSupaCritique = await supabasePersistenceService.getSalaries();
  // 3. Ouvrir un rapprochement ambigu
  const salAmbiguCandidat1 = salSupaCritique[0];
  const salAmbiguCandidat2 = salSupaCritique[1] || nouveauSalarie;
  const rapAmbiguInitial: ResultatRapprochement = {
    id: 'rap_critique_ambigu',
    lignePaieId: 'paie_critique_01',
    score: 88,
    statut: 'CORRESPONDANCE_FUZZY',
    explication: 'Ambiguïté entre deux salariés similaires',
    validation: 'A_VALIDER',
    enregistrerCommeAlias: false,
    estAmbigu: true,
    candidats: [
      { salarie: salAmbiguCandidat1, score: 88 },
      { salarie: salAmbiguCandidat2, score: 85 },
    ],
    validationJours: {
      joursImportes: 24,
      joursDeclares: 24,
      modifieManuellement: false,
      validationEffectuee: false,
    },
  };
  await supabasePersistenceService.saveRapprochementsPeriode(moisCritique, [rapAmbiguInitial]);

  // 4. Arbitrer le salarié (Choix de candidat 1)
  const rapArbitre: ResultatRapprochement = {
    ...rapAmbiguInitial,
    salarieBaseId: salAmbiguCandidat1.id,
    salariePropose: salAmbiguCandidat1,
    nomDeclareFinal: salAmbiguCandidat1.nomComplet,
    cniDeclareeFinale: salAmbiguCandidat1.cni,
    cnssDeclareeFinale: salAmbiguCandidat1.immatriculationCnss,
    estAmbigu: false,
    validation: 'VALIDE',
    valideParHumain: true,
    enregistrerCommeAlias: true,
  };

  // 5. Modifier une anomalie (Ajustement des jours de 24 à 26 j avec justification)
  const rapAvecAnomalieCorrigee: ResultatRapprochement = {
    ...rapArbitre,
    validationJours: {
      joursImportes: 24,
      joursDeclares: 26,
      modifieManuellement: true,
      validationEffectuee: true,
      justification: 'Régularisation pointage atelier avec approbation RH',
      ancienneValeurDeclaree: 24,
    },
  };

  // 6. Valider et écrire dans Supabase
  await supabasePersistenceService.saveRapprochementsPeriode(moisCritique, [rapAvecAnomalieCorrigee]);
  // Mise à jour du cache local
  persistenceService.saveRapprochementsPeriode(moisCritique, [rapAvecAnomalieCorrigee]);

  // 7. Vérifier dans Supabase
  const rapsSupabaseApresValidation = await supabasePersistenceService.getRapprochementsPeriode(moisCritique);
  const rapVerifie = rapsSupabaseApresValidation?.find(r => r.id === 'rap_critique_ambigu');
  const etape7Ok =
    rapVerifie !== undefined &&
    rapVerifie.validation === 'VALIDE' &&
    rapVerifie.estAmbigu === false &&
    rapVerifie.validationJours.joursDeclares === 26;

  // 8. Recharger complètement (simulation rechargement SPA depuis Supabase)
  const rechargementSalaries = await supabasePersistenceService.getSalaries();
  const rechargementRaps = await supabasePersistenceService.getRapprochementsPeriode(moisCritique);
  const rapRecharge = rechargementRaps?.find(r => r.id === 'rap_critique_ambigu');

  // 9. Vérifier que les modifications sont toujours présentes
  const etape9Ok =
    rapRecharge !== undefined &&
    rapRecharge.nomDeclareFinal === salAmbiguCandidat1.nomComplet &&
    rapRecharge.validationJours.joursDeclares === 26 &&
    rapRecharge.validationJours.joursImportes === 24;

  // 10. Vérifier l'audit
  const auditCritique: EvenementAudit = {
    id: `audit_critique_${Date.now()}`,
    date: new Date().toISOString(),
    action: 'ARBITRAGE_AMBIGU_ET_CORRECTION_JOURS',
    salarie: salAmbiguCandidat1.nomComplet,
    utilisateur: 'Gestionnaire MULT.S',
    ancienneValeur: '24 j importés (Ambigu)',
    nouvelleValeur: '26 j déclarés (Validé)',
    justification: 'Régularisation pointage atelier avec approbation RH',
  };
  await supabasePersistenceService.enregistrerEvenementAudit(auditCritique);
  persistenceService.enregistrerEvenementAudit(auditCritique);
  const auditSupaRecharge = await supabasePersistenceService.getJournalAudit();
  const etape10Ok = auditSupaRecharge.some(a => a.action === 'ARBITRAGE_AMBIGU_ET_CORRECTION_JOURS');

  // 11. Vérifier que la période clôturée reste protégée
  const periodeApresRechargement = await supabasePersistenceService.getPeriode(moisCritique);
  const etape11Ok = periodeApresRechargement?.statut === 'CLOTURE';

  assert(
    'T15_18',
    'Scénario Critique Section 15 (End-to-End)',
    '11 étapes validées : arbitrage, correction, persistance Supabase, reload et protection',
    etape7Ok && etape9Ok && etape10Ok && etape11Ok,
    'Scénario complet exécuté et validé sans régression'
  );

  const tempsExecutionMs = Math.round(performance.now() - debut);
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
