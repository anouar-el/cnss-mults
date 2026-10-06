/**
 * Service de Spécification, Mapping et Contrôle d'Éligibilité Export CNSS / Damancom - PROMPT 07-A
 *
 * ATTENTION - RÈGLE STRICTE PROMPT 07-A :
 * Ce service NE produit PAS de fichier final et N'ENVOIE rien à Damancom.
 * Il formalise l'analyse technique, le mapping déterministe et les contrôles préalables d'éligibilité.
 */

import {
  DefinitionChampExport,
  RegleErreurExport,
  BilanEligibiliteExport,
  SpecificationExportVersionnee,
  CodeSituationCnss,
  CodeErreurExport,
} from '../types/cnssExportSpec';
import { LigneRegistreCnss, StatutPeriode } from '../types/cnss';

export class CnssExportSpecService {
  /**
   * Version courante de la spécification de mapping
   */
  readonly SPEC_VERSION = '2026.1-PROMPT07A';

  /**
   * Spécification des champs du Bordereau de Déclaration des Salaires (BDS) CNSS Maroc
   * Basée sur les sources officielles CNSS et guides utilisateurs Damancom EDI / BDS
   */
  readonly SPEC_BDS_EDI: SpecificationExportVersionnee = {
    version: '1.0-CNSS-BDS',
    dateMiseAJour: '2026-10-04',
    formatCible: 'EDI_TXT_BDS_260',
    extensionFichier: '.txt',
    conventionNommage: 'DS_[numAffiliation]_[YYYYMM].txt',
    encodage: 'ASCII / Windows-1256 ou ISO-8859-1 (sans accents)',
    separateurLigne: 'LF (ASCII 10) ou CRLF',
    longueurEnregistrement: 260,
    champs: [
      {
        position: 1,
        champOfficiel: 'Numéro d\'immatriculation CNSS',
        type: 'TEXTE',
        obligatoire: true,
        formatAttendu: '9 caractères numériques sans espace ni séparateur',
        longueurFixe: 9,
        sourceRegistreMultS: 'LigneRegistreCnss.cnss',
        transformationRequise: 'Suppression des espaces et zéros initiaux superflus, validation stricte 9 chiffres',
        regleValidation: 'Format regex ^[0-9]{9}$ - Ne jamais convertir en nombre JS ni notation scientifique',
        statutCertitude: 'CONFIRME',
        remarques: 'Obligatoire pour figurer sur le BDS mensuel. Les entrants sans immatriculation relèvent du formulaire BDSE Réf. 512-1-10.',
      },
      {
        position: 2,
        champOfficiel: 'Numéro de Carte Nationale d\'Identité (CNI)',
        type: 'TEXTE',
        obligatoire: true,
        formatAttendu: '1 à 2 lettres majuscules suivies de 1 à 6 chiffres',
        longueurMax: 10,
        sourceRegistreMultS: 'LigneRegistreCnss.cni',
        transformationRequise: 'Mise en majuscules, suppression des tirets et espaces',
        regleValidation: 'Format regex ^[A-Z]{1,2}[0-9]{1,6}$',
        statutCertitude: 'CONFIRME',
        remarques: 'Identifiant légal obligatoire de l\'employé pour rapprochement à la CNSS.',
      },
      {
        position: 3,
        champOfficiel: 'Nom et Prénom officiels',
        type: 'TEXTE',
        obligatoire: true,
        formatAttendu: 'Lettres majuscules sans caractères accentués (ASCII standard)',
        longueurMax: 40,
        sourceRegistreMultS: 'LigneRegistreCnss.nomOfficiel',
        transformationRequise: 'Utiliser EXCLUSIVEMENT le nom officiel validé, supprimer accents et ponctuations spéciales',
        regleValidation: 'Non vide, chaîne alphabétique standard',
        statutCertitude: 'CONFIRME',
        remarques: 'Ne jamais utiliser le nom source brut si un nom officiel a été validé ou corrigé dans le registre.',
      },
      {
        position: 4,
        champOfficiel: 'Nombre de jours travaillés',
        type: 'NUMERIQUE',
        obligatoire: true,
        formatAttendu: 'Entier positif compris entre 0 et 26',
        longueurMax: 2,
        sourceRegistreMultS: 'LigneRegistreCnss.joursDeclares',
        transformationRequise: 'Utiliser STRICTEMENT joursDeclares (valeur arbitrée). Ne JAMAIS exporter joursImportes en cas de correction.',
        regleValidation: 'Valeur entière comprise entre 0 et 26. Jours négatifs ou > 26 formellement interdits.',
        statutCertitude: 'CONFIRME',
        remarques: 'Plafonnement légal obligatoire à 26 jours ouvrables par mois selon le Code de la Sécurité Sociale marocain.',
      },
      {
        position: 5,
        champOfficiel: 'Salaire brut perçu',
        type: 'DECIMAL',
        obligatoire: true,
        formatAttendu: 'Montant en dirhams avec 2 décimales sans séparateur de milliers',
        longueurMax: 12,
        sourceRegistreMultS: 'LigneRegistreCnss.salaireBrutDeclare',
        transformationRequise: 'Arrondi standard à 2 décimales. Séparateur décimal point ou sans virgule selon EDI.',
        regleValidation: 'Montant >= 0. Format décimal strict.',
        statutCertitude: 'CONFIRME',
        remarques: 'Base déclarée pour les cotisations déplafonnées (AMO, Taxe formation professionnelle).',
      },
      {
        position: 6,
        champOfficiel: 'Salaire brut plafonné CNSS (Base cotisable)',
        type: 'DECIMAL',
        obligatoire: true,
        formatAttendu: 'Montant plafonné à 6 000,00 MAD',
        longueurMax: 10,
        sourceRegistreMultS: 'LigneRegistreCnss.baseDeclaree',
        transformationRequise: 'Plafonnement légal à 6 000 MAD (min(salaireBrutDeclare, 6000))',
        regleValidation: 'Montant entre 0,00 et 6 000,00 MAD',
        statutCertitude: 'CONFIRME',
        remarques: 'Plafond légal CNSS en vigueur pour les prestations à court et long terme.',
      },
      {
        position: 7,
        champOfficiel: 'Code de Situation du salarié',
        type: 'TEXTE',
        obligatoire: false,
        formatAttendu: 'Code standard à 2 lettres (SO, CO, MS, AT, MP, ML, MT, DE) ou vide',
        longueurMax: 2,
        sourceRegistreMultS: 'LigneRegistreCnss.situation',
        transformationRequise: 'Mapping vers les codes officiels CNSS (SORTI -> SO, ACTIF -> "")',
        regleValidation: 'Valeur parmi les codes autorisés : SO, CO, MS, AT, MP, ML, MT, DE ou chaîne vide',
        statutCertitude: 'CONFIRME',
        remarques: 'Permet de justifier les jours à zéro ou les mouvements du personnel (Sortie, Accident de travail, Maladie).',
      },
      {
        position: 8,
        champOfficiel: 'Période déclarée',
        type: 'DATE',
        obligatoire: true,
        formatAttendu: 'Format YYYYMM (ex: 202610) ou MMYYYY selon déclinaison',
        longueurFixe: 6,
        sourceRegistreMultS: 'LigneRegistreCnss.periodeId',
        transformationRequise: 'Extraction an-mois depuis periodeId (ex: "2026-10" -> "202610")',
        regleValidation: 'Format regex ^20[0-9]{2}(0[1-9]|1[0-2])$',
        statutCertitude: 'CONFIRME',
        remarques: 'Identifie le mois d\'exigibilité des cotisations sociales.',
      },
    ],
  };

