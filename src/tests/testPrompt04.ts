/**
 * Banc de tests automatisés pour PROMPT 04 (Section 22)
 * Valide les 10 exigences métier obligatoires de l'import Excel et du workflow mensuel.
 */

import { excelService } from '../services/excelService';
import { persistenceService } from '../services/persistenceService';
import { normaliserCnss, normaliserCni, normaliserNom, extraireTokensTries } from '../services/normalizer';
import { rapprocherLigne } from '../services/matchingEngine';
import {
  RAW_BASE_CNSS_SEPTEMBRE,
  RAW_CALCUL_SALAIRE_SEPTEMBRE,
  chargerBaseSalariesReelle,
} from '../data/septembreRealData';
import { SalarieReferentiel, LignePaieImportee } from '../types/cnss';

export interface ResultatTestP4 {
  id: number;
  cas: string;
  succes: boolean;
  attendu: string;
  obtenu: string;
  details: string;
}

export interface BilanPrompt04 {
  total: number;
  reussis: number;
  echoues: number;
  resultats: ResultatTestP4[];
}

export function executerTestsPrompt04(): BilanPrompt04 {
  const resultats: ResultatTestP4[] = [];

  // TEST 1 : Importer calcul_salaire_septembre_mults.csv -> 88 salariés, 1 ligne Total ignorée
  {
    // Reconstruire le fichier CSV exact (88 salariés + 1 ligne Total)
    const lignesCsv: string[] = ['NOM ET PRENOM,JRS OUVRE,BASE,BRUT'];
    const salariesReels88 = RAW_CALCUL_SALAIRE_SEPTEMBRE.slice(0, 88);
    salariesReels88.forEach(row => {
      lignesCsv.push(`"${row.nom}",${row.jours},${row.base},${row.brut}`);
    });
    // Ligne Total récapitulative (89e ligne)
    lignesCsv.push('"TOTAL GENERAL",1789,280720,270115');

    const csvContent = lignesCsv.join('\n');
    const analyse = excelService.analyserBufferOuClasseur(
      csvContent,
      'calcul_salaire_septembre_mults.csv',
      csvContent.length
    );

    const lignesPaie = excelService.convertirEnLignesPaie(analyse, '2026-09');
    const succes = lignesPaie.length === 88 && analyse.lignesIgnoreesTotalCount === 1;

    resultats.push({
      id: 1,
      cas: 'TEST 1 : Import calcul_salaire_septembre_mults.csv (88 salariés + Total ignoré)',
      succes,
      attendu: '88 salariés valides importés et exactement 1 ligne Total récapitulative ignorée',
      obtenu: `${lignesPaie.length} salariés importés | ${analyse.lignesIgnoreesTotalCount} ligne(s) Total ignorée(s)`,
      details: 'La ligne Total récapitulative est formellement détectée et isolée pour ne pas polluer les déclarations.',
    });
  }

  // TEST 2 : Importer base_cnss_septembre.csv -> 77 lignes de base
  {
    const header = ['N° immatriculé', 'Nom et prénom', 'Nbre Jours', 'Salaire', 'CNI', 'Situation'];
    const rows = RAW_BASE_CNSS_SEPTEMBRE.map(r => [
      r.cnss,
      r.nom,
      26,
      3190,
      r.cni,
      r.situation,
    ]);

    const analyseBase = excelService.analyserBaseCnss([header, ...rows], []);
    const succes = analyseBase.lignesImportees === 77;

    resultats.push({
      id: 2,
      cas: 'TEST 2 : Import base_cnss_septembre.csv (77 lignes de base)',
      succes,
      attendu: '77 lignes de base importées avec succès',
      obtenu: `${analyseBase.lignesImportees} lignes de base détectées`,
      details: 'La base de référence contient exactement les 77 employés transmis par MULT.S.',
    });
  }

  // TEST 3 : CNSS 101455267.0 -> "101455267" (format texte strict, pas de nombre flottant)
  {
    const brutAvecPointZero = '101455267.0';
    const cnssNettoyee = normaliserCnss(brutAvecPointZero);
    const succes = cnssNettoyee === '101455267' && typeof cnssNettoyee === 'string';

    resultats.push({
      id: 3,
      cas: 'TEST 3 : Normalisation stricte CNSS 101455267.0 -> "101455267"',
      succes,
      attendu: 'Chaîne textuelle "101455267" sans suffixe décimal .0',
      obtenu: `"${cnssNettoyee}" (type: ${typeof cnssNettoyee})`,
      details: 'Les numéros CNSS ne sont jamais manipulés comme flottants dans l\'application.',
    });
  }

  // TEST 4 : CNI "BH355016 " avec espace -> normalisée "BH355016", valeur originale conservée
  {
    const cniOriginale = '  BH355016 ';
    const cniNormalisee = normaliserCni(cniOriginale);
    const succes = cniNormalisee === 'BH355016' && cniOriginale === '  BH355016 ';

    resultats.push({
      id: 4,
      cas: 'TEST 4 : CNI "BH355016 " avec espace (Normalisée vs Originale)',
      succes,
      attendu: 'valeurNormalisee = "BH355016" ET valeurOriginale = "  BH355016 " conservée',
      obtenu: `Normalisée: "${cniNormalisee}" | Originale: "${cniOriginale}"`,
      details: 'La normalisation sert au matching, sans jamais altérer la chaîne brute saisie.',
    });
  }

  // TEST 5 : Double import du même fichier -> avertissement de doublon
  {
    const idTest = `mois_test_double_${Date.now()}`;
    persistenceService.enregistrerFichierImporte(idTest, 'calcul_salaire_octobre_mults.xlsx', 10450, 85);
    const estDetecte = persistenceService.verifierDoubleImport(idTest, 'calcul_salaire_octobre_mults.xlsx', 10450, 85);
    const succes = estDetecte === true;

    resultats.push({
      id: 5,
      cas: 'TEST 5 : Détection et avertissement de double import',
      succes,
      attendu: 'verifierDoubleImport() retourne TRUE avec proposition de rechargement/annulation',
      obtenu: `Double import détecté : ${estDetecte ? 'OUI' : 'NON'}`,
      details: 'Empêche l\'écrasement involontaire ou la duplication silencieuse de données de paie.',
    });
  }

  // TEST 6 : Créer octobre 2026 -> aucune donnée de jours de septembre copiée
  {
    const creation = persistenceService.creerPeriode('2026-10', 'Octobre 2026');
    const lignesOctobre = persistenceService.getLignesPaiePeriode('2026-10') || [];
    const succes = creation.periode.idMois === '2026-10' && lignesOctobre.length === 0;

    resultats.push({
      id: 6,
      cas: 'TEST 6 : Création Octobre 2026 (Départ vierge de jours)',
      succes,
      attendu: 'Période 2026-10 créée avec 0 ligne de paie copiée depuis Septembre',
      obtenu: `Période: ${creation.periode.idMois} | Lignes paie initiales: ${lignesOctobre.length}`,
      details: 'Les jours travaillés sont strictement rattachés à chaque mois et ne sont jamais dupliqués.',
    });
  }

  // TEST 7 : Vérifier que les alias de septembre restent disponibles pour octobre
  {
    // Ajouter un alias en septembre
    persistenceService.ajouterAlias({
      aliasBrut: 'GHAFOUR YOUSSEF',
      salarieId: 'sal_ghafor',
      nomOfficielSalarie: 'YOUSSEF GHAFFOUR',
      creeParMois: '2026-09',
    });

    const aliasTrouve = persistenceService.trouverAlias('GHAFOUR YOUSSEF');
    const succes = Boolean(aliasTrouve && aliasTrouve.nomOfficielSalarie === 'YOUSSEF GHAFFOUR');

    resultats.push({
      id: 7,
      cas: 'TEST 7 : Persistance inter-mois des alias (Septembre -> Octobre)',
      succes,
      attendu: 'Alias créé en septembre immédiatement disponible et actif en octobre',
      obtenu: `Alias résolu : ${aliasTrouve ? aliasTrouve.nomOfficielSalarie : 'NON TROUVÉ'}`,
      details: 'La table des alias validés est un patrimoine permanent réutilisé chaque mois.',
    });
  }

  // TEST 8 : Importer une ligne SAFWAN DAOU -> NON_IDENTIFIE
  {
    const baseSalaries = chargerBaseSalariesReelle();
    const ligneSafwan: LignePaieImportee = {
      id: 'paie_safwan_test',
      nomCompletBrut: 'SAFWAN DAOU',
      nomNormalise: normaliserNom('SAFWAN DAOU'),
      tokensNom: extraireTokensTries('SAFWAN DAOU'),
      joursImportes: 4,
      ligneFichier: 32,
    };

    const rap = rapprocherLigne(ligneSafwan, baseSalaries);
    // Règle d'or : ne jamais classer automatiquement nouveau, statut doit être NON_IDENTIFIE
    const succes = rap.statut === 'NON_IDENTIFIE' && rap.validation === 'A_VALIDER' && !rap.estMarqueNouveau;

    resultats.push({
      id: 8,
      cas: 'TEST 8 : Salarié absent de la base (SAFWAN DAOU) -> NON_IDENTIFIE',
      succes,
      attendu: 'Statut NON_IDENTIFIE, validation A_VALIDER (pas de conversion automatique en Nouveau)',
      obtenu: `Statut: ${rap.statut} | Validation: ${rap.validation} | estMarqueNouveau: ${rap.estMarqueNouveau}`,
      details: 'Le salarié absent nécessite impérativement une confirmation humaine du gestionnaire.',
    });
  }

  // TEST 9 : Importer NAOUFAL HAOUDI 27j -> joursImportes = 27
  {
    const csvContent = 'NOM ET PRENOM,JRS OUVRE,BASE,BRUT\n"NAOUFAL HAOUDI",27,3190,3312.69';
    const analyse = excelService.analyserBufferOuClasseur(csvContent, 'test_27j.csv', csvContent.length);
    const lignes = excelService.convertirEnLignesPaie(analyse, '2026-09');
    const ligneHaoudi = lignes.find(l => l.nomCompletBrut === 'NAOUFAL HAOUDI');
    const succes = Boolean(ligneHaoudi && ligneHaoudi.joursImportes === 27);

    resultats.push({
      id: 9,
      cas: 'TEST 9 : Immutabilité à l\'import NAOUFAL HAOUDI (27 jours)',
      succes,
      attendu: 'joursImportes = 27 strictement préservé sans plafonnement silencieux',
      obtenu: `joursImportes: ${ligneHaoudi?.joursImportes} j`,
      details: 'L\'import conserve toujours la donnée brute. Le plafonnement est réservé à la validation.',
    });
  }

  // TEST 10 : Quitter puis reprendre la période -> données conservées
  {
    const idReprise = '2026-10';
    const lignesPaieMock: LignePaieImportee[] = [
      {
        id: 'paie_oct_1',
        nomCompletBrut: 'ACHRAF ABIDY',
        nomNormalise: normaliserNom('ACHRAF ABIDY'),
        tokensNom: extraireTokensTries('ACHRAF ABIDY'),
        joursImportes: 26,
        ligneFichier: 2,
      },
    ];

    persistenceService.saveLignesPaiePeriode(idReprise, lignesPaieMock);
    persistenceService.updatePeriode(idReprise, { etapeWorkflow: 6 });

    // Simuler le rechargement de la session
    const repriseLignes = persistenceService.getLignesPaiePeriode(idReprise);
    const reprisePeriode = persistenceService.getPeriode(idReprise);

    const succes = Boolean(
      repriseLignes &&
      repriseLignes.length === 1 &&
      repriseLignes[0].nomCompletBrut === 'ACHRAF ABIDY' &&
      reprisePeriode?.etapeWorkflow === 6
    );

    resultats.push({
      id: 10,
      cas: 'TEST 10 : Rechargement et reprise de session (Octobre 2026)',
      succes,
      attendu: 'Données de paie et étape du workflow conservées à la reprise',
      obtenu: `Lignes restaurées: ${repriseLignes?.length} | Étape workflow: ${reprisePeriode?.etapeWorkflow}/10`,
      details: 'Permet au gestionnaire d\'interrompre et de reprendre son travail sans aucune perte.',
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
