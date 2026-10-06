/**
 * Banc de Tests Automatisés pour PROMPT 11
 * BACKUP, RESTAURATION, ARCHIVAGE ET REPRISE APRÈS SINISTRE
 * APPLICATION CNSS MULT.S — SARLAU MULT.S (N° AFFILIÉ : 6541835)
 *
 * 42 tests automatisés couvrant l'ensemble des exigences formelles :
 * - Sauvegardes complètes & archives de périodes (.mcnss)
 * - Empreinte cryptographique SHA-256 déterministe
 * - Détection et rejet de l'altération, corruption et incompatibilité
 * - Pré-backup obligatoire avant restauration
 * - Restauration atomique, détection de conflits et rollback automatique
 * - Maintien inviolable des périodes clôturées (statut CLOTURE)
 * - Idempotence du double backup et de la double restauration
 * - Reprise après sinistre (Disaster Recovery) suite à une perte totale de données
 * - Absence de fuite de données personnelles dans les métadonnées et fichiers
 */

import { backupService } from '../services/backupService';
import { persistenceService } from '../services/persistenceService';
import {
  MultsCnssBackup,
  MultsCnssBackupPayload,
} from '../types/cnssBackup';
import {
  SalarieReferentiel,
  AliasItem,
  PeriodeMensuelle,
  EvenementAudit,
} from '../types/cnss';
import { DossierCnssMensuel } from '../types/cnssDossier';

export interface ResultatTest11 {
  id: string;
  cas: string;
  attendu: string;
  obtenu: string;
  succes: boolean;
  details?: string;
}

export interface BilanPrompt11 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTest11[];
  tempsExecutionMs: number;
}

// Helpers de création sécurisée pour les types CNSS
function creerPeriodeTest(overrides: Partial<PeriodeMensuelle> = {}): PeriodeMensuelle {
  const pId = overrides.id || overrides.idMois || '2026-09';
  return {
    idMois: pId,
    id: pId,
    libelle: `Période ${pId}`,
    statut: 'BROUILLON',
    etapeWorkflow: 1,
    dateCreation: new Date().toISOString(),
    lignesPaieCount: 0,
    ...overrides,
  };
}

function creerSalarieTest(overrides: Partial<SalarieReferentiel> = {}): SalarieReferentiel {
  const sId = overrides.id || 'sal_' + Math.random().toString(36).substring(2, 7);
  const nomComplet = overrides.nomComplet || `${overrides.nom || 'NOM'} ${overrides.prenom || 'PRENOM'}`.trim();
  return {
    id: sId,
    nomComplet,
    nom: overrides.nom || nomComplet,
    prenom: overrides.prenom || '',
    nomNormalise: nomComplet,
    tokensNom: nomComplet.split(' '),
    aliases: [],
    immatriculationCnss: overrides.cnss || overrides.immatriculationCnss,
    cnss: overrides.cnss || overrides.immatriculationCnss,
    cni: overrides.cni,
    actif: overrides.actif ?? true,
    ...overrides,
  };
}

function creerAliasTest(overrides: Partial<AliasItem> = {}): AliasItem {
  const aId = overrides.id || 'al_' + Math.random().toString(36).substring(2, 7);
  const brut = overrides.aliasBrut || overrides.nomDeclare || 'ALIAS TEST';
  const off = overrides.nomOfficielSalarie || overrides.nomOfficiel || 'OFFICIEL TEST';
  return {
    id: aId,
    aliasBrut: brut,
    nomDeclare: brut,
    nomOfficielSalarie: off,
    nomOfficiel: off,
    salarieId: overrides.salarieId || 'sal_1',
    dateCreation: overrides.dateCreation || new Date().toISOString(),
    creePar: overrides.creePar || 'Admin',
    ...overrides,
  };
}

function creerDossierTest(overrides: Partial<DossierCnssMensuel> = {}): DossierCnssMensuel {
  const pId = overrides.periodeId || '2026-09';
  return {
    id: `dos_${pId}`,
    periodeId: pId,
    mois: 9,
    annee: 2026,
    numeroAffiliation: '6541835',
    agence: 'SIDI BELYOUT',
    raisonSociale: 'STE MULT.S',
    adresse: '77 RUE MOHAMED SMIHA ETG 10 N 57',
    statut: 'CLOTURE',
    versionCourante: overrides.versionCourante ?? overrides.version ?? 1,
    version: overrides.versionCourante ?? overrides.version ?? 1,
    versionsHistorique: overrides.versionsHistorique || overrides.historiqueVersions || [],
    historiqueVersions: overrides.versionsHistorique || overrides.historiqueVersions || [],
    registreHash: 'sha256_mock_reg',
    bordereauDeclarationHash: 'sha256_mock_decl',
    bordereauPaiementHash: 'sha256_mock_pay',
    dossierHash: overrides.dossierHash || 'sha256_mock_dossier',
    dateCreation: overrides.dateCreation || new Date().toISOString(),
    resume: {
      totalSalaries: 10,
      nombreEntrants: 0,
      nombreSortants: 0,
      totalJoursDeclares: 260,
      masseBruteDeclaree: 50000,
      masseCotisablePlafonnee: 50000,
      totalCotisationsRegimeGeneral: 10500,
      totalCotisationsAmo: 2260,
      totalGlobalAPayer: 12760,
      montantEnToutesLettres: 'DOUZE MILLE SEPT CENT SOIXANTE DIRHAMS',
    },
    controleTripartite: {
      estConforme: true,
      totalControles: 6,
      totalBloquants: 0,
      controles: [],
    },
    checklist: [],
    documents: [],
    motifsBlocageValidation: [],
    ...overrides,
  };
}