  /**
   * Matrice complète des règles d'erreurs et de blocage d'export (Section 21)
   */
  readonly MATRICE_ERREURS: RegleErreurExport[] = [
    {
      code: 'CNSS_MANQUANT',
      intitule: 'Numéro d\'immatriculation CNSS absent ou incomplet',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Renseigner le matricule à 9 chiffres dans la base ou basculer en formulaire Entrants Réf. 512',
    },
    {
      code: 'CNI_MANQUANTE',
      intitule: 'Numéro de CNI absent ou incomplet',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Renseigner le numéro de carte d\'identité nationale du salarié',
    },
    {
      code: 'SALARIE_NON_IDENTIFIE',
      intitule: 'Ligne de paie non rattachée à un profil référentiel',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Rapprocher manuellement le salarié ou confirmer une création de fiche dans l\'onglet Rapprochements',
    },
    {
      code: 'CORRESPONDANCE_AMBIGUE',
      intitule: 'Homonymie ou multiplicité de candidats non arbitrée',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Effectuer l\'arbitrage humain Face-à-Face pour sélectionner le candidat légitime',
    },
    {
      code: 'SALARIE_BLOQUE',
      intitule: 'Ligne du registre en statut BLOQUÉ',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Résoudre les motifs de blocage listés dans la fiche du registre',
    },
    {
      code: 'SALARIE_A_COMPLETER',
      intitule: 'Ligne du registre en statut À COMPLÉTER',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Compléter les identifiants manquants (CNI ou CNSS)',
    },
    {
      code: 'SALARIE_A_CORRIGER',
      intitule: 'Ligne réouverte ou en attente d\'une décision de correction',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Appliquer la correction requise et valider à nouveau la ligne',
    },
    {
      code: 'SORTI_NON_ARBITRE',
      intitule: 'Salarié archivé SORTI ayant des jours travaillés ce mois-ci',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Confirmer la réactivation du salarié ou corriger la ligne de paie',
    },
    {
      code: 'JOURS_INVALIDES',
      intitule: 'Jours déclarés non conformes (< 0 ou > 26)',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Appliquer un plafonnement légal à 26 jours ou neutraliser les jours négatifs avec justification',
    },
    {
      code: 'MONTANT_INVALIDE',
      intitule: 'Montant de salaire déclaré négatif ou non défini',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Vérifier la ligne de calcul de salaire importée',
    },
    {
      code: 'DOUBLON_CNSS',
      intitule: 'Même numéro d\'immatriculation CNSS partagé par plusieurs salariés',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Corriger l\'immatriculation erronée dans le référentiel',
    },
    {
      code: 'DOUBLON_CNI',
      intitule: 'Même numéro de CNI partagé par plusieurs salariés',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Vérifier et corriger la carte d\'identité dans le référentiel',
    },
    {
      code: 'PERIODE_NON_VALIDEE',
      intitule: 'La période mensuelle n\'est pas encore validée ou prête',
      gravite: 'BLOQUANTE',
      bloqueExport: true,
      actionCorrective: 'Valider l\'ensemble du registre CNSS avant de déclencher l\'export',
    },
  ];

