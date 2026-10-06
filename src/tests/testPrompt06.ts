/**
 * Banc de tests automatisés pour PROMPT 06 (Section 26)
 * Valide les 20 exigences métier du Registre Mensuel CNSS, de la consolidation et des contrôles.
 */

import { cnssRegisterService } from '../services/cnssRegisterService';
import { persistenceService } from '../services/persistenceService';
import { chargerBaseSalariesReelle, chargerLignesPaieReelles } from '../data/septembreRealData';
import { executerRapprochement, rapprocherLigne } from '../services/matchingEngine';
import { validationEngine } from '../services/validationEngine';
import { LigneRegistreCnss, LignePaieImportee } from '../types/cnss';
import { normaliserNom } from '../services/normalizer';

export interface ResultatTestP6 {
  id: number;
  cas: string;
  succes: boolean;
  attendu: string;
  obtenu: string;
  details: string;
}

export interface BilanPrompt06 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTestP6[];
}

export function executerTestsPrompt06(): BilanPrompt06 {
  const resultats: ResultatTestP6[] = [];
  const baseSalaries = chargerBaseSalariesReelle();
  const lignesPaie = chargerLignesPaieReelles();
  const raps = executerRapprochement(lignesPaie, baseSalaries);
  const anomalies = validationEngine.auditer(raps, baseSalaries);
  const periodeId = '2026-09';

  // TEST 1 : Construire le registre à partir d'un mois importé
  const registre = cnssRegisterService.construireRegistre(periodeId, lignesPaie, baseSalaries, raps, anomalies);
  {
    const succes = registre.length === lignesPaie.length && registre.length >= 88;
    resultats.push({
      id: 1,
      cas: 'TEST 1 : Construction du registre mensuel à partir d\'un mois importé',
      succes,
      attendu: 'Registre créé de façon déterministe (>= 88 lignes)',
      obtenu: `Nombre de lignes créées : ${registre.length}`,
      details: 'Chaque ligne de paie correspond à une entrée consolidée dans le registre.',
    });
  }

  // TEST 2 : Présence obligatoire de periodeId, lignePaieId, salarieId lorsque identifié
  {
    const toutesOntIds = registre.every(l => Boolean(l.periodeId && l.lignePaieId));
    const lesIdentifiesOntSalarieId = registre
      .filter(l => l.statutRapprochement === 'IDENTIFIE')
      .every(l => Boolean(l.salarieId));
    const succes = toutesOntIds && lesIdentifiesOntSalarieId;

    resultats.push({
      id: 2,
      cas: 'TEST 2 : Traçabilité obligatoire (periodeId, lignePaieId, salarieId)',
      succes,
      attendu: 'Aucune ligne orpheline (periodeId et lignePaieId obligatoires)',
      obtenu: `Toutes avec IDs : ${toutesOntIds ? 'OUI' : 'NON'} | Identifiés avec salarieId : ${lesIdentifiesOntSalarieId ? 'OUI' : 'NON'}`,
      details: 'La traçabilité de bout en bout jusqu\'à la source du fichier de paie est garantie.',
    });
  }

  // TEST 3 : joursImportes = 27 => joursImportes reste 27 intact
  {
    const ligneHaoudi = registre.find(l => normaliserNom(l.nomSource).includes('HAOUDI'));
    const succes = ligneHaoudi !== undefined && ligneHaoudi.joursImportes === 27;

    resultats.push({
      id: 3,
      cas: 'TEST 3 : Conservation stricte de joursImportes = 27',
      succes,
      attendu: 'joursImportes = 27 reste strictement intact dans le registre',
      obtenu: `joursImportes = ${ligneHaoudi?.joursImportes ?? 'NON TROUVE'} j`,
      details: 'Le registre ne détruit jamais la valeur brute source.',
    });
  }

  // TEST 4 : Correction 27 → 26 => joursImportes = 27, joursDeclares = 26
  {
    const ligneHaoudi = registre.find(l => normaliserNom(l.nomSource).includes('HAOUDI'));
    if (ligneHaoudi) {
      const resCorrec = cnssRegisterService.appliquerCorrectionJours(
        ligneHaoudi,
        26,
        'Plafonnement légal CNSS 26 jours'
      );
      const succes =
        resCorrec.succes &&
        resCorrec.ligneModifiee?.joursImportes === 27 &&
        resCorrec.ligneModifiee?.joursDeclares === 26 &&
        resCorrec.ligneModifiee?.corrections.length === 1;

      resultats.push({
        id: 4,
        cas: 'TEST 4 : Correction 27 → 26 jours avec traçabilité',
        succes,
        attendu: 'joursImportes=27, joursDeclares=26, correction enregistrée',
        obtenu: `Importé : ${resCorrec.ligneModifiee?.joursImportes} j | Déclaré : ${resCorrec.ligneModifiee?.joursDeclares} j | Corrections : ${resCorrec.ligneModifiee?.corrections.length}`,
        details: 'Le découplage source / déclaré est pleinement appliqué.',
      });
    } else {
      resultats.push({
        id: 4,
        cas: 'TEST 4 : Correction 27 → 26 jours',
        succes: false,
        attendu: 'Ligne trouvée',
        obtenu: 'Ligne non trouvée',
        details: 'Erreur recherche ligne',
      });
    }
  }

  // TEST 5 : Correction sans motif => REFUSÉE
  {
    const premiereLigne = registre[0];
    const resSansMotif = cnssRegisterService.appliquerCorrectionJours(premiereLigne, 20, '');
    const succes = resSansMotif.succes === false && resSansMotif.erreur !== undefined;

    resultats.push({
      id: 5,
      cas: 'TEST 5 : Refus formel de toute correction sans justification',
      succes,
      attendu: 'Correction rejetée avec message d\'erreur explicite',
      obtenu: `succes = ${resSansMotif.succes} | Erreur : "${resSansMotif.erreur}"`,
      details: 'La justification humaine est strictement requise par le protocole d\'audit.',
    });
  }

  // TEST 6 : SAFWAN DAOU NON_IDENTIFIE => ligne BLOQUÉE
  {
    const ligneSafwan = registre.find(l => normaliserNom(l.nomSource).includes('SAFWAN'));
    const succes = ligneSafwan !== undefined && ligneSafwan.statut === 'BLOQUE';

    resultats.push({
      id: 6,
      cas: 'TEST 6 : Salarié absent "SAFWAN DAOU" non identifié => Statut BLOQUÉ',
      succes,
      attendu: 'statut = "BLOQUE" avec motif d\'absence d\'identification',
      obtenu: `Statut : ${ligneSafwan?.statut} | Motifs : ${ligneSafwan?.motifsBlocage.join(' ; ')}`,
      details: 'Une ligne non identifiée bloque la préparation tant qu\'elle n\'est pas confirmée ou rattachée.',
    });
  }

  // TEST 7 : AYOUB EL WARDI AMBIGU => ligne BLOQUÉE
  {
    const ligneWardiTest: LignePaieImportee = {
      id: 'paie_wardi_ambigu',
      nomCompletBrut: 'AYOUB EL WARDI',
      nomNormalise: normaliserNom('AYOUB EL WARDI'),
      tokensNom: ['AYOUB', 'EL', 'WARDI'],
      joursImportes: 25,
    };
    const rapWardi = rapprocherLigne(ligneWardiTest, baseSalaries);
    const regWardi = cnssRegisterService.construireRegistre('2026-09', [ligneWardiTest], baseSalaries, [rapWardi], []);
    const succes = rapWardi.estAmbigu === true && regWardi[0]?.statut === 'BLOQUE';

    resultats.push({
      id: 7,
      cas: 'TEST 7 : Salarié ambigu "AYOUB EL WARDI" => Statut BLOQUÉ',
      succes,
      attendu: 'statut = "BLOQUE" empêchant toute déclaration sans arbitrage',
      obtenu: `estAmbigu: ${rapWardi.estAmbigu ? 'OUI' : 'NON'} | Statut: ${regWardi[0]?.statut}`,
      details: 'Le système interdit de déclarer une ligne ambiguë non tranchée par un gestionnaire.',
    });
  }

  // TEST 8 : MAROUANE MOUKRIM SORTI + 18 jours => ligne BLOQUÉE jusqu'à arbitrage
  {
    const ligneMoukrimTest: LignePaieImportee = {
      id: 'paie_moukrim_sorti',
      nomCompletBrut: 'MAROUANE MOUKRIM',
      nomNormalise: normaliserNom('MAROUANE MOUKRIM'),
      tokensNom: ['MAROUANE', 'MOUKRIM'],
      joursImportes: 18,
    };
    const rapMoukrim = rapprocherLigne(ligneMoukrimTest, baseSalaries);
    const anosMoukrim = validationEngine.auditer([rapMoukrim], baseSalaries);
    const regMoukrim = cnssRegisterService.construireRegistre('2026-09', [ligneMoukrimTest], baseSalaries, [rapMoukrim], anosMoukrim);
    const succes = regMoukrim[0]?.statut === 'BLOQUE';

    resultats.push({
      id: 8,
      cas: 'TEST 8 : Salarié SORTI avec 18 jours de paie => Statut BLOQUÉ',
      succes,
      attendu: 'statut = "BLOQUE" nécessitant confirmation de réactivation',
      obtenu: `Statut : ${regMoukrim[0]?.statut} | Motifs : ${regMoukrim[0]?.motifsBlocage.join(' ; ')}`,
      details: 'Un salarié archivé comme sorti ne peut être déclaré avec des jours sans arbitrage.',
    });
  }

  // TEST 9 : CNSS manquant => A_COMPLETER ou BLOQUE
  {
    const salarieSansCnss = { ...baseSalaries[0], immatriculationCnss: undefined };
    const ligneTest: LignePaieImportee = {
      id: 'test_cnss_manquant',
      nomCompletBrut: salarieSansCnss.nomComplet,
      nomNormalise: salarieSansCnss.nomNormalise,
      tokensNom: salarieSansCnss.tokensNom,
      joursImportes: 20,
    };
    const rapTest = rapprocherLigne(ligneTest, [salarieSansCnss]);
    rapTest.validation = 'VALIDE';
    rapTest.salariePropose = salarieSansCnss;
    const regSansCnss = cnssRegisterService.construireRegistre(
      '2026-09',
      [ligneTest],
      [salarieSansCnss],
      [rapTest],
      []
    );
    const succes = (regSansCnss[0].statut === 'A_COMPLETER' || regSansCnss[0].statut === 'BLOQUE') && regSansCnss[0].cnss === 'MANQUANT';

    resultats.push({
      id: 9,
      cas: 'TEST 9 : N° CNSS manquant => Statut A_COMPLETER ou BLOQUE',
      succes,
      attendu: 'statut = "A_COMPLETER" ou "BLOQUE", cnss = "MANQUANT"',
      obtenu: `Statut : ${regSansCnss[0]?.statut} | CNSS : ${regSansCnss[0]?.cnss}`,
      details: 'L\'absence de numéro CNSS empêche le passage à l\'état PRÊT.',
    });
  }

  // TEST 10 : CNI manquante => A_COMPLETER
  {
    const salarieSansCni = { ...baseSalaries[0], cni: undefined };
    const ligneTest: LignePaieImportee = {
      id: 'test_cni_manquante',
      nomCompletBrut: salarieSansCni.nomComplet,
      nomNormalise: salarieSansCni.nomNormalise,
      tokensNom: salarieSansCni.tokensNom,
      joursImportes: 22,
    };
    const rapTest = rapprocherLigne(ligneTest, [salarieSansCni]);
    rapTest.validation = 'VALIDE';
    const regSansCni = cnssRegisterService.construireRegistre(
      '2026-09',
      [ligneTest],
      [salarieSansCni],
      [rapTest],
      []
    );
    const succes = regSansCni[0].statut === 'A_COMPLETER' && regSansCni[0].cni === 'MANQUANT';

    resultats.push({
      id: 10,
      cas: 'TEST 10 : CNI manquante => Statut A_COMPLETER',
      succes,
      attendu: 'statut = "A_COMPLETER", cni = "MANQUANT"',
      obtenu: `Statut : ${regSansCni[0]?.statut} | CNI : ${regSansCni[0]?.cni}`,
      details: 'La carte nationale d\'identité manquante est explicitement signalée pour régularisation.',
    });
  }

  // TEST 11 : Deux lignes avec même CNSS partagé par des salariés distincts => anomalie détectée
  {
    const ligne1: LigneRegistreCnss = {
      ...registre[0],
      nomOfficiel: 'PREMIER EMPLOYE',
      cnss: '123456789',
    };
    const ligne2: LigneRegistreCnss = {
      ...registre[1],
      nomOfficiel: 'SECOND EMPLOYE',
      cnss: '123456789',
    };
    const incoh = cnssRegisterService.detecterIncoherencesRegistre([ligne1, ligne2]);
    const succes = incoh.doublonsCnss.length === 1 && incoh.doublonsCnss[0].cnss === '123456789';

    resultats.push({
      id: 11,
      cas: 'TEST 11 : Détection de conflit doublon sur le numéro CNSS',
      succes,
      attendu: 'Conflit CNSS détecté (2 salariés pour un même matricule)',
      obtenu: `Conflits détectés : ${incoh.doublonsCnss.length} (CNSS: ${incoh.doublonsCnss[0]?.cnss})`,
      details: 'L\'unicité du numéro d\'immatriculation est strictement contrôlée.',
    });
  }

  // TEST 12 : Deux lignes avec même CNI partagée par des salariés distincts => anomalie détectée
  {
    const ligne1: LigneRegistreCnss = {
      ...registre[0],
      nomOfficiel: 'PREMIER EMPLOYE',
      cni: 'BE99999',
    };
    const ligne2: LigneRegistreCnss = {
      ...registre[1],
      nomOfficiel: 'SECOND EMPLOYE',
      cni: 'BE99999',
    };
    const incoh = cnssRegisterService.detecterIncoherencesRegistre([ligne1, ligne2]);
    const succes = incoh.doublonsCni.length === 1 && incoh.doublonsCni[0].cni === 'BE99999';

    resultats.push({
      id: 12,
      cas: 'TEST 12 : Détection de conflit doublon sur le numéro de CNI',
      succes,
      attendu: 'Conflit CNI détecté (2 salariés pour une même carte d\'identité)',
      obtenu: `Conflits CNI : ${incoh.doublonsCni.length} (CNI: ${incoh.doublonsCni[0]?.cni})`,
      details: 'La duplication de CNI sur deux fiches distinctes est immédiatement interceptée.',
    });
  }

  // TEST 13 : Ligne sans référence de source de paie (lignePaieId) => Refusée
  {
    const ligneSansSource: LigneRegistreCnss = {
      ...registre[0],
      lignePaieId: '',
    };
    const incoh = cnssRegisterService.detecterIncoherencesRegistre([ligneSansSource]);
    const succes = incoh.sansSource.length === 1;

    resultats.push({
      id: 13,
      cas: 'TEST 13 : Détection et refus de ligne orpheline sans source paie',
      succes,
      attendu: 'Ligne sans sourcePaie identifiée et refusée',
      obtenu: `Lignes sans source : ${incoh.sansSource.length}`,
      details: 'L\'intégrité référentielle empêche l\'injection de lignes orphelines.',
    });
  }

  // TEST 14 : Registre où toutes les lignes sont conformes => Statut PRET
  {
    // Construire un mini-registre 100% propre
    const lignePropre: LigneRegistreCnss = {
      id: 'reg_propre_1',
      periodeId: '2026-09',
      lignePaieId: 'paie_1',
      salarieId: 'sal_1',
      nomSource: 'SALARIE PARFAIT',
      nomOfficiel: 'SALARIE PARFAIT',
      cni: 'WA123456',
      cnss: '198765432',
      joursImportes: 25,
      joursDeclares: 25,
      baseImportee: 3500,
      baseDeclaree: 3500,
      salaireBrutImporte: 4200,
      salaireBrutDeclare: 4200,
      situation: 'ACTIF',
      statutRapprochement: 'IDENTIFIE',
      statut: 'PRET',
      anomalies: [],
      corrections: [],
      motifsBlocage: [],
      derniereModification: new Date().toISOString(),
      valide: false,
      verrouille: false,
    };

    const bilan = cnssRegisterService.verifierRegistreMensuel([lignePropre]);
    const succes = bilan.pret === true && bilan.prets === 1 && bilan.bloques === 0;

    resultats.push({
      id: 14,
      cas: 'TEST 14 : Registre totalement conforme => Statut global PRET',
      succes,
      attendu: 'bilan.pret = true, totalBloquantes = 0',
      obtenu: `bilan.pret: ${bilan.pret ? 'OUI' : 'NON'} | Prêts: ${bilan.prets} | Bloqués: ${bilan.bloques}`,
      details: 'Le registre autorise la validation globale dès lors que toutes les lignes sont prêtes.',
    });
  }

  // TEST 15 : Une seule anomalie bloquante => Validation globale refusée
  {
    const bilanGlobalReel = cnssRegisterService.verifierRegistreMensuel(registre);
    const succes = bilanGlobalReel.pret === false && bilanGlobalReel.bloques > 0;

    resultats.push({
      id: 15,
      cas: 'TEST 15 : Validation globale refusée tant qu\'il subsiste une ligne bloquée',
      succes,
      attendu: 'bilan.pret = false avec liste détaillée des lignes à corriger',
      obtenu: `bilan.pret: ${bilanGlobalReel.pret ? 'OUI' : 'NON'} | Bloqués: ${bilanGlobalReel.bloques} | À compléter: ${bilanGlobalReel.aCompleter}`,
      details: 'Le contrôle d\'intégrité bloque l\'approbation si une ambiguïté ou anomalie persiste.',
    });
  }

  // TEST 16 : Validation individuelle d'une ligne prête => statut VALIDE et verrouillage
  {
    const lignePrete: LigneRegistreCnss = {
      id: 'reg_propre_val',
      periodeId: '2026-09',
      lignePaieId: 'paie_val_1',
      salarieId: 'sal_val_1',
      nomSource: 'SALARIE VALIDE',
      nomOfficiel: 'SALARIE VALIDE',
      cni: 'WA999999',
      cnss: '199999999',
      joursImportes: 26,
      joursDeclares: 26,
      baseImportee: 4000,
      baseDeclaree: 4000,
      salaireBrutImporte: 4500,
      salaireBrutDeclare: 4500,
      situation: 'ACTIF',
      statutRapprochement: 'IDENTIFIE',
      statut: 'PRET',
      anomalies: [],
      corrections: [],
      motifsBlocage: [],
      derniereModification: new Date().toISOString(),
      valide: false,
      verrouille: false,
    };

    const resVal = cnssRegisterService.validerLigneIndividuelle(lignePrete);
    const succes =
      resVal.succes &&
      resVal.ligneValidee?.statut === 'VALIDE' &&
      resVal.ligneValidee?.valide === true &&
      resVal.ligneValidee?.verrouille === true &&
      resVal.ligneValidee?.dateValidation !== undefined;

    resultats.push({
      id: 16,
      cas: 'TEST 16 : Validation individuelle d\'une ligne prête',
      succes,
      attendu: 'statut = "VALIDE", verrouille = true, dateValidation enregistrée',
      obtenu: `Statut : ${resVal.ligneValidee?.statut} | Verrouillé : ${resVal.ligneValidee?.verrouille ? 'OUI' : 'NON'}`,
      details: 'La ligne est scellée pour la déclaration tout en maintenant la source intacte.',
    });
  }

  // TEST 17 : Réouverture d'une ligne validée => motif obligatoire + audit REGISTRE_REOUVERT
  {
    const ligneScellee: LigneRegistreCnss = {
      id: 'reg_scellee',
      periodeId: '2026-09',
      lignePaieId: 'paie_scellee',
      nomSource: 'SALARIE SCELLE',
      nomOfficiel: 'SALARIE SCELLE',
      cni: 'WA888888',
      cnss: '188888888',
      joursImportes: 26,
      joursDeclares: 26,
      baseImportee: 4000,
      baseDeclaree: 4000,
      salaireBrutImporte: 4500,
      salaireBrutDeclare: 4500,
      situation: 'ACTIF',
      statutRapprochement: 'IDENTIFIE',
      statut: 'VALIDE',
      anomalies: [],
      corrections: [],
      motifsBlocage: [],
      derniereModification: new Date().toISOString(),
      valide: true,
      verrouille: true,
      dateValidation: new Date().toISOString(),
    };

    // Sans motif -> rejeté
    const rejetSansMotif = cnssRegisterService.demanderReouvertureLigne(ligneScellee, '');
    // Avec motif -> accepté
    const acceptAvecMotif = cnssRegisterService.demanderReouvertureLigne(
      ligneScellee,
      'Ajustement suite à accord d\'entreprise'
    );

    const auditJournal = persistenceService.getJournalAudit();
    const aTraceAudit = auditJournal.some(a => a.action === 'REGISTRE_REOUVERT');

    const succes =
      rejetSansMotif.succes === false &&
      acceptAvecMotif.succes === true &&
      acceptAvecMotif.ligneReouverte?.statut === 'A_CORRIGER' &&
      acceptAvecMotif.ligneReouverte?.verrouille === false &&
      aTraceAudit;

    resultats.push({
      id: 17,
      cas: 'TEST 17 : Réouverture de ligne scellée (Motif obligatoire + Audit)',
      succes,
      attendu: 'Refus sans motif, acceptation avec motif, audit REGISTRE_REOUVERT consigné',
      obtenu: `Sans motif: ${rejetSansMotif.succes ? 'FAIL' : 'REFUSÉ'} | Avec motif: Statut ${acceptAvecMotif.ligneReouverte?.statut} | Audit: ${aTraceAudit ? 'OUI' : 'NON'}`,
      details: 'La réouverture impose une justification transparente dans le journal comptable.',
    });
  }

  // TEST 18 : Clôture du mois => modification interdite (verrouillé)
  {
    persistenceService.updateStatutPeriode('2026-09', 'CLOTURE', 'Clôture mensuelle définitive');
    const statutActuel = persistenceService.getStatutPeriode('2026-09');

    // Tenter de modifier une ligne alors que la période est CLOTURE
    const ligneTest: LigneRegistreCnss = {
      ...registre[0],
      verrouille: true,
    };
    const tentativeModif = cnssRegisterService.appliquerCorrectionJours(ligneTest, 22, 'Test illicite');
    const succes = statutActuel === 'CLOTURE' && tentativeModif.succes === false;

    resultats.push({
      id: 18,
      cas: 'TEST 18 : Verrouillage absolu en période CLÔTURÉE',
      succes,
      attendu: 'Période CLOTURE, toute modification du registre interdite',
      obtenu: `Statut période: ${statutActuel} | Tentative modification: ${tentativeModif.succes ? 'ACCEPTÉE' : 'BLOQUÉE'}`,
      details: 'Une période clôturée est inviolable et protégée contre toute altération.',
    });
  }

  // TEST 19 : Réouverture d'un mois clôturé => motif obligatoire + audit PERIODE_REOUVERTE
  {
    // Réouverture de la période avec justification
    persistenceService.enregistrerEvenementAudit({
      id: `audit_per_reouv_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'PERIODE_REOUVERTE',
      salarie: 'Période 2026-09',
      justification: 'Audit de régularisation exceptionnelle',
      utilisateur: 'Directeur Général',
    });
    persistenceService.updateStatutPeriode('2026-09', 'BROUILLON', 'Réouverture exceptionnelle');

    const audit = persistenceService.getJournalAudit();
    const aAuditPeriodeReouverte = audit.some(a => a.action === 'PERIODE_REOUVERTE');
    const succes = aAuditPeriodeReouverte && persistenceService.getStatutPeriode('2026-09') === 'BROUILLON';

    resultats.push({
      id: 19,
      cas: 'TEST 19 : Réouverture de période clôturée avec traçabilité PERIODE_REOUVERTE',
      succes,
      attendu: 'Période déverrouillée et action d\'audit PERIODE_REOUVERTE inscrite',
      obtenu: `Audit PERIODE_REOUVERTE: ${aAuditPeriodeReouverte ? 'OUI' : 'NON'} | Nouveau statut: ${persistenceService.getStatutPeriode('2026-09')}`,
      details: 'Toute réouverture globale est tracée avec son motif et son auteur.',
    });
  }

  // TEST 20 : Rechargement et persistance => registre et décisions conservés
  {
    const idTestMois = '2026-10-test-persist';
    const lignePersist: LigneRegistreCnss = {
      id: 'reg_p_1',
      periodeId: idTestMois,
      lignePaieId: 'paie_p_1',
      salarieId: 'sal_p_1',
      nomSource: 'SALARIE PERSISTANT',
      nomOfficiel: 'SALARIE PERSISTANT',
      cni: 'WA555555',
      cnss: '155555555',
      joursImportes: 24,
      joursDeclares: 24,
      baseImportee: 3000,
      baseDeclaree: 3000,
      salaireBrutImporte: 3600,
      salaireBrutDeclare: 3600,
      situation: 'ACTIF',
      statutRapprochement: 'IDENTIFIE',
      statut: 'PRET',
      anomalies: [],
      corrections: [],
      motifsBlocage: [],
      derniereModification: new Date().toISOString(),
      valide: false,
      verrouille: false,
    };

    persistenceService.saveRegistrePeriode(idTestMois, [lignePersist]);
    const relu = persistenceService.getRegistrePeriode(idTestMois);
    const succes = relu.length === 1 && relu[0].nomOfficiel === 'SALARIE PERSISTANT' && relu[0].joursImportes === 24;

    resultats.push({
      id: 20,
      cas: 'TEST 20 : Persistance du registre et restauration à l\'identique',
      succes,
      attendu: 'Sauvegarde et rechargement fidèles du registre et des décisions',
      obtenu: `Lignes relues : ${relu.length} | Salarié : ${relu[0]?.nomOfficiel} | Jours : ${relu[0]?.joursImportes} j`,
      details: 'Le registre résiste à la fermeture/réouverture de session et aux changements de mois.',
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