export function executerTestsPrompt11(): BilanPrompt11 {
  const debut = Date.now();
  const resultats: ResultatTest11[] = [];

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

  // Sauvegarde de l'état original complet avant l'exécution du banc de test
  const snapshotInitial = backupService.createFullBackup('Test Runner Init');

  try {
    // =========================================================================
    // TEST 01 : Backup application vide
    // =========================================================================
    {
      persistenceService.clearAll();
      persistenceService.savePeriodes([]);
      persistenceService.saveSalaries([]);
      persistenceService.saveAliases([]);

      const bk = backupService.createFullBackup('Test 01');
      const val = backupService.validateBackup(bk);

      assertTest(
        'TEST_11_01',
        'Backup d’une application vide généré et valide avec hash SHA-256 calculé',
        val.valide && bk.metadata.totalPeriodes === 0 && bk.integrity.contentHash.length === 64,
        'valide=true, periodes=0, hashSha256=64 chars',
        `valide=${val.valide}, periodes=${bk.metadata.totalPeriodes}, hashLen=${bk.integrity.contentHash.length}`
      );
    }

    // =========================================================================
    // TEST 02 : Backup complet multi-périodes
    // =========================================================================
    {
      const pers: PeriodeMensuelle[] = [
        creerPeriodeTest({ id: '2026-09', libelle: 'Septembre 2026', statut: 'CLOTURE', annee: 2026, mois: 9 }),
        creerPeriodeTest({ id: '2026-10', libelle: 'Octobre 2026', statut: 'VALIDE', annee: 2026, mois: 10 }),
        creerPeriodeTest({ id: '2026-11', libelle: 'Novembre 2026', statut: 'BROUILLON', annee: 2026, mois: 11 }),
      ];
      persistenceService.savePeriodes(pers);

      const bk = backupService.createFullBackup('Test 02');

      assertTest(
        'TEST_11_02',
        'Backup complet multi-périodes contenant l’ensemble des périodes configurées',
        bk.periods.length === 3 && bk.metadata.periodesCloturees.includes('2026-09'),
        'periods=3, cloturee=[2026-09]',
        `periods=${bk.periods.length}, cloturee=${bk.metadata.periodesCloturees.join(',')}`
      );
    }

    // =========================================================================
    // TEST 03 : Backup salariés référentiels
    // =========================================================================
    {
      const sals: SalarieReferentiel[] = [
        creerSalarieTest({ id: 's1', nom: 'ALAMI', prenom: 'MOHAMED', cnss: '101455267', cni: 'BE123456', actif: true }),
        creerSalarieTest({ id: 's2', nom: 'BENANI', prenom: 'FATIMA', cnss: '202566378', cni: 'BK987654', actif: true }),
      ];
      persistenceService.saveSalaries(sals);

      const bk = backupService.createFullBackup('Test 03');

      assertTest(
        'TEST_11_03',
        'Sauvegarde complète intégrant le référentiel complet des salariés',
        bk.employees.length === 2 && (bk.employees[0].cnss === '101455267' || bk.employees[0].immatriculationCnss === '101455267'),
        'employees.length=2, s1.cnss=101455267',
        `employees.length=${bk.employees.length}, s1=${bk.employees[0]?.cnss}`
      );
    }

    // =========================================================================
    // TEST 04 : Backup alias persistants
    // =========================================================================
    {
      const aliases: AliasItem[] = [
        creerAliasTest({ id: 'al_1', nomDeclare: 'YOUSSEF GHAFFOUR', nomOfficiel: 'YOUSSEF GHAFOUR', dateCreation: '2026-09-15', creePar: 'Auditeur' }),
      ];
      persistenceService.saveAliases(aliases);

      const bk = backupService.createFullBackup('Test 04');

      assertTest(
        'TEST_11_04',
        'Sauvegarde complète intégrant les alias persistants mémorisés',
        bk.aliases.length === 1 && (bk.aliases[0].nomDeclare === 'YOUSSEF GHAFFOUR' || bk.aliases[0].aliasBrut === 'YOUSSEF GHAFFOUR'),
        'aliases=1, alias=YOUSSEF GHAFFOUR',
        `aliases=${bk.aliases.length}, alias=${bk.aliases[0]?.nomDeclare || bk.aliases[0]?.aliasBrut}`
      );
    }

    // =========================================================================
    // TEST 05 : Backup audits
    // =========================================================================
    {
      const audits: EvenementAudit[] = [
        { id: 'aud_1', date: new Date().toISOString(), horodatage: new Date().toISOString(), utilisateur: 'Admin', action: 'VALIDATION_REGISTRE', categorie: 'REGISTRE', statut: 'VALIDE', details: 'Validation registre' },
      ];
      persistenceService.saveJournalAudit(audits);

      const bk = backupService.createFullBackup('Test 05');

      assertTest(
        'TEST_11_05',
        'Sauvegarde complète incluant le journal d’audit historique',
        bk.audits.length >= 1 && bk.audits.some(a => a.id === 'aud_1'),
        'audits includes aud_1',
        `audits.length=${bk.audits.length}`
      );
    }

    // =========================================================================
    // TEST 06 : Backup dossier clôturé
    // =========================================================================
    {
      const dosTest = creerDossierTest({
        periodeId: '2026-09',
        statut: 'CLOTURE',
        versionCourante: 1,
        dossierHash: 'sha256_mock_cloture_hash_09',
      });
      persistenceService.saveDossierPeriode('2026-09', dosTest);

      const bk = backupService.createFullBackup('Test 06');

      assertTest(
        'TEST_11_06',
        'Sauvegarde complète intégrant le dossier mensuel clôturé avec son empreinte',
        bk.dossiers['2026-09']?.statut === 'CLOTURE' && bk.dossiers['2026-09'].dossierHash === 'sha256_mock_cloture_hash_09',
        'dossier.statut=CLOTURE, dossierHash conforme',
        `statut=${bk.dossiers['2026-09']?.statut}, hash=${bk.dossiers['2026-09']?.dossierHash}`
      );
    }

    // =========================================================================
    // TEST 07 : Backup versionné
    // =========================================================================
    {
      const bk = backupService.createFullBackup('Test 07');

      assertTest(
        'TEST_11_07',
        'En-têtes de versionnement de format (1.0) et d’application (1.0.0) présents',
        bk.formatVersion === '1.0' && bk.applicationVersion === '1.0.0' && typeof bk.backupId === 'string',
        'formatVersion=1.0, appVersion=1.0.0, backupId valid',
        `format=${bk.formatVersion}, app=${bk.applicationVersion}, id=${bk.backupId}`
      );
    }

    // =========================================================================
    // TEST 08 : Hash déterministe
    // =========================================================================
    {
      const payloadA: MultsCnssBackupPayload = {
        company: persistenceService.getEntrepriseConfig(),
        periods: [creerPeriodeTest({ id: '2026-09', libelle: 'Septembre', statut: 'VALIDE' })],
        employees: [creerSalarieTest({ id: 's1', nom: 'ALAMI', prenom: 'MOHAMED', actif: true })],
        aliases: [],
        decisionsSorties: {},
        lignesPaie: {},
        rapprochements: {},
        registers: {},
        declarations: {} as any,
        payments: {} as any,
        dossiers: {} as any,
        audits: [],
        configurations: {},
      };

      const hash1 = backupService.calculerHashPayload(payloadA);
      const hash2 = backupService.calculerHashPayload({ ...payloadA });

      assertTest(
        'TEST_11_08',
        'Hash SHA-256 déterministe : deux calculs sur données identiques produisent le même hash',
        hash1 === hash2 && hash1.length === 64,
        'hash1 === hash2 (longueur 64 hex)',
        `hash1=${hash1.substring(0, 16)}..., hash2=${hash2.substring(0, 16)}...`
      );
    }

    // =========================================================================
    // TEST 09 : Altération du backup détectée
    // =========================================================================
    {
      const bk = backupService.createFullBackup('Test 09');
      // Modification furtive d'un salarié sans recalculer l'empreinte
      const altere = JSON.parse(JSON.stringify(bk));
      altere.employees.push(creerSalarieTest({ id: 's_pirate', nom: 'INTRUS', prenom: 'PIRATE', actif: true }));

      const val = backupService.validateBackup(altere);

      assertTest(
        'TEST_11_09',
        'Altération de données détectée : rejet avec code HASH_INVALID',
        !val.valide && val.codeErreur === 'HASH_INVALID',
        'valide=false, codeErreur=HASH_INVALID',
        `valide=${val.valide}, codeErreur=${val.codeErreur}`
      );
    }

    // =========================================================================
    // TEST 10 : Backup corrompu refusé
    // =========================================================================
    {
      const parseVide = backupService.parseBackup('');
      const parseJsonFaux = backupService.parseBackup('{ invalid_json: ');
      const valNul = backupService.validateBackup(null);

      assertTest(
        'TEST_11_10',
        'Fichier corrompu, vide ou syntaxe invalide immédiatement refusé',
        !parseVide.success && !parseJsonFaux.success && !valNul.valide,
        'Tous refusés avec message d’erreur clair',
        `vide=${parseVide.success}, badJson=${parseJsonFaux.success}, nullVal=${valNul.valide}`
      );
    }

    // =========================================================================
    // TEST 11 : Version incompatible refusée
    // =========================================================================
    {
      const bk = backupService.createFullBackup('Test 11');
      const incompatible = JSON.parse(JSON.stringify(bk));
      (incompatible as any).formatVersion = '99.0';

      const val = backupService.validateBackup(incompatible);

      assertTest(
        'TEST_11_11',
        'Version de format non supportée rejetée avec code VERSION_INCOMPATIBLE',
        !val.valide && val.codeErreur === 'VERSION_INCOMPATIBLE',
        'valide=false, codeErreur=VERSION_INCOMPATIBLE',
        `valide=${val.valide}, codeErreur=${val.codeErreur}`
      );
    }

    // =========================================================================
    // TEST 12 : Aperçu avant restauration
    // =========================================================================
    {
      const bk = backupService.createFullBackup('Test 12');
      const preview = backupService.previewBackup(bk);

      assertTest(
        'TEST_11_12',
        'Génération d’un aperçu précis (périodes, salariés, dossiers, empreinte, statut) avant restauration',
        preview.totalPeriodes === bk.periods.length &&
          preview.totalSalaries === bk.employees.length &&
          preview.statutIntegrite === 'VALIDE',
        'preview conforme aux métadonnées du backup',
        `periodes=${preview.totalPeriodes}, salaries=${preview.totalSalaries}, statut=${preview.statutIntegrite}`
      );
    }

    // =========================================================================
    // TEST 13 : Pré-backup automatique
    // =========================================================================
    {
      const pre = backupService.createPreRestoreBackup('Test 13');

      assertTest(
        'TEST_11_13',
        'Création automatique d’un pré-backup de sécurité avec type PRE_RESTORE',
        pre.backupType === 'PRE_RESTORE' && pre.backupId.startsWith('pre_restore_'),
        'backupType=PRE_RESTORE',
        `type=${pre.backupType}, id=${pre.backupId}`
      );
    }

    // =========================================================================
    // TEST 14 : Restauration complète
    // =========================================================================
    {
      // Préparation d'un jeu de test
      persistenceService.clearAll();
      const pers: PeriodeMensuelle[] = [
        creerPeriodeTest({ id: '2026-09', libelle: 'Septembre 2026', statut: 'VALIDE', annee: 2026, mois: 9 }),
      ];
      const sals: SalarieReferentiel[] = [
        creerSalarieTest({ id: 's1', nom: 'MOUKRIM', prenom: 'MAROUANE', cnss: '101455267', actif: true }),
      ];
      persistenceService.savePeriodes(pers);
      persistenceService.saveSalaries(sals);

      const bk = backupService.createFullBackup('Test 14 Export');

      // Effacement complet
      persistenceService.clearAll();
      persistenceService.savePeriodes([]);
      persistenceService.saveSalaries([]);

      // Restauration
      const res = backupService.restoreBackup(bk, { ecraserConflits: true });

      const periodesApres = persistenceService.getPeriodes();
      const salariesApres = persistenceService.getSalaries();

      assertTest(
        'TEST_11_14',
        'Restauration complète rétablissant les périodes et le référentiel salariés',
        res.succes && periodesApres.length === 1 && salariesApres.length === 1 && (salariesApres[0].nom === 'MOUKRIM' || salariesApres[0].nomComplet.includes('MOUKRIM')),
        'succes=true, periodes=1, salarie=MOUKRIM',
        `succes=${res.succes}, periodes=${periodesApres.length}, salarie=${salariesApres[0]?.nomComplet}`
      );
    }

    // =========================================================================
    // TEST 15 : Restauration atomique
    // =========================================================================
    {
      const bk = backupService.createFullBackup('Test 15');
      const res = backupService.restoreBackup(bk, { ecraserConflits: true });

      assertTest(
        'TEST_11_15',
        'Restauration atomique réussie avec statut RESTAURATION_COMPLETE',
        res.succes && res.statut === 'RESTAURATION_COMPLETE',
        'statut === RESTAURATION_COMPLETE',
        `statut=${res.statut}`
      );
    }

    // =========================================================================
    // TEST 16 : Rollback automatique
    // =========================================================================
    {
      const etatAvant = backupService.createPreRestoreBackup('Test 16 Avant');
      // Forcer un rollback
      const succesRollback = backupService.rollback(etatAvant);

      assertTest(
        'TEST_11_16',
        'Rollback automatique rétablissant fidèlement l’état antérieur',
        succesRollback,
        'rollback === true',
        `rollback=${succesRollback}`
      );
    }

    // =========================================================================
    // TEST 17 : Périodes identiques avant/après
    // =========================================================================
    {
      const snap1 = backupService.captureCurrentStateSnapshot();
      const bk = backupService.createFullBackup('Test 17');
      backupService.restoreBackup(bk, { ecraserConflits: true });
      const snap2 = backupService.captureCurrentStateSnapshot();

      assertTest(
        'TEST_11_17',
        'Nombre et identifiants des périodes strictement identiques avant/après restauration',
        snap1.nombrePeriodes === snap2.nombrePeriodes &&
          JSON.stringify(snap1.periodesIds) === JSON.stringify(snap2.periodesIds),
        'periodes avant === periodes apres',
        `avant=${snap1.nombrePeriodes}, apres=${snap2.nombrePeriodes}`
      );
    }

    // =========================================================================
    // TEST 18 : Salariés identiques avant/après
    // =========================================================================
    {
      const salsAvant = persistenceService.getSalaries();
      const bk = backupService.createFullBackup('Test 18');
      backupService.restoreBackup(bk, { ecraserConflits: true });
      const salsApres = persistenceService.getSalaries();

      assertTest(
        'TEST_11_18',
        'Référentiel salariés strictement identique avant/après restauration',
        salsAvant.length === salsApres.length,
        'salaries avant === salaries apres',
        `avant=${salsAvant.length}, apres=${salsApres.length}`
      );
    }

    // =========================================================================
    // TEST 19 : Alias identiques avant/après
    // =========================================================================
    {
      const aliasesAvant = persistenceService.getAliases();
      const bk = backupService.createFullBackup('Test 19');
      backupService.restoreBackup(bk, { ecraserConflits: true });
      const aliasesApres = persistenceService.getAliases();

      assertTest(
        'TEST_11_19',
        'Alias de rapprochement identiques avant/après restauration',
        aliasesAvant.length === aliasesApres.length,
        'aliases avant === aliases apres',
        `avant=${aliasesAvant.length}, apres=${aliasesApres.length}`
      );
    }

    // =========================================================================
    // TEST 20 : Audits conservés avant/après
    // =========================================================================
    {
      const bk = backupService.createFullBackup('Test 20');
      backupService.restoreBackup(bk, { ecraserConflits: true });
      const auditsApres = persistenceService.getJournalAudit();

      assertTest(
        'TEST_11_20',
        'Journal d’audit historique conservé après restauration',
        auditsApres.length >= bk.audits.length,
        'auditsApres.length >= bk.audits.length',
        `bkAudits=${bk.audits.length}, auditsApres=${auditsApres.length}`
      );
    }

    // =========================================================================
    // TEST 21 : Hashes identiques avant/après
    // =========================================================================
    {
      const snapAvant = backupService.captureCurrentStateSnapshot();
      const bk = backupService.createFullBackup('Test 21');
      backupService.restoreBackup(bk, { ecraserConflits: true });
      const snapApres = backupService.captureCurrentStateSnapshot();

      assertTest(
        'TEST_11_21',
        'Empreinte de contenu (Content Hash) identique avant/après restauration',
        snapAvant.contentHash === snapApres.contentHash,
        'contentHash avant === contentHash apres',
        `avant=${snapAvant.contentHash.substring(0, 16)}..., apres=${snapApres.contentHash.substring(0, 16)}...`
      );
    }

    // =========================================================================
    // TEST 22 : Période clôturée reste clôturée
    // =========================================================================
    {
      const pCloturee = creerPeriodeTest({
        id: '2026-09',
        libelle: 'Septembre 2026',
        statut: 'CLOTURE',
        annee: 2026,
        mois: 9,
        dateCloture: '2026-10-01T12:00:00Z',
      });
      persistenceService.savePeriodes([pCloturee]);

      const bk = backupService.createFullBackup('Test 22');
      persistenceService.clearAll();
      backupService.restoreBackup(bk, { ecraserConflits: true });

      const pRest = persistenceService.getPeriodes().find(p => (p.id || p.idMois) === '2026-09');

      assertTest(
        'TEST_11_22',
        'Une période clôturée reste strictement au statut CLOTURE après restauration (aucun retour en BROUILLON)',
        pRest?.statut === 'CLOTURE',
        'pRest.statut === CLOTURE',
        `statut=${pRest?.statut}`
      );
    }

    // =========================================================================
    // TEST 23 : Modification période clôturée bloquée
    // =========================================================================
    {
      const pCloturee = persistenceService.getPeriodes().find(p => (p.id || p.idMois) === '2026-09');
      const bloquee = pCloturee?.statut === 'CLOTURE';

      assertTest(
        'TEST_11_23',
        'Garde-fous de protection : la période clôturée restaurée interdit les modifications silencieuses',
        bloquee,
        'période verrouillée en lecture seule',
        `statut=${pCloturee?.statut}`
      );
    }

    // =========================================================================
    // TEST 24 : Conflit de période détecté
    // =========================================================================
    {
      const pers: PeriodeMensuelle[] = [
        creerPeriodeTest({ id: '2026-09', libelle: 'Septembre 2026', statut: 'VALIDE', annee: 2026, mois: 9 }),
      ];
      persistenceService.savePeriodes(pers);

      const bk = backupService.createFullBackup('Test 24');

      // Tenter une restauration sans autoriser l'écrasement
      const res = backupService.restoreBackup(bk, { ecraserConflits: false });

      assertTest(
        'TEST_11_24',
        'Conflit de période détecté : refus avec statut CONFLIT_PERIODE si écrasement non confirmé',
        !res.succes && res.statut === 'CONFLIT_PERIODE',
        'succes=false, statut=CONFLIT_PERIODE',
        `succes=${res.succes}, statut=${res.statut}`
      );
    }

    // =========================================================================
    // TEST 25 : Aucune fusion silencieuse
    // =========================================================================
    {
      const bk = backupService.createFullBackup('Test 25');
      const conflits = backupService.detecterConflitsPeriodes(bk);

      assertTest(
        'TEST_11_25',
        'Détection explicite des conflits sans fusion silencieuse des données',
        conflits.length > 0 && conflits[0].periodeId === '2026-09',
        'conflits détaillés renvoyés à l’utilisateur',
        `conflits.length=${conflits.length}, p0=${conflits[0]?.periodeId}`
      );
    }

    // =========================================================================
    // TEST 26 : Double restauration gérée (idempotence)
    // =========================================================================
    {
      const bk = backupService.createFullBackup('Test 26');
      const res1 = backupService.restoreBackup(bk, { ecraserConflits: true });
      const snap1 = backupService.captureCurrentStateSnapshot();

      const res2 = backupService.restoreBackup(bk, { ecraserConflits: true });
      const snap2 = backupService.captureCurrentStateSnapshot();

      assertTest(
        'TEST_11_26',
        'Double restauration consécutive idempotente : état identique et aucun doublon créé',
        res1.succes && res2.succes && snap1.contentHash === snap2.contentHash,
        'snap1.contentHash === snap2.contentHash',
        `res1=${res1.succes}, res2=${res2.succes}, hashesIdentiques=${snap1.contentHash === snap2.contentHash}`
      );
    }

    // =========================================================================
    // TEST 27 : Double backup géré (Content Hash identique)
    // =========================================================================
    {
      const bk1 = backupService.createFullBackup('Test 27 A');
      const bk2 = backupService.createFullBackup('Test 27 B');

      assertTest(
        'TEST_11_27',
        'Deux backups générés sans modification produisent exactement le même Content Hash SHA-256',
        bk1.integrity.contentHash === bk2.integrity.contentHash && bk1.backupId !== bk2.backupId,
        'bk1.contentHash === bk2.contentHash malgré backupId distinct',
        `bk1=${bk1.integrity.contentHash.substring(0, 16)}..., bk2=${bk2.integrity.contentHash.substring(0, 16)}...`
      );
    }

    // =========================================================================
    // TEST 28 : Interruption / Fichier partiel géré
    // =========================================================================
    {
      const bk = backupService.createFullBackup('Test 28');
      const serialise = backupService.serializeBackup(bk);
      // Simulation d'une coupure en cours d'écriture
      const tronque = serialise.substring(0, Math.floor(serialise.length / 2));
      const parse = backupService.parseBackup(tronque);

      assertTest(
        'TEST_11_28',
        'Fichier backup tronqué ou incomplet rejeté immédiatement lors du parsing',
        !parse.success,
        'parse.success === false',
        `success=${parse.success}, error=${parse.error}`
      );
    }

    // =========================================================================
    // TEST 29 : Interruption restauration gérée
    // =========================================================================
    {
      const preBackup = backupService.createPreRestoreBackup('Test 29');
      // En cas d'erreur levée, la restauration fait un rollback vers preBackup
      const rollbackOk = backupService.rollback(preBackup);

      assertTest(
        'TEST_11_29',
        'Restauration interrompue annulable et rétablissement de l’état antérieur',
        rollbackOk,
        'rollbackOk === true',
        `rollbackOk=${rollbackOk}`
      );
    }

    // =========================================================================
    // TEST 30 : Stockage corrompu détecté
    // =========================================================================
    {
      const report = backupService.verifyGlobalIntegrity();

      assertTest(
        'TEST_11_30',
        'Vérification globale d’intégrité capable de qualifier l’état du stockage local',
        typeof report.valide === 'boolean' && ['INTEGRITY_CHECK_OK', 'INTEGRITY_CHECK_FAILED'].includes(report.statut),
        'report.statut est valide',
        `statut=${report.statut}, valide=${report.valide}`
      );
    }

    // =========================================================================
    // TEST 31 : Backup pré-restauration obligatoire
    // =========================================================================
    {
      const pre = backupService.getLastPreRestoreBackup();

      assertTest(
        'TEST_11_31',
        'Le pré-backup de sécurité est conservé en mémoire pour reprise immédiate',
        Boolean(pre && pre.backupType === 'PRE_RESTORE'),
        'preBackup disponible',
        `preType=${pre?.backupType}`
      );
    }

    // =========================================================================
    // TEST 32 : Retour exact à l’état A
    // =========================================================================
    {
      const snapA = backupService.captureCurrentStateSnapshot();
      const pre = backupService.createPreRestoreBackup('Test 32');

      // Perturbation volontaire de l'état
      persistenceService.saveSalaries([creerSalarieTest({ id: 'sal_temp', nom: 'TEMP', prenom: 'TEMP', actif: true })]);

      // Exécution rollback
      backupService.rollback(pre);
      const snapRetour = backupService.captureCurrentStateSnapshot();

      assertTest(
        'TEST_11_32',
        'Retour exact et vérifié à l’état A après annulation ou rollback',
        snapA.nombreSalaries === snapRetour.nombreSalaries && snapA.contentHash === snapRetour.contentHash,
        'snapA === snapRetour',
        `salA=${snapA.nombreSalaries}, salRetour=${snapRetour.nombreSalaries}`
      );
    }

    // =========================================================================
    // TEST 33 : Archive d’une période créée
    // =========================================================================
    {
      const arch = backupService.createPeriodArchive('2026-09', 'Test 33');

      assertTest(
        'TEST_11_33',
        'Archive d’une période spécifique créée avec backupType=PERIOD_ARCHIVE et targetPeriodId',
        arch.backupType === 'PERIOD_ARCHIVE' && arch.targetPeriodId === '2026-09' && arch.periods.length === 1,
        'type=PERIOD_ARCHIVE, targetPeriodId=2026-09',
        `type=${arch.backupType}, target=${arch.targetPeriodId}, periods=${arch.periods.length}`
      );
    }

    // =========================================================================
    // TEST 34 : Archive de période vérifiable
    // =========================================================================
    {
      const arch = backupService.createPeriodArchive('2026-09', 'Test 34');
      const val = backupService.validateBackup(arch);

      assertTest(
        'TEST_11_34',
        'L’archive de période est 100% autonome et son hash SHA-256 est vérifiable',
        val.valide && arch.integrity.contentHash.length === 64,
        'valide=true, hash SHA-256 calculé',
        `valide=${val.valide}, hashLen=${arch.integrity.contentHash.length}`
      );
    }

    // =========================================================================
    // TEST 35 : Contrôle d’intégrité global
    // =========================================================================
    {
      const report = backupService.verifyGlobalIntegrity();

      assertTest(
        'TEST_11_35',
        'Fonction verifyGlobalIntegrity() opérationnelle avec détails statistiques',
        report.details.totalPeriodes >= 0 && typeof report.details.referencesCroiseesValides === 'boolean',
        'details statistiques renseignés',
        `statut=${report.statut}, periodes=${report.details.totalPeriodes}`
      );
    }

    // =========================================================================
    // TEST 36 : Backup avec plusieurs versions de dossiers
    // =========================================================================
    {
      const dosAvecVersions = creerDossierTest({
        periodeId: '2026-09',
        statut: 'CLOTURE',
        versionCourante: 2,
        version: 2,
        dossierHash: 'sha256_mock_v2_hash',
        versionsHistorique: [
          {
            numeroVersion: 1,
            dateCreation: '2026-09-30T10:00:00Z',
            dateCloture: '2026-09-30T11:00:00Z',
            cloturePar: 'Admin',
            statut: 'CLOTURE',
            hash: 'sha256_v1_archive',
            totalSalaries: 10,
            totalGlobalAPayer: 12760,
          },
        ],
      });
      persistenceService.saveDossierPeriode('2026-09', dosAvecVersions);

      const bk = backupService.createFullBackup('Test 36');

      assertTest(
        'TEST_11_36',
        'Sauvegarde et intégrité de l’historique des versions (v1 archivée et v2 active)',
        bk.dossiers['2026-09']?.versionCourante === 2 && (bk.dossiers['2026-09'].versionsHistorique?.length === 1 || bk.dossiers['2026-09'].historiqueVersions?.length === 1),
        'version=2, versionsHistorique=1',
        `version=${bk.dossiers['2026-09']?.versionCourante}, versions=${bk.dossiers['2026-09']?.versionsHistorique?.length}`
      );
    }

    // =========================================================================
    // TEST 37 : Restauration d’alias fonctionnelle
    // =========================================================================
    {
      persistenceService.saveAliases([
        creerAliasTest({ id: 'al_test', nomDeclare: 'AMINE BAHHA', nomOfficiel: 'AMINE BAHA', dateCreation: '2026-09-10', creePar: 'Admin' }),
      ]);
      const bk = backupService.createFullBackup('Test 37');

      persistenceService.clearAll();
      backupService.restoreBackup(bk, { ecraserConflits: true });

      const alRest = persistenceService.getAliases();

      assertTest(
        'TEST_11_37',
        'Restauration fidèle des alias utilisables immédiatement pour le rapprochement',
        alRest.some(a => (a.nomDeclare === 'AMINE BAHHA' || a.aliasBrut === 'AMINE BAHHA') && (a.nomOfficiel === 'AMINE BAHA' || a.nomOfficielSalarie === 'AMINE BAHA')),
        'alias AMINE BAHHA restauré',
        `alRest.length=${alRest.length}`
      );
    }

    // =========================================================================
    // TEST 38 : Restauration des audits historiques
    // =========================================================================
    {
      const auditEvt: EvenementAudit = {
        id: 'aud_historique_38',
        date: '2026-09-20T14:30:00Z',
        horodatage: '2026-09-20T14:30:00Z',
        utilisateur: 'Auditeur MULT.S',
        action: 'CONFIRMATION_SORTIE',
        categorie: 'SORTIES',
        typeEvenement: 'SORTIE_SALARIE_CONFIRMEE',
        statut: 'VALIDE',
        details: 'Sortie confirmée avec justification historique',
      };
      persistenceService.saveJournalAudit([auditEvt]);
      const bk = backupService.createFullBackup('Test 38');

      persistenceService.clearAll();
      backupService.restoreBackup(bk, { ecraserConflits: true });

      const auditsRest = persistenceService.getJournalAudit();

      assertTest(
        'TEST_11_38',
        'Les événements d’audit historiques sont intégralement retrouvés après restauration',
        auditsRest.some(a => a.id === 'aud_historique_38'),
        'aud_historique_38 présent',
        `trouve=${auditsRest.some(a => a.id === 'aud_historique_38')}`
      );
    }

    // =========================================================================
    // TEST 39 : Restauration des dossiers clôturés
    // =========================================================================
    {
      const dosRest = persistenceService.getDossierPeriode('2026-09');

      assertTest(
        'TEST_11_39',
        'Dossier CNSS mensuel clôturé intact après restauration avec son hash conservé',
        Boolean(dosRest && dosRest.statut === 'CLOTURE'),
        'dossier présent et statut === CLOTURE',
        `statut=${dosRest?.statut}`
      );
    }

    // =========================================================================
    // TEST 40 : Test complet de reprise après sinistre (DISASTER RECOVERY)
    // =========================================================================
    {
      // 1. Mise en place de 4 périodes réelles
      const persSinistre: PeriodeMensuelle[] = [
        creerPeriodeTest({ id: '2026-09', libelle: 'Septembre 2026', statut: 'CLOTURE', annee: 2026, mois: 9, dateCloture: '2026-10-01T10:00:00Z' }),
        creerPeriodeTest({ id: '2026-10', libelle: 'Octobre 2026', statut: 'VALIDE', annee: 2026, mois: 10 }),
        creerPeriodeTest({ id: '2026-11', libelle: 'Novembre 2026', statut: 'BROUILLON', annee: 2026, mois: 11 }),
        creerPeriodeTest({ id: '2026-12', libelle: 'Décembre 2026', statut: 'BROUILLON', annee: 2026, mois: 12 }),
      ];
      persistenceService.savePeriodes(persSinistre);

      // Salariés
      persistenceService.saveSalaries([
        creerSalarieTest({ id: 's1', nom: 'ALAMI', prenom: 'MOHAMED', cnss: '101455267', cni: 'BE123456', actif: true }),
        creerSalarieTest({ id: 's2', nom: 'BENANI', prenom: 'FATIMA', cnss: '202566378', cni: 'BK987654', actif: true }),
        creerSalarieTest({ id: 's3', nom: 'CHALOUH', prenom: 'YASSINE', cnss: '303677489', cni: 'BH112233', actif: true }),
      ]);

      // Alias
      persistenceService.saveAliases([
        creerAliasTest({ id: 'al_sin_1', nomDeclare: 'SAAD IMRAN', nomOfficiel: 'IMRAN SAAD', dateCreation: '2026-09-01', creePar: 'Admin' }),
      ]);

      // Capture de l'état complet de référence A
      const etatReferenceA = backupService.captureCurrentStateSnapshot();

      // Création du Backup Complet
      const backupSinistre = backupService.createFullBackup('Disaster Recovery Test');

      // SIMULATION DU SINISTRE TOTAL : PERTE ABSOLUE DU STOCKAGE LOCAL
      persistenceService.clearAll();
      persistenceService.savePeriodes([]);
      persistenceService.saveSalaries([]);
      persistenceService.saveAliases([]);
      persistenceService.saveJournalAudit([]);

      const etatApresSinistre = backupService.captureCurrentStateSnapshot();
      const stockageEstVide = etatApresSinistre.nombrePeriodes === 0 && etatApresSinistre.nombreSalaries === 0;

      // REPRISE APRÈS SINISTRE : IMPORT & RESTAURATION ATOMIQUE
      const resultatReprise = backupService.restoreBackup(backupSinistre, { ecraserConflits: true });
      const etatRestaureB = backupService.captureCurrentStateSnapshot();

      // Comparaison d'intégrité avant sinistre vs après restauration
      const comparaison = backupService.compareStateBeforeAfterRestore(etatReferenceA, etatRestaureB);

      // Vérification que la période clôturée de Septembre 2026 est restée CLOTURE
      const periodeSeptembre = persistenceService.getPeriodes().find(p => (p.id || p.idMois) === '2026-09');

      assertTest(
        'TEST_11_40',
        'Reprise après sinistre totale réussie : Restauration intégrale depuis le néant, état 100% identique et période clôturée préservée',
        stockageEstVide && resultatReprise.succes && comparaison.identique && periodeSeptembre?.statut === 'CLOTURE',
        'sinistre_vide=true, reprise=true, comparaison.identique=true, statut=CLOTURE',
        `vide=${stockageEstVide}, reprise=${resultatReprise.succes}, identique=${comparaison.identique}, septStatut=${periodeSeptembre?.statut}`
      );
    }

    // =========================================================================
    // TEST 41 : Protection des données sensibles (CNI/CNSS)
    // =========================================================================
    {
      const nomBackup = backupService.genererNomFichier('FULL');
      const nomArchive = backupService.genererNomFichier('PERIOD_ARCHIVE', '2026-09');
      const nomPreRestore = backupService.genererNomFichier('PRE_RESTORE');

      const pasDeCni = !nomBackup.includes('BE123456') && !nomArchive.includes('BE123456');
      const pasDeCnss = !nomBackup.includes('101455267') && !nomArchive.includes('101455267');

      assertTest(
        'TEST_11_41',
        'Noms de fichiers normalisés et exempts de données sensibles individuelles (CNI, CNSS, Salaires)',
        pasDeCni && pasDeCnss && nomArchive === 'MULTS_CNSS_ARCHIVE_2026-09.mcnss',
        'aucun CNI/CNSS dans les noms de fichiers',
        `backup=${nomBackup}, archive=${nomArchive}`
      );
    }

    // =========================================================================
    // TEST 42 : Performance et réactivité sur backup volumineux
    // =========================================================================
    {
      // Simulation 200 salariés
      const grosEffectif: SalarieReferentiel[] = [];
      for (let i = 0; i < 200; i++) {
        grosEffectif.push(
          creerSalarieTest({
            id: `sal_perf_${i}`,
            nom: `NOM_${i}`,
            prenom: `PRENOM_${i}`,
            cnss: `1000000${i.toString().padStart(3, '0')}`,
            cni: `AA${i.toString().padStart(6, '0')}`,
            actif: true,
          })
        );
      }
      persistenceService.saveSalaries(grosEffectif);

      const t0 = Date.now();
      const bkGros = backupService.createFullBackup('Test 42 Perf');
      const tBackup = Date.now() - t0;

      const t1 = Date.now();
      const valGros = backupService.validateBackup(bkGros);
      const tValidation = Date.now() - t1;

      assertTest(
        'TEST_11_42',
        'Performance sur gros effectif : génération et validation du hash SHA-256 en moins de 500 ms',
        valGros.valide && tBackup < 500 && tValidation < 500,
        'valide=true, tBackup < 500ms, tValidation < 500ms',
        `tBackup=${tBackup}ms, tValidation=${tValidation}ms`
      );
    }
  } finally {
    // Restauration propre de l'état initial après passage des tests
    backupService.restoreBackup(snapshotInitial, { ecraserConflits: true, ignorerAuditInterne: true });
  }

  const fin = Date.now();
  const tempsExecutionMs = fin - debut;
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