  /**
   * Traduit la situation interne MULT.S vers les codes officiels CNSS (Section 15)
   */
  traduireCodeSituation(situationInterne: string): CodeSituationCnss {
    const s = (situationInterne || '').trim().toUpperCase();
    switch (s) {
      case 'SORTI':
      case 'SORTIE':
      case 'SO':
        return 'SO';
      case 'CONGE_SANS_SOLDE':
      case 'CO':
        return 'CO';
      case 'MAINTENU_SANS_SALAIRE':
      case 'MS':
        return 'MS';
      case 'ACCIDENT_TRAVAIL':
      case 'AT':
        return 'AT';
      case 'MALADIE_PROFESSIONNELLE':
      case 'MP':
        return 'MP';
      case 'MALADIE':
      case 'ML':
        return 'ML';
      case 'MATERNITE':
      case 'MT':
        return 'MT';
      case 'DECES':
      case 'DECEDE':
      case 'DE':
        return 'DE';
      case 'ACTIF':
      case 'NOUVEAU':
      default:
        return '';
    }
  }

  /**
   * Vérifie formellement l'éligibilité d'un registre pour l'export CNSS / Damancom (Section 20)
   * Cette méthode est STRICTEMENT en lecture seule : elle n'altère aucune donnée source ni aucun registre.
   */
  verifierEligibiliteExport(
    periodeId: string,
    statutPeriode: StatutPeriode,
    lignesRegistre: LigneRegistreCnss[]
  ): BilanEligibiliteExport {
    const maintenant = new Date().toISOString();
    const erreursBloquantes: Array<{ code: CodeErreurExport; salarie: string; message: string }> = [];
    const avertissements: Array<{ code: CodeErreurExport; salarie: string; message: string }> = [];

    // 1. Vérification du statut de la période
    if (statutPeriode === 'BROUILLON' || statutPeriode === 'A_VERIFIER') {
      erreursBloquantes.push({
        code: 'PERIODE_NON_VALIDEE',
        salarie: `Période ${periodeId}`,
        message: `La période est en statut "${statutPeriode}". La validation préalable de l'ensemble du registre est obligatoire.`,
      });
    }

    if (lignesRegistre.length === 0) {
      erreursBloquantes.push({
        code: 'PERIODE_INVALIDE',
        salarie: `Période ${periodeId}`,
        message: 'Le registre CNSS est vide. Aucun salarié importé.',
      });
    }

    // 2. Détection des doublons d'identifiants
    const cnssMap = new Map<string, string[]>();
    const cniMap = new Map<string, string[]>();

    lignesRegistre.forEach(l => {
      if (l.cnss && l.cnss !== 'MANQUANT') {
        const arr = cnssMap.get(l.cnss) || [];
        arr.push(l.nomOfficiel);
        cnssMap.set(l.cnss, arr);
      }
      if (l.cni && l.cni !== 'MANQUANT') {
        const arr = cniMap.get(l.cni) || [];
        arr.push(l.nomOfficiel);
        cniMap.set(l.cni, arr);
      }
    });

    cnssMap.forEach((salaries, cnss) => {
      if (salaries.length > 1) {
        erreursBloquantes.push({
          code: 'DOUBLON_CNSS',
          salarie: salaries.join(' & '),
          message: `Conflit N° CNSS "${cnss}" dupliqué sur ${salaries.length} salariés distincts.`,
        });
      }
    });

    cniMap.forEach((salaries, cni) => {
      if (salaries.length > 1) {
        erreursBloquantes.push({
          code: 'DOUBLON_CNI',
          salarie: salaries.join(' & '),
          message: `Conflit N° CNI "${cni}" dupliqué sur ${salaries.length} salariés distincts.`,
        });
      }
    });

    // 3. Inspection individuelle de chaque ligne du registre
    let lignesEligibles = 0;
    let lignesBloquantes = 0;

    lignesRegistre.forEach(ligne => {
      let ligneBloquee = false;

      // A. Statut du registre
      if (ligne.statut === 'BLOQUE') {
        erreursBloquantes.push({
          code: 'SALARIE_BLOQUE',
          salarie: ligne.nomOfficiel,
          message: `Ligne bloquée : ${ligne.motifsBlocage.join(' ; ')}`,
        });
        ligneBloquee = true;
      } else if (ligne.statut === 'A_COMPLETER') {
        erreursBloquantes.push({
          code: 'SALARIE_A_COMPLETER',
          salarie: ligne.nomOfficiel,
          message: `Informations obligatoires manquantes (${ligne.motifsBlocage.join(', ')})`,
        });
        ligneBloquee = true;
      } else if (ligne.statut === 'A_CORRIGER') {
        erreursBloquantes.push({
          code: 'SALARIE_A_CORRIGER',
          salarie: ligne.nomOfficiel,
          message: `Ligne en attente de correction (${ligne.justificationReouverture || 'Réouverture demandée'})`,
        });
        ligneBloquee = true;
      }

      // B. Identification
      if (!ligne.salarieId || ligne.statutRapprochement === 'NON_IDENTIFIE') {
        erreursBloquantes.push({
          code: 'SALARIE_NON_IDENTIFIE',
          salarie: ligne.nomOfficiel,
          message: 'Salarié non identifié dans la base référentielle CNSS',
        });
        ligneBloquee = true;
      }

      if (ligne.statutRapprochement === 'AMBIGU') {
        erreursBloquantes.push({
          code: 'CORRESPONDANCE_AMBIGUE',
          salarie: ligne.nomOfficiel,
          message: 'Correspondance ambiguë non arbitrée par un gestionnaire',
        });
        ligneBloquee = true;
      }

      // C. Numéro CNSS
      if (!ligne.cnss || ligne.cnss === 'MANQUANT') {
        erreursBloquantes.push({
          code: 'CNSS_MANQUANT',
          salarie: ligne.nomOfficiel,
          message: 'Numéro d\'immatriculation CNSS obligatoire manquant pour le format BDS',
        });
        ligneBloquee = true;
      } else if (!/^[0-9]{9}$/.test(ligne.cnss)) {
        avertissements.push({
          code: 'CNSS_MANQUANT',
          salarie: ligne.nomOfficiel,
          message: `Format CNSS atypique : "${ligne.cnss}" (9 chiffres attendus)`,
        });
      }

      // D. Numéro CNI
      if (!ligne.cni || ligne.cni === 'MANQUANT') {
        erreursBloquantes.push({
          code: 'CNI_MANQUANTE',
          salarie: ligne.nomOfficiel,
          message: 'Numéro de CNI obligatoire manquant',
        });
        ligneBloquee = true;
      }

      // E. Jours déclarés (Règle fondamentale : joursDeclares est seul utilisé)
      if (ligne.joursDeclares < 0 || ligne.joursDeclares > 26 || isNaN(ligne.joursDeclares)) {
        erreursBloquantes.push({
          code: 'JOURS_INVALIDES',
          salarie: ligne.nomOfficiel,
          message: `Jours déclarés non autorisés (${ligne.joursDeclares} j). Doit être compris entre 0 et 26.`,
        });
        ligneBloquee = true;
      }

      // F. Salariés à zéro jour : avertissement avec justification
      if (ligne.joursDeclares === 0 && !ligne.situation) {
        avertissements.push({
          code: 'JOURS_INVALIDES',
          salarie: ligne.nomOfficiel,
          message: 'Salarié à 0 jour sans code de situation (SO, CO, ML...) renseigné',
        });
      }

      if (ligneBloquee) {
        lignesBloquantes++;
      } else {
        lignesEligibles++;
      }
    });

    const estEligible = erreursBloquantes.length === 0 && lignesRegistre.length > 0;

    return {
      estEligible,
      periodeId,
      formatVise: 'EDI_TXT_BDS_260',
      totalLignes: lignesRegistre.length,
      lignesEligibles,
      lignesBloquantes,
      erreursBloquantes,
      avertissements,
      dateControle: maintenant,
    };
  }
}

export const cnssExportSpecService = new CnssExportSpecService();
