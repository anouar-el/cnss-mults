/**
 * Banc de Tests Automatisés pour PROMPT 09
 * Validation du Dossier CNSS Mensuel Final MULT.S :
 * - Contrôle global et vérification des 14 exigences obligatoires
 * - Contrôle tripartite (Registre vs Déclaration vs Paiement)
 * - Validation formelle, clôture et archivage
 * - Réouverture encadrée avec motif justificatif
 * - Versionnage de l'historique et conservation des empreintes
 * - Immuabilité stricte des sources de données.
 */

import { cnssDossierService } from '../services/cnssDossierService';
import { cnssBordereauService } from '../services/cnssBordereauService';
import { cnssPaiementService } from '../services/cnssPaiementService';
import { LigneRegistreCnss, AnomalieLigne } from '../types/cnss';
import { EntrepriseCnssConfig } from '../types/cnssBordereau';
import { persistenceService } from '../services/persistenceService';

export interface ResultatTest09 {
  id: string;
  cas: string;
  attendu: string;
  obtenu: string;
  succes: boolean;
  details?: string;
}

export interface BilanPrompt09 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTest09[];
}

const CONFIG_TEST: EntrepriseCnssConfig = {
  raisonSociale: 'STE MULT.S',
  numeroAffiliation: '6541835',
  agence: 'SIDI BELYOUT',
  adresse: '77 RUE MOHAMED SMIHA ETG 10 N 57',
  ville: 'CASABLANCA',
  codeFormulaireOrdinaires: 'F.212-2-58',
  codeFormulaireEntrants: 'F.212-2-59',
  lignesParPage: 12,
};

