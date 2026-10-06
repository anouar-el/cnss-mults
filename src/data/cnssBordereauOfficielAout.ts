/**
 * Données Officielles Extraites du Bordereau de Déclaration des Salariés CNSS
 * Société : STE MULT.S (N° Affilié : 6541835, Agence : SIDI BELYOUT)
 * Émis le : 27/08/2026 | Référence structurée : 654183526080179
 * Période : Mois 08 / 2026 (Base de référence officielle pour les déclarations ultérieures)
 *
 * Contient :
 * - Formulaire F.212-2-58 (Salariés ordinaires) : 53 salariés (Pages 1/5 à 5/5) dont 10 sortis (SO)
 * - Formulaire F.212-2-59 (Salariés entrants)   : 13 salariés (Pages 1/2 à 2/2) avec CNI
 * TOTAL : 66 Salariés
 */

import { SalarieReferentiel } from '../types/cnss';
import { normaliserNom, normaliserCni, normaliserCnss, extraireTokensTries } from '../services/normalizer';

export interface SalarieBordereauOfficielItem {
  numeroImmatriculation: string;
  nomPrenom: string;
  cni?: string;
  nombreJours: number;
  situation?: 'ACTIF' | 'SO' | 'AT';
  typeFormulaire: 'F.212-2-58' | 'F.212-2-59'; // F.212-2-58 = Ordinaires, F.212-2-59 = Entrants
  page: number;
  totalPage: number;
}

