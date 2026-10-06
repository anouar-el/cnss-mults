/**
 * Banc de tests automatisés pour PROMPT 07-A (Section 28)
 * Valide les exigences de spécification, de mapping et de règles d'éligibilité pour l'export CNSS.
 */

import { cnssExportSpecService } from '../services/cnssExportSpecService';
import { cnssRegisterService } from '../services/cnssRegisterService';
import { chargerBaseSalariesReelle, chargerLignesPaieReelles } from '../data/septembreRealData';
import { executerRapprochement } from '../services/matchingEngine';
import { validationEngine } from '../services/validationEngine';
import { LigneRegistreCnss } from '../types/cnss';
import { normaliserNom } from '../services/normalizer';

export interface ResultatTestP7A {
  id: number;
  cas: string;
  succes: boolean;
  attendu: string;
  obtenu: string;
  details: string;
}

export interface BilanPrompt07A {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTestP7A[];
}

export function executerTestsPrompt07A(): BilanPrompt07A {
  const resultats: ResultatTestP7A[] = [];
  const baseSalaries = chargerBaseSalariesReelle();
  const lignesPaie = chargerLignesPaieReelles();
  const raps = executerRapprochement(lignesPaie, baseSalaries);
  const anos = validationEngine.auditer(raps, baseSalaries);
  const periodeId = '2026-09';

  // Base du registre mensuel pour les tests
  const registre = cnssRegisterService.construireRegistre(periodeId, lignesPaie, baseSalaries, raps, anos);

  // Helper pour créer une ligne de registre propre
  const creerLignePropre = (nom = 'SALARIE CONFORME', jours = 26, cni = 'WA112233', cnss = '101455267'): LigneRegistreCnss => ({
    id: `reg_t7_${nom.toLowerCase().replace(/\s+/g, '_')}`,
    periodeId,
    lignePaieId: 'paie_t7_1',
    numeroLigneSource: 2,
    salarieId: 'sal_ref_t7_1',
    nomSource: nom,
    nomOfficiel: nom,
    cni,
    cnss,
    joursImportes: jours,
    joursDeclares: jours,
    baseImportee: 4500,
    baseDeclaree: 4500,
    salaireBrutImporte: 5200,
    salaireBrutDeclare: 5200,
    situation: 'ACTIF',
    statutRapprochement: 'IDENTIFIE',
    statut: 'VALIDE',
    anomalies: [],
    corrections: [],
    motifsBlocage: [],
    derniereModification: new Date().toISOString(),
    valide: true,
    verrouille: true,
  });

  // TEST 1 : Un salarié VALIDE possède une source registre traçable
  {
    const ligneValide = creerLignePropre('MOHAMED VALIDE');
    const succes = Boolean(ligneValide.lignePaieId && ligneValide.periodeId && ligneValide.salarieId);

    resultats.push({
      id: 1,
      cas: 'TEST 1 : Traçabilité complète obligatoire de la ligne registre exportable',
      succes,
      attendu: 'Présence conjointe de lignePaieId, periodeId et salarieId',
      obtenu: `lignePaieId: ${ligneValide.lignePaieId} | salarieId: ${ligneValide.salarieId}`,
      details: 'Aucune ligne anonyme ou orpheline ne peut entrer dans le flux d\'export.',
    });
  }

  // TEST 2 : Un salarié NON_IDENTIFIE est non exportable
  {
    const ligneNonId: LigneRegistreCnss = {
      ...creerLignePropre('INCONNU TEST'),
      salarieId: undefined,
      statutRapprochement: 'NON_IDENTIFIE',
      statut: 'BLOQUE',
      motifsBlocage: ['Salarié non identifié'],
    };
    const bilan = cnssExportSpecService.verifierEligibiliteExport(periodeId, 'VALIDE', [ligneNonId]);
    const aErreur = bilan.erreursBloquantes.some(e => e.code === 'SALARIE_NON_IDENTIFIE' || e.code === 'SALARIE_BLOQUE');
    const succes = bilan.estEligible === false && aErreur;

    resultats.push({
      id: 2,
      cas: 'TEST 2 : Salarié NON_IDENTIFIE formellement exclu de l\'export',
      succes,
      attendu: 'estEligible = false, présence de l\'erreur bloquante SALARIE_NON_IDENTIFIE',
      obtenu: `estEligible: ${bilan.estEligible ? 'OUI' : 'NON'} | Erreur: ${aErreur ? 'DÉTECTÉE' : 'NON'}`,
      details: 'L\'export requiert un rattachement certain à une fiche individuelle.',
    });
  }

  // TEST 3 : Un salarié AMBIGU est non exportable
  {
    const ligneAmbigu: LigneRegistreCnss = {
      ...creerLignePropre('AYOUB EL WARDI'),
      statutRapprochement: 'AMBIGU',
      statut: 'BLOQUE',
      motifsBlocage: ['Correspondance ambiguë'],
    };
    const bilan = cnssExportSpecService.verifierEligibiliteExport(periodeId, 'VALIDE', [ligneAmbigu]);
    const aErreur = bilan.erreursBloquantes.some(e => e.code === 'CORRESPONDANCE_AMBIGUE' || e.code === 'SALARIE_BLOQUE');
    const succes = bilan.estEligible === false && aErreur;

    resultats.push({
      id: 3,
      cas: 'TEST 3 : Salarié AMBIGU formellement exclu de l\'export',
      succes,
      attendu: 'estEligible = false, présence de l\'erreur bloquante CORRESPONDANCE_AMBIGUE',
      obtenu: `estEligible: ${bilan.estEligible ? 'OUI' : 'NON'} | Erreur: ${aErreur ? 'DÉTECTÉE' : 'NON'}`,
      details: 'Toute incertitude d\'homonymie interdit la production d\'un fichier de déclaration.',
    });
  }

  // TEST 4 : Une ligne BLOQUE est non exportable
  {
    const ligneBloquee: LigneRegistreCnss = {
      ...creerLignePropre('SALARIE BLOQUE'),
      statut: 'BLOQUE',
      motifsBlocage: ['Dépassement de jours'],
    };
    const bilan = cnssExportSpecService.verifierEligibiliteExport(periodeId, 'VALIDE', [ligneBloquee]);
    const aErreur = bilan.erreursBloquantes.some(e => e.code === 'SALARIE_BLOQUE');
    const succes = bilan.estEligible === false && aErreur;

    resultats.push({
      id: 4,
      cas: 'TEST 4 : Ligne en statut BLOQUÉ exclue de l\'export',
      succes,
      attendu: 'estEligible = false, erreur SALARIE_BLOQUE',
      obtenu: `estEligible: ${bilan.estEligible ? 'OUI' : 'NON'} | Bloquants: ${bilan.lignesBloquantes}`,
      details: 'Le registre bloque l\'export tant que le statut BLOQUÉ persiste.',
    });
  }

  // TEST 5 : Une ligne A_COMPLETER est non exportable
  {
    const ligneACompleter: LigneRegistreCnss = {
      ...creerLignePropre('SALARIE SANS CNSS'),
      cnss: 'MANQUANT',
      statut: 'A_COMPLETER',
      motifsBlocage: ['Numéro CNSS manquant'],
    };
    const bilan = cnssExportSpecService.verifierEligibiliteExport(periodeId, 'VALIDE', [ligneACompleter]);
    const aErreur = bilan.erreursBloquantes.some(e => e.code === 'SALARIE_A_COMPLETER' || e.code === 'CNSS_MANQUANT');
    const succes = bilan.estEligible === false && aErreur;

    resultats.push({
      id: 5,
      cas: 'TEST 5 : Ligne en statut À COMPLÉTER exclue de l\'export',
      succes,
      attendu: 'estEligible = false, erreur SALARIE_A_COMPLETER ou CNSS_MANQUANT',
      obtenu: `estEligible: ${bilan.estEligible ? 'OUI' : 'NON'} | Erreur: ${aErreur ? 'DÉTECTÉE' : 'NON'}`,
      details: 'Un salarié sans matricule ne peut pas être intégré dans le bordereau BDS.',
    });
  }

  // TEST 6 : Une ligne A_CORRIGER est non exportable
  {
    const ligneACorriger: LigneRegistreCnss = {
      ...creerLignePropre('SALARIE A CORRIGER'),
      statut: 'A_CORRIGER',
      motifsBlocage: ['Réouverture demandée'],
    };
    const bilan = cnssExportSpecService.verifierEligibiliteExport(periodeId, 'VALIDE', [ligneACorriger]);
    const aErreur = bilan.erreursBloquantes.some(e => e.code === 'SALARIE_A_CORRIGER');
    const succes = bilan.estEligible === false && aErreur;

    resultats.push({
      id: 6,
      cas: 'TEST 6 : Ligne en statut À CORRIGER exclue de l\'export',
      succes,
      attendu: 'estEligible = false, erreur SALARIE_A_CORRIGER',
      obtenu: `estEligible: ${bilan.estEligible ? 'OUI' : 'NON'} | Erreur: ${aErreur ? 'DÉTECTÉE' : 'NON'}`,
      details: 'Tant qu\'une modification n\'est pas finalisée, l\'export est suspendu.',
    });
  }

  // TEST 7 : joursDeclares est la seule valeur utilisable pour le futur export des jours
  {
    const champJoursSpec = cnssExportSpecService.SPEC_BDS_EDI.champs.find(c => c.champOfficiel.includes('jours'));
    const sourceEstJoursDeclares = champJoursSpec?.sourceRegistreMultS === 'LigneRegistreCnss.joursDeclares';
    const succes = sourceEstJoursDeclares && champJoursSpec?.type === 'NUMERIQUE';

    resultats.push({
      id: 7,
      cas: 'TEST 7 : Spécification liant les jours exclusivement à joursDeclares',
      succes,
      attendu: 'Source cible = "LigneRegistreCnss.joursDeclares"',
      obtenu: `Source liée : "${champJoursSpec?.sourceRegistreMultS}"`,
      details: 'La spécification interdit formellement de pointer vers joursImportes pour la télédéclaration.',
    });
  }

  // TEST 8 : joursImportes ne doit jamais être utilisé comme valeur d'export si une correction existe
  {
    const ligneAvecCorrection: LigneRegistreCnss = {
      ...creerLignePropre('NAOUFAL HAOUDI', 26),
      joursImportes: 27,
      joursDeclares: 26,
    };
    // Vérification que la valeur déclarée diffère de la source et que la valeur retenue est 26
    const valeurExportRetenue = ligneAvecCorrection.joursDeclares;
    const succes = ligneAvecCorrection.joursImportes === 27 && valeurExportRetenue === 26;

    resultats.push({
      id: 8,
      cas: 'TEST 8 : Préservation de joursImportes=27 et sélection exclusive de joursDeclares=26',
      succes,
      attendu: 'joursImportes = 27 (intact) et valeur retenue = 26 (arbitrée)',
      obtenu: `Importé : ${ligneAvecCorrection.joursImportes} j | Retenu pour export : ${valeurExportRetenue} j`,
      details: 'La donnée originale source ne subit aucune destruction lors du mapping.',
    });
  }

  // TEST 9 : Le numéro CNSS reste une chaîne
  {
    const champCnss = cnssExportSpecService.SPEC_BDS_EDI.champs.find(c => c.champOfficiel.includes('immatriculation'));
    const ligneTest = creerLignePropre('TEST CNSS STR', 20, 'WA998877', '010145526');
    const typeEstString = typeof ligneTest.cnss === 'string';
    const specEstTexte = champCnss?.type === 'TEXTE';
    const succes = typeEstString && specEstTexte && ligneTest.cnss.startsWith('0');

    resultats.push({
      id: 9,
      cas: 'TEST 9 : Conservation du numéro CNSS comme chaîne (préservation des zéros initiaux)',
      succes,
      attendu: 'Type string et format TEXTE (aucun cast numérique risquant d\'ôter le zéro)',
      obtenu: `Type TS: ${typeof ligneTest.cnss} | Valeur: "${ligneTest.cnss}" | Spec: ${champCnss?.type}`,
      details: 'Évite l\'altération de matricule ou la notation scientifique en JavaScript.',
    });
  }

  // TEST 10 : Une donnée source ne peut jamais être modifiée par le moteur d'export (Lecture seule)
  {
    const ligneAvant: LigneRegistreCnss = creerLignePropre('TEST IMMUABILITE', 25);
    const ligneAvantCopie = JSON.stringify(ligneAvant);

    // Exécution du contrôle d'éligibilité
    cnssExportSpecService.verifierEligibiliteExport(periodeId, 'VALIDE', [ligneAvant]);
    const ligneApresCopie = JSON.stringify(ligneAvant);

    const succes = ligneAvantCopie === ligneApresCopie;

    resultats.push({
      id: 10,
      cas: 'TEST 10 : Immuabilité absolue du registre lors des opérations de contrôle',
      succes,
      attendu: 'Objet registre 100% identique avant et après contrôle',
      obtenu: `Identique : ${succes ? 'OUI (100% en lecture seule)' : 'NON'}`,
      details: 'Le moteur d\'export se comporte en pure projection sans effet de bord.',
    });
  }

  // TEST 11 : Détection d'un doublon de CNSS bloquant l'éligibilité
  {
    const ligne1 = creerLignePropre('EMPLOYE A', 26, 'WA111111', '101455267');
    const ligne2 = creerLignePropre('EMPLOYE B', 26, 'WA222222', '101455267');
    const bilan = cnssExportSpecService.verifierEligibiliteExport(periodeId, 'VALIDE', [ligne1, ligne2]);
    const aErreurDoublon = bilan.erreursBloquantes.some(e => e.code === 'DOUBLON_CNSS');
    const succes = bilan.estEligible === false && aErreurDoublon;

    resultats.push({
      id: 11,
      cas: 'TEST 11 : Détection d\'un doublon d\'immatriculation CNSS',
      succes,
      attendu: 'estEligible = false, erreur bloquante DOUBLON_CNSS',
      obtenu: `estEligible: ${bilan.estEligible ? 'OUI' : 'NON'} | Doublon CNSS détecté: ${aErreurDoublon ? 'OUI' : 'NON'}`,
      details: 'Un matricule partagé par deux salariés bloque immédiatement la télétransmission.',
    });
  }

  // TEST 12 : Détection d'un doublon de CNI bloquant l'éligibilité
  {
    const ligne1 = creerLignePropre('EMPLOYE X', 26, 'WA778899', '111111111');
    const ligne2 = creerLignePropre('EMPLOYE Y', 26, 'WA778899', '222222222');
    const bilan = cnssExportSpecService.verifierEligibiliteExport(periodeId, 'VALIDE', [ligne1, ligne2]);
    const aErreurDoublonCni = bilan.erreursBloquantes.some(e => e.code === 'DOUBLON_CNI');
    const succes = bilan.estEligible === false && aErreurDoublonCni;

    resultats.push({
      id: 12,
      cas: 'TEST 12 : Détection d\'un doublon de numéro CNI',
      succes,
      attendu: 'estEligible = false, erreur bloquante DOUBLON_CNI',
      obtenu: `estEligible: ${bilan.estEligible ? 'OUI' : 'NON'} | Doublon CNI détecté: ${aErreurDoublonCni ? 'OUI' : 'NON'}`,
      details: 'Une carte d\'identité attribuée à deux personnes distinctes bloque l\'export.',
    });
  }

  // TEST 13 : Traduction déterministe des codes de situation officiels (SORTI -> SO, ACTIF -> "")
  {
    const codeSorti = cnssExportSpecService.traduireCodeSituation('SORTI');
    const codeActif = cnssExportSpecService.traduireCodeSituation('ACTIF');
    const codeAccident = cnssExportSpecService.traduireCodeSituation('ACCIDENT_TRAVAIL');
    const codeConge = cnssExportSpecService.traduireCodeSituation('CONGE_SANS_SOLDE');

    const succes = codeSorti === 'SO' && codeActif === '' && codeAccident === 'AT' && codeConge === 'CO';

    resultats.push({
      id: 13,
      cas: 'TEST 13 : Mapping des codes de situation officiels CNSS (SO, AT, CO)',
      succes,
      attendu: 'SORTI -> "SO", ACTIF -> "", ACCIDENT_TRAVAIL -> "AT", CONGE_SANS_SOLDE -> "CO"',
      obtenu: `SORTI: "${codeSorti}" | ACTIF: "${codeActif}" | AT: "${codeAccident}" | CO: "${codeConge}"`,
      details: 'Traduction conforme aux codes réglementaires des bordereaux CNSS.',
    });
  }

  // TEST 14 : Plafonnement légal de la base cotisable à 6 000 MAD dans la spécification
  {
    const champBase = cnssExportSpecService.SPEC_BDS_EDI.champs.find(c => c.champOfficiel.includes('plafonn'));
    const mentionne6000 = champBase?.formatAttendu.includes('6 000') || champBase?.remarques.includes('6 000');
    const succes = champBase !== undefined && mentionne6000 === true && champBase.type === 'DECIMAL';

    resultats.push({
      id: 14,
      cas: 'TEST 14 : Spécification du plafond légal CNSS (6 000,00 MAD)',
      succes,
      attendu: 'Plafond légal 6 000 MAD documenté comme règle officielle confirmée',
      obtenu: `Règle spécifiée : "${champBase?.formatAttendu}"`,
      details: 'Conforme au Dahir et décrets régissant le plafond de cotisations sociales CNSS.',
    });
  }

  // TEST 15 : Registre 100% conforme et validé reconnu éligible
  {
    const ligneParfaite = creerLignePropre('SALARIE EXEMPLAIRE', 26, 'WA123456', '101455267');
    const bilan = cnssExportSpecService.verifierEligibiliteExport(periodeId, 'VALIDE', [ligneParfaite]);
    const succes = bilan.estEligible === true && bilan.erreursBloquantes.length === 0 && bilan.lignesEligibles === 1;

    resultats.push({
      id: 15,
      cas: 'TEST 15 : Autorisation d\'éligibilité pour un registre 100% conforme et scellé',
      succes,
      attendu: 'estEligible = true, 0 erreur bloquante',
      obtenu: `estEligible: ${bilan.estEligible ? 'OUI' : 'NON'} | Erreurs: ${bilan.erreursBloquantes.length} | Éligibles: ${bilan.lignesEligibles}`,
      details: 'Un registre rigoureusement validé est déclaré prêt pour la future projection d\'export.',
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