function creerLigneRegistreValide(overrides: Partial<LigneRegistreCnss> = {}): LigneRegistreCnss {
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

export function executerTestsPrompt09(): BilanPrompt09 {
  const resultats: ResultatTest09[] = [];

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
  // TEST 01 : Dossier vide -> BROUILLON
  // -------------------------------------------------------------------------
  {
    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: [],
      bordereauDeclaration: null,
      bordereauPaiement: null,
      config: CONFIG_TEST,
    });

    assertTest(
      'TEST_09_01',
      'Dossier vide -> statut BROUILLON',
      d.statut === 'BROUILLON' && d.resume.totalSalaries === 0,
      'statut === BROUILLON',
      `statut = ${d.statut}`,
      'Un mois vierge sans registre initialisé reste au statut BROUILLON'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 02 : Registre non validé -> blocage
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreValide({ id: 'r1', valide: true, statut: 'VALIDE' }),
      creerLigneRegistreValide({ id: 'r2', valide: false, statut: 'A_CORRIGER' }),
    ];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_TEST, '2026-09').document;
    const declValide = decl ? cnssBordereauService.validerBordereau(decl) : null;
    const paye = decl ? cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_TEST, '2026-09').document : null;
    const payeValide = paye ? cnssPaiementService.validerBordereauPaiement(paye) : null;

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: reg,
      bordereauDeclaration: declValide,
      bordereauPaiement: payeValide,
      config: CONFIG_TEST,
    });

    assertTest(
      'TEST_09_02',
      'Registre avec ligne non validée -> statut A_CONTROLER et blocage',
      d.statut === 'A_CONTROLER' && d.motifsBlocageValidation.some(m => m.includes('non validée')),
      'Blocage avec motif explicite sur le registre',
      `statut = ${d.statut}, blocages = ${d.motifsBlocageValidation.length}`,
      'Tout salarié non validé dans le registre empêche la validation du dossier'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 03 : Bordereau salariés non validé -> blocage
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreValide({ id: 'r1' })];
    // Bordereau généré mais non formellement validé (statut BROUILLON)
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_TEST, '2026-09').document;
    const paye = decl ? cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_TEST, '2026-09').document : null;
    const payeValide = paye ? cnssPaiementService.validerBordereauPaiement(paye) : null;

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: reg,
      bordereauDeclaration: decl, // Brouillon !
      bordereauPaiement: payeValide,
      config: CONFIG_TEST,
    });

    assertTest(
      'TEST_09_03',
      'Bordereau salariés non validé -> blocage',
      d.statut === 'A_CONTROLER' && d.motifsBlocageValidation.some(m => m.includes('déclaration des salariés')),
      'Blocage sur validation préalable du bordereau 07-B',
      `statut = ${d.statut}`,
      'La validation du bordereau salariés est un prérequis strict'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 04 : Bordereau paiement non validé -> blocage
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreValide({ id: 'r1' })];
    const decl = cnssBordereauService.validerBordereau(
      cnssBordereauService.genererBordereau(reg, CONFIG_TEST, '2026-09').document!
    );
    // Bordereau de paiement calculé mais non validé (brouillon)
    const payeBrouillon = cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_TEST, '2026-09').document;

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: reg,
      bordereauDeclaration: decl,
      bordereauPaiement: payeBrouillon,
      config: CONFIG_TEST,
    });

    assertTest(
      'TEST_09_04',
      'Bordereau paiement non validé -> blocage',
      d.statut === 'A_CONTROLER' && d.motifsBlocageValidation.some(m => m.includes('paiement des cotisations')),
      'Blocage sur validation préalable du bordereau 08',
      `statut = ${d.statut}`,
      'Le paiement doit être validé formellement avant le dossier global'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 05 : Anomalie bloquante ouverte -> blocage
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreValide({ id: 'r1' })];
    const decl = cnssBordereauService.validerBordereau(
      cnssBordereauService.genererBordereau(reg, CONFIG_TEST, '2026-09').document!
    );
    const paye = cnssPaiementService.validerBordereauPaiement(
      cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_TEST, '2026-09').document!
    );

    const anomalieBloquante: AnomalieLigne = {
      id: 'anom_1',
      salarieConcerne: 'Test Bloquant',
      lignePaieId: 'p1',
      code: 'CNSS_MANQUANTE',
      valeurOriginale: '',
      message: 'Immatriculation CNSS introuvable',
      gravite: 'BLOQUANTE',
      estResolue: false,
    };

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: reg,
      bordereauDeclaration: decl,
      bordereauPaiement: paye,
      anomalies: [anomalieBloquante],
      config: CONFIG_TEST,
    });

    assertTest(
      'TEST_09_05',
      'Anomalie bloquante non résolue -> blocage',
      d.statut === 'A_CONTROLER' && d.motifsBlocageValidation.some(m => m.includes('anomalie(s) bloquante(s)')),
      'Blocage du dossier si anomalie bloquante ouverte',
      `statut = ${d.statut}`,
      'Toute anomalie bloquante ouverte interdit la clôture'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 06 : Salarié ambigu -> blocage
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreValide({ id: 'r1', statutRapprochement: 'AMBIGU' }),
    ];
    const decl = cnssBordereauService.validerBordereau(
      cnssBordereauService.genererBordereau(reg, CONFIG_TEST, '2026-09').document!
    );
    const paye = cnssPaiementService.validerBordereauPaiement(
      cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_TEST, '2026-09').document!
    );

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: reg,
      bordereauDeclaration: decl,
      bordereauPaiement: paye,
      config: CONFIG_TEST,
    });

    assertTest(
      'TEST_09_06',
      'Salarié en ambiguïté homonyme -> blocage',
      d.statut === 'A_CONTROLER' && d.motifsBlocageValidation.some(m => m.includes('homonymie ou ambiguïté')),
      'Blocage pour ambiguïté non arbitrée',
      `statut = ${d.statut}`,
      'Tous les cas suspects d’homonymie doivent avoir été arbitrés'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 07 : Salarié non identifié -> blocage
  // -------------------------------------------------------------------------
  {
    const reg = [
      creerLigneRegistreValide({ id: 'r1', statutRapprochement: 'NON_IDENTIFIE', salarieId: '' }),
    ];
    const decl = cnssBordereauService.genererBordereau(reg, CONFIG_TEST, '2026-09').document;
    const paye = decl ? cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_TEST, '2026-09').document : null;

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: reg,
      bordereauDeclaration: decl,
      bordereauPaiement: paye,
      config: CONFIG_TEST,
    });

    assertTest(
      'TEST_09_07',
      'Salarié non identifié -> blocage',
      d.statut === 'A_CONTROLER' && d.motifsBlocageValidation.some(m => m.includes('non identifiés')),
      'Blocage pour salarié orphelin',
      `statut = ${d.statut}`,
      'Aucun salarié orphelin ne peut être déclaré sans décision formelle'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 08 : Contrôle tripartite incohérent -> blocage
  // -------------------------------------------------------------------------
  {
    // Simulation d'une divergence : Déclaration générée sur 1 salarié mais registre compte 2 salariés
    const reg1 = [creerLigneRegistreValide({ id: 'r1' })];
    const decl1 = cnssBordereauService.validerBordereau(
      cnssBordereauService.genererBordereau(reg1, CONFIG_TEST, '2026-09').document!
    );
    const paye1 = cnssPaiementService.validerBordereauPaiement(
      cnssPaiementService.calculerBordereauPaiement(reg1, decl1, CONFIG_TEST, '2026-09').document!
    );

    const reg2 = [...reg1, creerLigneRegistreValide({ id: 'r2', cnss: '109999999' })];

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: reg2, // 2 salariés
      bordereauDeclaration: decl1, // 1 salarié
      bordereauPaiement: paye1, // 1 salarié
      config: CONFIG_TEST,
    });

    assertTest(
      'TEST_09_08',
      'Contrôle tripartite avec divergence d’effectif -> blocage',
      d.controleTripartite.estConforme === false && d.statut === 'A_CONTROLER',
      'Contrôle tripartite non conforme et dossier A_CONTROLER',
      `estConforme = ${d.controleTripartite.estConforme}, bloquants = ${d.controleTripartite.totalBloquants}`,
      'La divergence entre Registre et Bordereaux bloque immédiatement'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 09 : Tout validé et conforme -> PRET_A_VALIDER
  // -------------------------------------------------------------------------
  let dossierPretTest: any = null;
  {
    const reg = [
      creerLigneRegistreValide({ id: 'r1', salaireBrutDeclare: 4500, joursDeclares: 26, cnss: '101455267' }),
      creerLigneRegistreValide({ id: 'r2', salaireBrutDeclare: 6500, joursDeclares: 24, cnss: '105318057' }),
    ];
    const decl = cnssBordereauService.validerBordereau(
      cnssBordereauService.genererBordereau(reg, CONFIG_TEST, '2026-09').document!
    );
    const paye = cnssPaiementService.validerBordereauPaiement(
      cnssPaiementService.calculerBordereauPaiement(reg, decl, CONFIG_TEST, '2026-09').document!
    );

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: reg,
      bordereauDeclaration: decl,
      bordereauPaiement: paye,
      anomalies: [],
      config: CONFIG_TEST,
    });
    dossierPretTest = d;

    assertTest(
      'TEST_09_09',
      'Toutes conditions satisfaites -> statut PRET_A_VALIDER',
      d.statut === 'PRET_A_VALIDER' && d.motifsBlocageValidation.length === 0 && d.controleTripartite.estConforme,
      'statut === PRET_A_VALIDER',
      `statut = ${d.statut}, blocages = ${d.motifsBlocageValidation.length}`,
      'Le dossier devient éligible à la signature et clôture'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 10 : Validation humaine formelle -> VALIDE
  // -------------------------------------------------------------------------
  let dossierValideTest: any = null;
  {
    const dValide = cnssDossierService.validerDossierMensuel(dossierPretTest, 'M. Bennani (DRH)');
    dossierValideTest = dValide;

    assertTest(
      'TEST_09_10',
      'Validation humaine formelle -> statut VALIDE',
      dValide.statut === 'VALIDE' && dValide.validePar === 'M. Bennani (DRH)' && Boolean(dValide.dateValidation),
      'statut === VALIDE avec signataire consigné',
      `statut = ${dValide.statut}, validePar = ${dValide.validePar}`,
      'Le dossier passe au statut VALIDÉ avec traçabilité du signataire'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 11 : Validation crée audit
  // -------------------------------------------------------------------------
  {
    const journal = persistenceService.getJournalAudit();
    const evtValidation = journal.find(e => e.typeAction === 'VALIDATION_FINALE');

    assertTest(
      'TEST_09_11',
      'Validation crée un enregistrement d’audit traçable',
      Boolean(evtValidation && evtValidation.auteur === 'M. Bennani (DRH)' && evtValidation.moisId === '2026-09'),
      'Événement VALIDATION_FINALE enregistré dans le journal d’audit',
      `trouve = ${Boolean(evtValidation)}`,
      'La signature est tracée dans l’audit de conformité'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 12 : Validation crée une empreinte hash scellée
  // -------------------------------------------------------------------------
  {
    assertTest(
      'TEST_09_12',
      'Validation génère une empreinte scellée',
      Boolean(dossierValideTest.dossierHash && dossierValideTest.dossierHash.startsWith('sha256_')),
      'Empreinte sha256_... présente',
      `hash = ${dossierValideTest.dossierHash}`,
      'Empreinte cryptographique horodatée'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 13 : Hash déterministe (reproductibilité stricte)
  // -------------------------------------------------------------------------
  {
    const h1 = cnssDossierService.calculerHash('CNSS_MULTS_2026-09_DETERMINISTIC_TEST');
    const h2 = cnssDossierService.calculerHash('CNSS_MULTS_2026-09_DETERMINISTIC_TEST');
    const hDiff = cnssDossierService.calculerHash('CNSS_MULTS_2026-09_DETERMINISTIC_TEST_OTHER');

    assertTest(
      'TEST_09_13',
      'Hash déterministe reproductible à données identiques',
      h1 === h2 && h1 !== hDiff,
      'h1 === h2 && h1 !== hDiff',
      `h1 = ${h1.slice(0, 16)}..., h2 = ${h2.slice(0, 16)}...`,
      'Garantit que deux dossiers identiques produisent exactement la même empreinte'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 14 : Clôture -> CLOTURE
  // -------------------------------------------------------------------------
  let dossierClotureTest: any = null;
  {
    const dCloture = cnssDossierService.cloturerPeriodeDossier(dossierValideTest, 'Directeur Financier');
    dossierClotureTest = dCloture;

    assertTest(
      'TEST_09_14',
      'Clôture définitive du dossier -> statut CLOTURE',
      dCloture.statut === 'CLOTURE' && dCloture.cloturePar === 'Directeur Financier' && Boolean(dCloture.dateCloture),
      'statut === CLOTURE',
      `statut = ${dCloture.statut}, cloturePar = ${dCloture.cloturePar}`,
      'La période est officiellement close'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 15 : Dossier clôturé non modifiable directement sans réouverture
  // -------------------------------------------------------------------------
  {
    let erreurValidationSurCloture = false;
    try {
      cnssDossierService.validerDossierMensuel(dossierClotureTest, 'Tentative Modif');
    } catch (e) {
      erreurValidationSurCloture = true;
    }

    assertTest(
      'TEST_09_15',
      'Dossier clôturé non modifiable directement',
      erreurValidationSurCloture,
      'Exception levée si tentative de modification sur dossier clos',
      `erreurValidation = ${erreurValidationSurCloture}`,
      'Sécurité anti-modification accidentelle'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 16 : Réouverture sans motif ou trop court -> refus
  // -------------------------------------------------------------------------
  {
    let refuseCourt = false;
    let refuseVide = false;
    try {
      cnssDossierService.reouvrirDossierMensuel(dossierClotureTest, 'abc'); // < 5 chars
    } catch (e) {
      refuseCourt = true;
    }
    try {
      cnssDossierService.reouvrirDossierMensuel(dossierClotureTest, '');
    } catch (e) {
      refuseVide = true;
    }

    assertTest(
      'TEST_09_16',
      'Réouverture sans motif (ou < 5 caractères) -> refus strict',
      refuseCourt && refuseVide,
      'Exception levée si motif < 5 caractères',
      `refuseCourt = ${refuseCourt}, refuseVide = ${refuseVide}`,
      'Un motif formel est obligatoire pour réouvrir'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 17 : Réouverture avec motif valide -> autorisée (statut BROUILLON)
  // -------------------------------------------------------------------------
  let dossierReouvertTest: any = null;
  {
    const dReouvert = cnssDossierService.reouvrirDossierMensuel(
      dossierClotureTest,
      'Régularisation a posteriori d’une prime conventionnelle accordée',
      'Superviseur RH'
    );
    dossierReouvertTest = dReouvert;

    assertTest(
      'TEST_09_17',
      'Réouverture autorisée avec motif valide -> repasse en BROUILLON',
      dReouvert.statut === 'BROUILLON' && Boolean(dReouvert.justificationReouverture?.includes('Régularisation')),
      'statut === BROUILLON',
      `statut = ${dReouvert.statut}, motif = ${dReouvert.justificationReouverture}`,
      'Permet la modification contrôlée des données'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 18 : Réouverture crée un audit
  // -------------------------------------------------------------------------
  {
    const journal = persistenceService.getJournalAudit();
    const evtReouverture = journal.find(e => e.typeAction === 'REOUVERTURE_PERIODE');

    assertTest(
      'TEST_09_18',
      'Réouverture consignée dans l’audit de conformité',
      Boolean(evtReouverture && evtReouverture.moisId === '2026-09'),
      'Événement REOUVERTURE_PERIODE consigné dans l’audit',
      `trouve = ${Boolean(evtReouverture)}`,
      'Traçabilité intégrale de la réouverture'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 19 : Nouvelle version après réouverture (v1 -> v2)
  // -------------------------------------------------------------------------
  {
    assertTest(
      'TEST_09_19',
      'Nouvelle version incrémentée après réouverture (v1 -> v2)',
      dossierReouvertTest.versionCourante === 2 && dossierReouvertTest.id.includes('v2'),
      'versionCourante === 2',
      `version = ${dossierReouvertTest.versionCourante}, id = ${dossierReouvertTest.id}`,
      'Versionnage strict des états successifs du dossier'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 20 : Ancienne version conservée dans l’historique des versions
  // -------------------------------------------------------------------------
  {
    const historique = dossierReouvertTest.versionsHistorique;
    const v1 = historique.find((v: any) => v.numeroVersion === 1);

    assertTest(
      'TEST_09_20',
      'Ancienne version v1 intégralement conservée dans l’historique',
      Boolean(v1 && v1.statut === 'CLOTURE' && v1.motifReouverture?.includes('Régularisation')),
      'Version 1 présente dans versionsHistorique',
      `nbVersions = ${historique.length}, v1Status = ${v1?.statut}`,
      'Aucun écrasement silencieux des clôtures antérieures'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 21 : Donnée obligatoire nouvel entrant (CNI) manquante -> blocage
  // -------------------------------------------------------------------------
  {
    const regAvecEntrantSansCni = [
      creerLigneRegistreValide({ id: 'r1' }),
      creerLigneRegistreValide({ id: 'r2', situation: 'ENTRANT', cni: '' }), // Pas de CNI !
    ];
    const decl = cnssBordereauService.genererBordereau(regAvecEntrantSansCni, CONFIG_TEST, '2026-09').document;
    const paye = decl ? cnssPaiementService.calculerBordereauPaiement(regAvecEntrantSansCni, decl, CONFIG_TEST, '2026-09').document : null;

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: regAvecEntrantSansCni,
      bordereauDeclaration: decl,
      bordereauPaiement: paye,
      config: CONFIG_TEST,
    });

    assertTest(
      'TEST_09_21',
      'Entrant sans CNI obligatoire -> blocage du dossier',
      d.motifsBlocageValidation.some(m => m.includes('sans CNI') || m.includes('numéro de CNI')),
      'Blocage pour CNI manquante sur entrant',
      `motifs = ${d.motifsBlocageValidation.join(' | ')}`,
      'Exigence légale formulaire F.212-2-59'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 22 : Doublon CNSS bloquant -> blocage
  // -------------------------------------------------------------------------
  {
    const regDoublon = [
      creerLigneRegistreValide({ id: 'r1', nomOfficiel: 'BENJELLOUN SAMIR', cnss: '109999999' }),
      creerLigneRegistreValide({ id: 'r2', nomOfficiel: 'FASSI HAMID', cnss: '109999999' }), // Même CNSS, noms différents !
    ];
    const decl = cnssBordereauService.genererBordereau(regDoublon, CONFIG_TEST, '2026-09').document;
    const paye = decl ? cnssPaiementService.calculerBordereauPaiement(regDoublon, decl, CONFIG_TEST, '2026-09').document : null;

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: regDoublon,
      bordereauDeclaration: decl,
      bordereauPaiement: paye,
      config: CONFIG_TEST,
    });

    assertTest(
      'TEST_09_22',
      'Doublon CNSS distinct détecté -> blocage du dossier',
      d.motifsBlocageValidation.some(m => m.includes('attribué à plusieurs personnes')),
      'Blocage pour conflit d’immatriculation CNSS',
      `motifs = ${d.motifsBlocageValidation.join(' | ')}`,
      'Interdiction absolue de déclarer deux salariés distincts sous le même N° CNSS'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 23 : Numéro d’affiliation CNSS absent ou invalide -> blocage
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreValide({ id: 'r1' })];
    const configSansAff = { ...CONFIG_TEST, numeroAffiliation: '' };

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: reg,
      bordereauDeclaration: null,
      bordereauPaiement: null,
      config: configSansAff,
    });

    assertTest(
      'TEST_09_23',
      'Numéro d’affiliation CNSS absent -> blocage immédiat',
      d.motifsBlocageValidation.some(m => m.includes('affiliation CNSS manquant')),
      'Blocage si absence de N° affilié',
      `motifs = ${d.motifsBlocageValidation.join(' | ')}`,
      'Le numéro d’affilié CNSS 6541835 est obligatoire'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 24 : Agence CNSS obligatoire absente -> blocage
  // -------------------------------------------------------------------------
  {
    const reg = [creerLigneRegistreValide({ id: 'r1' })];
    const configSansAgence = { ...CONFIG_TEST, agence: '' };

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: reg,
      bordereauDeclaration: null,
      bordereauPaiement: null,
      config: configSansAgence,
    });

    assertTest(
      'TEST_09_24',
      'Agence CNSS absente -> blocage immédiat',
      d.motifsBlocageValidation.some(m => m.includes('Agence CNSS obligatoire')),
      'Blocage si absence d’agence CNSS',
      `motifs = ${d.motifsBlocageValidation.join(' | ')}`,
      'L’agence SIDI BELYOUT est obligatoire'
    );
  }

  // -------------------------------------------------------------------------
  // TEST 25 : Export CSV administratif complet & Immuabilité
  // -------------------------------------------------------------------------
  {
    const regOriginal = [creerLigneRegistreValide({ id: 'r1', salaireBrutDeclare: 5000, joursDeclares: 26 })];
    const decl = cnssBordereauService.validerBordereau(
      cnssBordereauService.genererBordereau(regOriginal, CONFIG_TEST, '2026-09').document!
    );
    const paye = cnssPaiementService.validerBordereauPaiement(
      cnssPaiementService.calculerBordereauPaiement(regOriginal, decl, CONFIG_TEST, '2026-09').document!
    );

    const d = cnssDossierService.agregerDossierMensuel({
      periodeId: '2026-09',
      lignesRegistre: regOriginal,
      bordereauDeclaration: decl,
      bordereauPaiement: paye,
      config: CONFIG_TEST,
    });

    const csv = cnssDossierService.exporterDossierCsv(d);

    const immuable =
      regOriginal[0].salaireBrutDeclare === 5000 &&
      regOriginal[0].joursDeclares === 26 &&
      csv.includes('CNSS MULT.S — DOSSIER CNSS MENSUEL') &&
      csv.includes('CONTRÔLE CROISÉ TRIPARTITE');

    assertTest(
      'TEST_09_25',
      'Export CSV administratif complet et non-altération du registre (immuabilité)',
      immuable,
      'CSV généré et registre inchangé',
      `tailleCsv = ${csv.length} car., brutInchange = ${regOriginal[0].salaireBrutDeclare === 5000}`,
      'Le dossier mensuel ne modifie jamais les données du registre'
    );
  }

  const reussis = resultats.filter(r => r.succes).length;
  const echoues = resultats.filter(r => !r.succes).length;

  return {
    total: resultats.length,
    reussis,
    echoues,
    resultats,
  };
}