// =============================================================================
// 1. SALARIÉS ORDINAIRES — FORMULAIRE F.212-2-58 (Pages 1 à 5) : 53 salariés
// =============================================================================
export const BORDEREAU_ORDINAIRES_F212_2_58: SalarieBordereauOfficielItem[] = [
  // Page 1 / 5
  { numeroImmatriculation: '101455267', nomPrenom: 'YOUSSEF RAZAKI', cni: 'WA347908', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '105318057', nomPrenom: 'ASSIA KOUTOUBI', cni: 'WA234651', nombreJours: 23, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '105660180', nomPrenom: 'YASSINE DAHOUNI', cni: 'BK257018', nombreJours: 21, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '110790458', nomPrenom: 'SAAD IMRAN', cni: 'WA337745', nombreJours: 21, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '118948425', nomPrenom: 'AZIZ EL MOUTARAJI', cni: 'WA228508', nombreJours: 23, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '124017305', nomPrenom: 'KARIM GHALI', cni: 'M550690', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '132168924', nomPrenom: 'ACHRAF ZAGOURI', cni: 'WA301743', nombreJours: 13, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '133250160', nomPrenom: 'AHMED KAWCHY', cni: 'WA329958', nombreJours: 0, situation: 'SO', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '133289464', nomPrenom: 'YOUSSEF EL BAKKOURI', cni: 'RC53587', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '133416162', nomPrenom: 'YASSINE MOKRIM', cni: 'WA360448', nombreJours: 0, situation: 'SO', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '135231302', nomPrenom: 'ABDERRAHMANE MOUSSAID', cni: 'WA265935', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },
  { numeroImmatriculation: '137493752', nomPrenom: 'MOAEZ ELATLLATI', cni: 'RC55427', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 1, totalPage: 5 },

  // Page 2 / 5
  { numeroImmatriculation: '137514455', nomPrenom: 'LAMYAE EL HLLAFI', cni: 'WA315043', nombreJours: 20, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '137586052', nomPrenom: 'YOUSSEF GHAFFOUR', cni: 'WA306471', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '137913956', nomPrenom: 'HANANE HAIL', cni: 'WA312809', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '139442036', nomPrenom: 'MAROUANE MOUKRIM', cni: 'WA276247', nombreJours: 0, situation: 'SO', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '142934654', nomPrenom: 'ABDELLATIF CHARAF', cni: 'WA330962', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '151159613', nomPrenom: 'KHALID BEN ISSAOUIA', cni: 'BK655717', nombreJours: 5, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '151263056', nomPrenom: 'MOHAMED HABATI', cni: 'BW69345', nombreJours: 20, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '151708596', nomPrenom: 'BOUABID EL BACHRI', cni: 'Q235705', nombreJours: 18, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '166868145', nomPrenom: 'AMINE ABID', cni: 'WA306036', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '169024757', nomPrenom: 'MOHAMED BADRANE', cni: 'WA356772', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '170989312', nomPrenom: 'ACHRAF ABIDY', cni: 'WA299259', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },
  { numeroImmatriculation: '172104144', nomPrenom: 'ABDELAZIZ MAAZOUF', cni: 'WA294257', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 2, totalPage: 5 },

  // Page 3 / 5
  { numeroImmatriculation: '172105146', nomPrenom: 'OUSSAMA MOUKRIM', cni: 'WA312105', nombreJours: 0, situation: 'SO', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '173753619', nomPrenom: 'YOUSSEF RAFIQ', cni: 'WA295543', nombreJours: 0, situation: 'SO', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '174527128', nomPrenom: 'OTHMANE LOTFI', cni: 'HH122077', nombreJours: 23, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '176616446', nomPrenom: 'MUSTAPHA MOUNTASSIB', cni: 'WA240112', nombreJours: 0, situation: 'SO', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '177584359', nomPrenom: 'AYOUB ELWARIDI', cni: 'WA346550', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '178454242', nomPrenom: 'NOUREDDINE KADMIRI', cni: 'WA325109', nombreJours: 23, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '178601942', nomPrenom: 'YASSINE CHALOUH', cni: 'WA304532', nombreJours: 15, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '179461200', nomPrenom: 'ABDALLAH EL HAMRI', cni: 'BH355016', nombreJours: 21, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '179502056', nomPrenom: 'MOHAMED EL MIR', cni: 'WA338889', nombreJours: 20, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '179502551', nomPrenom: 'HICHAM JAMALEDDINE', cni: 'WA351170', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '181725172', nomPrenom: 'NADIA MADDENI', cni: 'WA152458', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },
  { numeroImmatriculation: '183817047', nomPrenom: 'YOUSSEF MOUNTASSIB', cni: 'WA261328', nombreJours: 0, situation: 'SO', typeFormulaire: 'F.212-2-58', page: 3, totalPage: 5 },

  // Page 4 / 5
  { numeroImmatriculation: '186040649', nomPrenom: 'YASSINE EL MYR', cni: 'WA304142', nombreJours: 0, situation: 'SO', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '188026348', nomPrenom: 'AHMED EL WARDI', cni: 'WA198565', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '188031541', nomPrenom: 'GHIZLANE BENLAIDI', cni: 'WA217348', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '188178553', nomPrenom: 'ACHRAF OUZZAHRA', cni: 'WA335382', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '188376046', nomPrenom: 'MERYEM ENAKHLI', cni: 'WA319802', nombreJours: 0, situation: 'SO', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '189537746', nomPrenom: 'MOHAMED SAIHINE', cni: 'P336981', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '194157153', nomPrenom: 'MOHAMED CHAABI', cni: 'WA314373', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '194533721', nomPrenom: 'HAMZA EDDRBALI', cni: 'WA269145', nombreJours: 22, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '194537159', nomPrenom: 'ABDELKABIR MOUKRIM', cni: 'WA345449', nombreJours: 23, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '194719218', nomPrenom: 'KHADIJA ELBAIDI', cni: 'WA290581', nombreJours: 20, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '934519717', nomPrenom: 'HICHAM BADRANE', cni: 'WA173466', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },
  { numeroImmatriculation: '934693614', nomPrenom: 'TAOUFIK EL ALAMI', cni: 'WA189515', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 4, totalPage: 5 },

  // Page 5 / 5
  { numeroImmatriculation: '947763733', nomPrenom: 'SALAH CHINA', cni: 'WA324650', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 5, totalPage: 5 },
  { numeroImmatriculation: '950067732', nomPrenom: 'MOHAMED EL MANIANI', cni: 'AE30882', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 5, totalPage: 5 },
  { numeroImmatriculation: '964451428', nomPrenom: 'DRIS EL FAZNI', cni: 'PB245158', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 5, totalPage: 5 },
  { numeroImmatriculation: '966041128', nomPrenom: 'AMINE BAHHA', cni: 'PA178046', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-58', page: 5, totalPage: 5 },
  { numeroImmatriculation: '996523809', nomPrenom: 'NOUR MOTAHIR', cni: 'WA312421', nombreJours: 0, situation: 'SO', typeFormulaire: 'F.212-2-58', page: 5, totalPage: 5 },
];

// =============================================================================
// 2. SALARIÉS ENTRANTS — FORMULAIRE F.212-2-59 (Pages 6 et 7) : 13 salariés
// =============================================================================
export const BORDEREAU_ENTRANTS_F212_2_59: SalarieBordereauOfficielItem[] = [
  // Page 1 / 2 (Page 6 du document)
  { numeroImmatriculation: '108918289', nomPrenom: 'ABDELKADER ALLAKI', cni: 'TA95783', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },
  { numeroImmatriculation: '127324866', nomPrenom: 'MOHAMED', cni: 'WA362167', nombreJours: 23, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },
  { numeroImmatriculation: '146228966', nomPrenom: 'ABDELLAH ELGUEZAM', cni: 'WA294819', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },
  { numeroImmatriculation: '146231468', nomPrenom: 'MOHAMED SAMIR', cni: 'SJ39284', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },
  { numeroImmatriculation: '146235365', nomPrenom: 'KARIM EL HAJJAJY', cni: 'ZT375350', nombreJours: 23, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },
  { numeroImmatriculation: '146815264', nomPrenom: 'ABDELLAH ZANGA', cni: 'WA345440', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },
  { numeroImmatriculation: '146824364', nomPrenom: 'HAMZA ELHARRANI', cni: 'WA346319', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },
  { numeroImmatriculation: '146826166', nomPrenom: 'YOUSSEF HAROUACH', cni: 'WA362591', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },
  { numeroImmatriculation: '146827168', nomPrenom: 'OUSSAMA ELAOUCHY', cni: 'N527537', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },
  { numeroImmatriculation: '146827764', nomPrenom: 'MAROINE ZELLAL', cni: 'WA336867', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },
  { numeroImmatriculation: '165382256', nomPrenom: 'REDA BOUMEDIANE', cni: 'BW52550', nombreJours: 25, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 1, totalPage: 2 },

  // Page 2 / 2 (Page 7 du document)
  { numeroImmatriculation: '171247359', nomPrenom: 'SOUFYANE EZ ZARBOUH', cni: 'BW50734', nombreJours: 24, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 2, totalPage: 2 },
  { numeroImmatriculation: '993390118', nomPrenom: 'REDOUANE EDR BALI', cni: 'WA296270', nombreJours: 26, situation: 'ACTIF', typeFormulaire: 'F.212-2-59', page: 2, totalPage: 2 },
];

// Fusion ordonnée des 66 salariés du bordereau officiel
export const TOUS_LES_SALARIES_BORDEREAU_OFFICIEL: SalarieBordereauOfficielItem[] = [
  ...BORDEREAU_ORDINAIRES_F212_2_58,
  ...BORDEREAU_ENTRANTS_F212_2_59,
];

/**
 * Génère le référentiel typé de salariés pour la base de l'application
 */
export function chargerBaseSalariesDepuisBordereauOfficiel(): SalarieReferentiel[] {
  return TOUS_LES_SALARIES_BORDEREAU_OFFICIEL.map((item, index) => {
    const nomComplet = item.nomPrenom.trim();
    const situation = item.situation === 'SO' ? 'SORTI' : item.situation === 'AT' ? 'ACCIDENT_TRAVAIL' : 'ACTIF';
    const cniNormalisee = item.cni ? normaliserCni(item.cni) : undefined;
    const cnssNormalisee = normaliserCnss(item.numeroImmatriculation);

    return {
      id: `sal_bds_${index + 1}`,
      immatriculationCnss: cnssNormalisee,
      cnss: cnssNormalisee,
      cni: cniNormalisee,
      nomComplet,
      nom: nomComplet,
      prenom: '',
      nomNormalise: normaliserNom(nomComplet),
      tokensNom: extraireTokensTries(nomComplet),
      situation,
      situationOriginale: item.situation,
      derniereDeclaration: '2026-08',
      aliases: [],
      actif: situation === 'ACTIF',
    };
  });
}
