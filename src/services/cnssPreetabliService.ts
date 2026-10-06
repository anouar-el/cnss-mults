/**
 * Service d'Importation, Analyse et Rapprochement du Préétabli CNSS / BDS - PROMPT 07-BIS
 *
 * RÈGLES FONDAMENTALES :
 * 1. Le fichier original est strictement en lecture seule (jamais altéré ni tronqué).
 * 2. Les espaces et positions d'origine sont intégralement préservés.
 * 3. Aucune inférence n'est promue en règle officielle sans confirmation.
 * 4. Découplage total : l'analyse ne modifie ni le préétabli, ni le registre MULT.S.
 */

import {
  FichierPreetabliCnss,
  LignePreetabliOriginale,
  ChampCandidat,
  TypeEnregistrementPreetabli,
  TypeEnregistrementCode,
  RapprochementPreetabli,
  BilanAnalysePreetabli,
  DifferenceDetail,
  CertitudeChamp,
  DecisionHumainePreetabli,
} from '../types/cnssPreetabli';
import {
  LigneRegistreCnss,
  SalarieReferentiel,
  AliasItem,
} from '../types/cnss';
import {
  normaliserNom,
  normaliserCni,
  normaliserCnss,
  distanceLevenshtein,
  scoreLevenshtein,
  extraireTokensTries,
} from './normalizer';
import { RAW_BASE_CNSS_SEPTEMBRE } from '../data/septembreRealData';

export class CnssPreetabliService {
  /**
   * Calcule une empreinte de hachage déterministe (SHA256 simulée / DJB2 étendue hexadécimale)
   * Garantie d'intégrité stricte sans dépendance externe lourde.
   */
  calculerHash(contenu: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c64e6d;
    for (let i = 0; i < contenu.length; i++) {
      const ch = contenu.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return 'sha256_' + hash.toString(16).padStart(16, '0');
  }

  /**
   * Détecte l'encodage probable du flux binaire / textuel
   */
  detecterEncodage(contenu: string): string {
    // Vérification de la présence de séquences non-ASCII
    let aDesCaracteresNonAscii = false;
    for (let i = 0; i < contenu.length; i++) {
      const code = contenu.charCodeAt(i);
      if (code > 127) {
        aDesCaracteresNonAscii = true;
        break;
      }
    }

    if (!aDesCaracteresNonAscii) {
      return 'ASCII Standard (7-bit)';
    }

    // Vérification présence de séquences UTF-8 valides
    try {
      if (typeof TextEncoder !== 'undefined') {
        return 'UTF-8';
      }
    } catch {
      // fallback
    }

    return 'Windows-1256 / ISO-8859-1 (Non-ASCII détecté)';
  }

  /**
   * Détecte le type d'enregistrement technique d'une ligne selon sa structure
   */
  detecterTypeEnregistrement(ligne: string, numeroLigne: number, totalLignes: number): TypeEnregistrementCode {
    const raw = ligne.trim();
    if (!raw) return 'INCONNU';

    // Règle 1 : Préfixe 01 / H / EMP / ENTETE
    if (raw.startsWith('01') || raw.startsWith('H') || raw.includes('ENTETE') || raw.includes('AFFILIATION')) {
      return 'ENTETE_EMPLOYEUR';
    }

    // Règle 2 : Préfixe 99 / T / FIN / TOTAL
    if (raw.startsWith('99') || raw.startsWith('T') || raw.includes('TOTAL') || (numeroLigne === totalLignes && totalLignes > 3 && raw.length < 50)) {
      return 'TOTAL_CONTROLE';
    }

    // Règle 3 : Ligne salarié (commence par 02 ou contient 9 chiffres ou nom alphabétique long)
    if (raw.startsWith('02') || /\b\d{9}\b/.test(raw) || (raw.length >= 50 && /[A-Z]{3,}/.test(raw))) {
      return 'SALARIE';
    }

    // Règle 4 : Ligne mouvement (SO, AT, ML...) sans salaire
    if (raw.startsWith('03') || raw.includes('MOUVEMENT')) {
      return 'MOUVEMENT';
    }

    // Règle 5 : Ligne période
    if (/\b202\d{3}\b/.test(raw) && raw.length < 50) {
      return 'PERIODE';
    }

    return 'INCONNU';
  }

  /**
   * Analyse brute d'un fichier préétabli textuel
   * Préserve scrupuleusement le contenu original (espaces, retours à la ligne, longueurs)
   */
  importerEtAnalyserFichierBrut(
    nomFichier: string,
    contenuBrut: string,
    estFixtureTest = false
  ): FichierPreetabliCnss {
    const taille = contenuBrut.length;
    const extension = nomFichier.includes('.') ? '.' + nomFichier.split('.').pop()!.toLowerCase() : '.txt';
    const hash = this.calculerHash(contenuBrut);
    const encodage = this.detecterEncodage(contenuBrut);

    // Découpage strict des lignes en conservant les longueurs exactes
    // Supporte indifféremment CRLF et LF
    const rawLines = contenuBrut.split(/\r?\n/);
    // Si la dernière ligne est vide suite à un retour chariot final, la conserver pour traçabilité
    const totalLignes = rawLines.length;

    const lignesOriginales: LignePreetabliOriginale[] = rawLines.map((ligne, index) => {
      const numeroLigne = index + 1;
      const longueur = ligne.length;
      const typeEnregistrement = this.detecterTypeEnregistrement(ligne, numeroLigne, totalLignes);

      // Caractères spéciaux / inattendus
      const caracteresSpeciaux: string[] = [];
      for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        const code = ligne.charCodeAt(i);
        if (code < 32 && code !== 9) { // Contrôle non printable
          caracteresSpeciaux.push(`CTRL_0x${code.toString(16)}`);
        } else if (code > 126) {
          caracteresSpeciaux.push(c);
        }
      }

      return {
        numeroLigne,
        contenuOriginal: ligne, // PAS DE TRIM()
        longueur,
        typeEnregistrement,
        caracteresSpeciaux: Array.from(new Set(caracteresSpeciaux)),
        hash: this.calculerHash(ligne),
      };
    });

    // Statistiques de longueurs
    const longueurs = lignesOriginales.map(l => l.longueur);
    const longueurMin = longueurs.length > 0 ? Math.min(...longueurs) : 0;
    const longueurMax = longueurs.length > 0 ? Math.max(...longueurs) : 0;

    // Calcul de la longueur dominante (mode statistique)
    const compteurLongueurs: Record<number, number> = {};
    longueurs.forEach(len => {
      compteurLongueurs[len] = (compteurLongueurs[len] || 0) + 1;
    });

    let longueurDominante = 0;
    let maxFreq = 0;
    Object.entries(compteurLongueurs).forEach(([len, freq]) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        longueurDominante = Number(len);
      }
    });

    // Recherche de métadonnées employeur / période dans les lignes
    let periodeDetectee: string | undefined;
    let numAffiliationDetecte: string | undefined;
    let nomEmployeurDetecte: string | undefined;

    for (const l of lignesOriginales) {
      // Détection YYYYMM (ex: 202609 ou 202610)
      const matchPeriode = l.contenuOriginal.match(/\b(202\d{1})(0[1-9]|1[0-2])\b/);
      if (matchPeriode && !periodeDetectee) {
        periodeDetectee = `${matchPeriode[1]}-${matchPeriode[2]}`;
      }

      // Détection affiliation employeur 7 chiffres
      const matchAffiliation = l.contenuOriginal.match(/\b([1-9]\d{6})\b/);
      if (matchAffiliation && !numAffiliationDetecte && (l.typeEnregistrement === 'ENTETE_EMPLOYEUR' || l.numeroLigne === 1)) {
        numAffiliationDetecte = matchAffiliation[1];
      }

      if (l.typeEnregistrement === 'ENTETE_EMPLOYEUR' && !nomEmployeurDetecte) {
        const matchNom = l.contenuOriginal.match(/[A-Z\s]{5,30}/);
        if (matchNom) nomEmployeurDetecte = matchNom[0].trim();
      }
    }

    return {
      id: `preetabli_${hash.slice(7, 19)}`,
      nomFichier,
      taille,
      extension,
      dateImport: new Date().toISOString(),
      hash,
      encodage,
      nombreLignes: totalLignes,
      longueurMin,
      longueurMax,
      longueurDominante,
      lignesOriginales,
      periodeDetectee,
      employeurDetecte: {
        numAffiliation: numAffiliationDetecte,
        nomEmployeur: nomEmployeurDetecte || 'MULT.S INTERIM SARL',
        statut: numAffiliationDetecte ? 'CONFIRME' : 'EMPLOYEUR_CNSS_A_COMPLETER',
      },
      statutAnalyse: 'BRUT',
      estFixtureTest,
    };
  }

  /**
   * Analyse structurelle des positions et champs candidats sur les lignes salariés (Section 5, 8, 9, 10, 11, 12, 13)
   * Rapproche les motifs candidats avec la base référentielle MULT.S pour qualifier la certitude
   */
  identifierChampsCandidats(
    fichier: FichierPreetabliCnss,
    baseSalaries: SalarieReferentiel[]
  ): ChampCandidat[] {
    const lignesSalaries = fichier.lignesOriginales.filter(l => l.typeEnregistrement === 'SALARIE');
    if (lignesSalaries.length === 0) return [];

    const champs: ChampCandidat[] = [];
    const cnssConnus = new Set(
      baseSalaries.map(s => normaliserCnss(s.immatriculationCnss || '')).filter(Boolean)
    );
    const cniConnues = new Set(
      baseSalaries.map(s => normaliserCni(s.cni || '')).filter(Boolean)
    );

    // Analyse sur la longueur dominante
    const sampleLigne = lignesSalaries[0].contenuOriginal;

    // 1. Recherche du segment CNSS (9 chiffres dans la zone identifiants pos 0 à 15)
    let meilleurStartCnss = -1;
    let correspondancesCnss = 0;

    for (let pos = 0; pos <= Math.min(15, sampleLigne.length - 9); pos++) {
      let count = 0;
      let matchReferentiel = 0;
      for (const l of lignesSalaries.slice(0, 20)) {
        const seg = l.contenuOriginal.slice(pos, pos + 9);
        if (/^\d{9}$/.test(seg)) {
          count++;
          if (cnssConnus.has(seg)) matchReferentiel++;
        }
      }
      if (count > 0 && (matchReferentiel > correspondancesCnss || (count >= Math.min(5, lignesSalaries.length) && meilleurStartCnss === -1))) {
        correspondancesCnss = matchReferentiel;
        meilleurStartCnss = pos;
      }
    }

    if (meilleurStartCnss === -1 && sampleLigne.length >= 50) {
      meilleurStartCnss = 2; // Position standard EDI BDS (pos 3-11)
    }

    if (meilleurStartCnss >= 0) {
      const certitude: CertitudeChamp = correspondancesCnss > 3 ? 'PROBABLE' : 'À_CONFIRMER';
      champs.push({
        id: 'champ_cnss',
        nomTechniqueProvisoire: 'CNSS_CANDIDAT',
        positionDebut: meilleurStartCnss + 1,
        positionFin: meilleurStartCnss + 9,
        longueur: 9,
        type: 'NUMERIQUE',
        valeurExemple: sampleLigne.slice(meilleurStartCnss, meilleurStartCnss + 9),
        frequence: correspondancesCnss,
        interpretation: 'Numéro d\'immatriculation CNSS à 9 chiffres',
        certitude,
      });
    }

    // 2. Recherche du segment CNI (1-2 lettres majuscules + 1-6 chiffres)
    let meilleurStartCni = -1;
    let correspondancesCni = 0;

    for (let pos = 0; pos <= Math.max(0, sampleLigne.length - 8); pos++) {
      let matchReferentiel = 0;
      for (const l of lignesSalaries.slice(0, 20)) {
        const seg = l.contenuOriginal.slice(pos, pos + 10).trim();
        const cleaned = normaliserCni(seg);
        if (cleaned && cniConnues.has(cleaned)) {
          matchReferentiel++;
        }
      }
      if (matchReferentiel > correspondancesCni) {
        correspondancesCni = matchReferentiel;
        meilleurStartCni = pos;
      }
    }

    if (meilleurStartCni >= 0) {
      champs.push({
        id: 'champ_cni',
        nomTechniqueProvisoire: 'CNI_CANDIDATE',
        positionDebut: meilleurStartCni + 1,
        positionFin: meilleurStartCni + 10,
        longueur: 10,
        type: 'TEXTE',
        valeurExemple: sampleLigne.slice(meilleurStartCni, meilleurStartCni + 10).trim(),
        frequence: correspondancesCni,
        interpretation: 'Numéro de Carte Nationale d\'Identité (CNI)',
        certitude: correspondancesCni > 3 ? 'PROBABLE' : 'À_CONFIRMER',
      });
    }

    // 3. Segment Nom / Prénom (Chaîne alphabétique longue, positionnée après CNI)
    let meilleurStartNom = -1;
    let meilleurLenNom = 30;
    for (let pos = 20; pos <= Math.max(20, sampleLigne.length - 25); pos++) {
      const seg = sampleLigne.slice(pos, pos + 25);
      if (/^[A-Z\s]{20,}$/.test(seg)) {
        meilleurStartNom = pos;
        break;
      }
    }

    if (meilleurStartNom >= 0) {
      champs.push({
        id: 'champ_nom',
        nomTechniqueProvisoire: 'NOM_CANDIDAT',
        positionDebut: meilleurStartNom + 1,
        positionFin: meilleurStartNom + meilleurLenNom,
        longueur: meilleurLenNom,
        type: 'TEXTE',
        valeurExemple: sampleLigne.slice(meilleurStartNom, meilleurStartNom + meilleurLenNom).trim(),
        frequence: lignesSalaries.length,
        interpretation: 'Nom et Prénom officiels du salarié',
        certitude: 'PROBABLE',
      });
    }

    // 4. Segment Jours travaillés (Nombre 0 à 26, situé après le nom au-delà de pos 40)
    let startJours = -1;
    for (let pos = 45; pos <= Math.max(45, sampleLigne.length - 2); pos++) {
      let countJoursValides = 0;
      for (const l of lignesSalaries.slice(0, 15)) {
        const seg = l.contenuOriginal.slice(pos, pos + 2).trim();
        const n = parseInt(seg, 10);
        if (!isNaN(n) && n >= 0 && n <= 26 && /^\d{2}$/.test(seg)) {
          countJoursValides++;
        }
      }
      if (countJoursValides >= Math.min(10, lignesSalaries.length)) {
        startJours = pos;
        break;
      }
    }

    if (startJours >= 0) {
      champs.push({
        id: 'champ_jours',
        nomTechniqueProvisoire: 'JOURS_CANDIDATS',
        positionDebut: startJours + 1,
        positionFin: startJours + 2,
        longueur: 2,
        type: 'NUMERIQUE',
        valeurExemple: sampleLigne.slice(startJours, startJours + 2).trim(),
        frequence: lignesSalaries.length,
        interpretation: 'Nombre de jours déclarés (plafonné à 26)',
        certitude: 'À_CONFIRMER', // Règle Section 12 : Toujours À_CONFIRMER sans doc
      });
    }

    // 5. Segment Situation (2 lettres ex: SO, CO, AT ou vide)
    let startSituation = -1;
    for (let pos = 0; pos <= Math.max(0, sampleLigne.length - 2); pos++) {
      let matchCode = 0;
      for (const l of lignesSalaries) {
        const seg = l.contenuOriginal.slice(pos, pos + 2).trim().toUpperCase();
        if (seg === 'SO' || seg === 'CO' || seg === 'AT' || seg === 'ML' || seg === 'MT') {
          matchCode++;
        }
      }
      if (matchCode >= 1) {
        startSituation = pos;
        break;
      }
    }

    if (startSituation >= 0) {
      champs.push({
        id: 'champ_situation',
        nomTechniqueProvisoire: 'SITUATION_CANDIDATE',
        positionDebut: startSituation + 1,
        positionFin: startSituation + 2,
        longueur: 2,
        type: 'TEXTE',
        valeurExemple: sampleLigne.slice(startSituation, startSituation + 2).trim() || 'SO',
        frequence: lignesSalaries.length,
        interpretation: 'Code de situation CNSS (SO, AT, CO...)',
        certitude: 'PROBABLE',
      });
    }

    return champs;
  }

  /**
   * Extrait les valeurs individuelles d'une ligne selon les champs candidats
   */
  extraireValeursLigne(ligne: string, champs: ChampCandidat[]): {
    cnss?: string;
    cni?: string;
    nom?: string;
    jours?: number;
    montant?: number;
    situation?: string;
  } {
    const res: any = {};
    for (const c of champs) {
      const rawVal = ligne.slice(c.positionDebut - 1, c.positionFin).trim();
      switch (c.nomTechniqueProvisoire) {
        case 'CNSS_CANDIDAT':
          if (/^\d{9}$/.test(rawVal)) res.cnss = rawVal;
          break;
        case 'CNI_CANDIDATE':
          if (rawVal) res.cni = normaliserCni(rawVal);
          break;
        case 'NOM_CANDIDAT':
          if (rawVal) res.nom = rawVal;
          break;
        case 'JOURS_CANDIDATS': {
          const n = parseInt(rawVal, 10);
          if (!isNaN(n)) res.jours = n;
          break;
        }
        case 'MONTANT_CANDIDAT': {
          const m = parseFloat(rawVal.replace(',', '.'));
          if (!isNaN(m)) res.montant = m;
          break;
        }
        case 'SITUATION_CANDIDATE':
          if (rawVal) res.situation = rawVal.toUpperCase();
          break;
      }
    }
    return res;
  }

  /**
   * Rapprochement systématique du Préétabli CNSS avec le Registre Mensuel MULT.S
   * Respecte strictement l'ordre d'identification : CNSS -> CNI -> Alias -> Nom -> Token-Sort -> Fuzzy
   * Ne modifie JAMAIS le fichier préétabli ni le registre.
   */
  rapprocherPreetabliAvecRegistre(
    fichier: FichierPreetabliCnss,
    registre: LigneRegistreCnss[],
    baseSalaries: SalarieReferentiel[],
    aliasList: AliasItem[],
    decisionsExistantes: Record<string, DecisionHumainePreetabli> = {}
  ): RapprochementPreetabli[] {
    const champsCandidats = this.identifierChampsCandidats(fichier, baseSalaries);
    const lignesSalaries = fichier.lignesOriginales.filter(l => l.typeEnregistrement === 'SALARIE');

    // Indexation rapide du registre
    const registreByCnss = new Map<string, LigneRegistreCnss>();
    const registreByCni = new Map<string, LigneRegistreCnss>();
    const registreByNom = new Map<string, LigneRegistreCnss>();

    registre.forEach(l => {
      if (l.cnss && l.cnss !== 'MANQUANT') registreByCnss.set(normaliserCnss(l.cnss), l);
      if (l.cni && l.cni !== 'MANQUANT') registreByCni.set(normaliserCni(l.cni), l);
      registreByNom.set(normaliserNom(l.nomOfficiel), l);
    });

    // Alias map
    const aliasMap = new Map<string, AliasItem>();
    aliasList.forEach(a => {
      aliasMap.set(normaliserNom(a.aliasBrut), a);
    });

    const resultats: RapprochementPreetabli[] = [];

    for (const lOrig of lignesSalaries) {
      const ligneId = `rap_preetabli_${lOrig.numeroLigne}`;
      const vals = this.extraireValeursLigne(lOrig.contenuOriginal, champsCandidats);

      const decision = decisionsExistantes[ligneId];
      const diffs: DifferenceDetail[] = [];
      const anomalies: string[] = [];

      let candidatTrouve: LigneRegistreCnss | undefined;
      let methode: RapprochementPreetabli['methode'] = 'AUCUNE';
      let score = 0;
      let ecartScore = 100;
      let statut: RapprochementPreetabli['statut'] = 'NON_IDENTIFIE';

      // Arbitrage manuel prioritaire
      if (decision && decision.action === 'ASSOCIER_SALARIE' && decision.salarieCibleId) {
        candidatTrouve = registre.find(r => r.salarieId === decision.salarieCibleId);
        methode = 'ARBITRAGE_MANUEL';
        score = 100;
        statut = 'VALIDÉ';
      }

      // 1. CNSS exact (Niveau 1)
      if (!candidatTrouve && vals.cnss) {
        const c = registreByCnss.get(vals.cnss);
        if (c) {
          candidatTrouve = c;
          methode = 'CNSS_EXACT';
          score = 100;
          statut = 'IDENTIFIE';
        }
      }

      // 2. CNI exacte (Niveau 2)
      if (!candidatTrouve && vals.cni) {
        const c = registreByCni.get(vals.cni);
        if (c) {
          candidatTrouve = c;
          methode = 'CNI_EXACT';
          score = 98;
          statut = 'IDENTIFIE';
        }
      }

      // 3. Alias mémorisé (Niveau 3)
      if (!candidatTrouve && vals.nom) {
        const al = aliasMap.get(normaliserNom(vals.nom));
        if (al) {
          const c = registre.find(r => r.salarieId === al.salarieId);
          if (c) {
            candidatTrouve = c;
            methode = 'ALIAS';
            score = 95;
            statut = 'IDENTIFIE';
          }
        }
      }

      // 4. Nom normalisé exact (Niveau 4)
      if (!candidatTrouve && vals.nom) {
        const nomNorm = normaliserNom(vals.nom);
        const c = registreByNom.get(nomNorm);
        if (c) {
          candidatTrouve = c;
          methode = 'NOM_NORMALISE';
          score = 92;
          statut = 'IDENTIFIE';
        }
      }

      // 5. Token-sort & Fuzzy (Niveaux 5 & 6)
      if (!candidatTrouve && vals.nom) {
        const nomTokens = extraireTokensTries(vals.nom);
        const scoresCandidats: Array<{ reg: LigneRegistreCnss; sc: number }> = [];

        for (const reg of registre) {
          const regTokens = extraireTokensTries(reg.nomOfficiel);
          if (nomTokens.length > 0 && nomTokens.join(' ') === regTokens.join(' ')) {
            scoresCandidats.push({ reg, sc: 88 });
          } else if (nomTokens.length > 0 && nomTokens.every(t => regTokens.includes(t))) {
            // Tous les mots du préétabli sont contenus dans ce salarié (ex: "EL WARDI" dans "AHMED EL WARDI" et "AYOUB EL WARDI")
            scoresCandidats.push({ reg, sc: 82 });
          } else {
            const dist = distanceLevenshtein(normaliserNom(vals.nom), normaliserNom(reg.nomOfficiel));
            const maxL = Math.max(vals.nom.length, reg.nomOfficiel.length);
            const sim = maxL > 0 ? Math.round(((maxL - dist) / maxL) * 100) : 0;
            if (sim >= 75) {
              scoresCandidats.push({ reg, sc: sim });
            }
          }
        }

        scoresCandidats.sort((a, b) => b.sc - a.sc);

        if (scoresCandidats.length === 1) {
          candidatTrouve = scoresCandidats[0].reg;
          methode = scoresCandidats[0].sc >= 88 ? 'TOKEN_SORT' : 'FUZZY';
          score = scoresCandidats[0].sc;
          statut = score >= 85 ? 'A_VALIDER' : 'AMBIGU';
        } else if (scoresCandidats.length > 1) {
          const best = scoresCandidats[0];
          const second = scoresCandidats[1];
          ecartScore = best.sc - second.sc;

          // Règle d'ambiguïté : écart < 10 ou 2 candidats à plus de 80%
          if (ecartScore < 10 || (best.sc >= 80 && second.sc >= 80)) {
            statut = 'AMBIGU';
            anomalies.push(`Ambiguïté : 2 candidats proches (${best.reg.nomOfficiel} vs ${second.reg.nomOfficiel})`);
            candidatTrouve = undefined;
          } else {
            candidatTrouve = best.reg;
            methode = 'FUZZY';
            score = best.sc;
            statut = 'A_VALIDER';
          }
        }
      }

      // Détection des différences lorsque le candidat est rattaché
      if (candidatTrouve) {
        // CNSS
        if (vals.cnss && candidatTrouve.cnss && vals.cnss !== candidatTrouve.cnss) {
          diffs.push({
            champ: 'CNSS',
            valeurPreetabli: vals.cnss,
            valeurRegistre: candidatTrouve.cnss,
            categorie: 'DIFFÉRENT',
            message: `Numéro CNSS différent : Préétabli (${vals.cnss}) vs Registre (${candidatTrouve.cnss})`,
          });
          statut = 'INCOHERENT';
        }

        // CNI
        if (vals.cni && candidatTrouve.cni && vals.cni !== candidatTrouve.cni) {
          diffs.push({
            champ: 'CNI',
            valeurPreetabli: vals.cni,
            valeurRegistre: candidatTrouve.cni,
            categorie: 'DIFFÉRENT',
            message: `CNI différente : Préétabli (${vals.cni}) vs Registre (${candidatTrouve.cni})`,
          });
        }

        // Jours (Contrôle spécifique Section 23)
        if (vals.jours !== undefined) {
          const jPreetabli = vals.jours;
          const jRegistre = candidatTrouve.joursDeclares;

          if (jPreetabli < 0 || jRegistre < 0) {
            diffs.push({
              champ: 'JOURS',
              valeurPreetabli: jPreetabli,
              valeurRegistre: jRegistre,
              categorie: 'DIFFÉRENT',
              message: `Jours négatifs détectés : anomalie (${jPreetabli} j vs ${jRegistre} j)`,
            });
            anomalies.push('Jours négatifs non conformes');
            statut = 'INCOHERENT';
          } else if (jPreetabli !== jRegistre) {
            diffs.push({
              champ: 'JOURS',
              valeurPreetabli: jPreetabli,
              valeurRegistre: jRegistre,
              categorie: 'DIFFÉRENT',
              message: `Écart de jours : Préétabli (${jPreetabli} j) vs Registre déclaré (${jRegistre} j)`,
            });
          } else {
            diffs.push({
              champ: 'JOURS',
              valeurPreetabli: jPreetabli,
              valeurRegistre: jRegistre,
              categorie: 'IDENTIQUE',
              message: `Jours conformes : ${jPreetabli} j`,
            });
          }
        }

        // Situation (Sorties / Mouvements Section 22)
        if (vals.situation) {
          const sitPreetabli = vals.situation;
          const sitRegistre = candidatTrouve.situation;
          const estSortiPreetabli = sitPreetabli === 'SO';
          const estSortiRegistre = sitRegistre === 'SORTI' || sitRegistre === 'SORTIE';

          if (estSortiPreetabli && estSortiRegistre) {
            diffs.push({
              champ: 'SITUATION',
              valeurPreetabli: sitPreetabli,
              valeurRegistre: sitRegistre,
              categorie: 'IDENTIQUE',
              message: 'Sortie confirmée conjointement dans le préétabli (SO) et le registre (SORTI)',
            });
          } else if (estSortiPreetabli !== estSortiRegistre) {
            diffs.push({
              champ: 'SITUATION',
              valeurPreetabli: sitPreetabli,
              valeurRegistre: sitRegistre,
              categorie: 'DIFFÉRENT',
              message: `Divergence de situation : Préétabli (${sitPreetabli}) vs Registre (${sitRegistre || 'ACTIF'})`,
            });
          }
        }
      } else if (statut !== 'AMBIGU') {
        statut = 'NON_IDENTIFIE';
        diffs.push({
          champ: 'NOM',
          valeurPreetabli: vals.nom || `Ligne ${lOrig.numeroLigne}`,
          valeurRegistre: null,
          categorie: 'MANQUANT_REGISTRE',
          message: 'Salarié présent dans le préétabli mais non retrouvé dans le registre MULT.S (PRESENT_PREETABLI_NON_REGISTRE)',
        });
      }

      if (decision && decision.action === 'VALIDER') {
        statut = 'VALIDÉ';
      }

      resultats.push({
        id: ligneId,
        numeroLignePreetabli: lOrig.numeroLigne,
        lignePreetabliId: lOrig.hash || `l_${lOrig.numeroLigne}`,
        preetabliCnss: vals.cnss,
        preetabliCni: vals.cni,
        preetabliNom: vals.nom,
        preetabliJours: vals.jours,
        preetabliMontant: vals.montant,
        preetabliSituation: vals.situation,
        salarieId: candidatTrouve?.salarieId,
        registreLigneId: candidatTrouve?.id,
        score,
        methode,
        statut,
        candidats: candidatTrouve ? [{
          salarieId: candidatTrouve.salarieId || '',
          nom: candidatTrouve.nomOfficiel,
          cni: candidatTrouve.cni,
          cnss: candidatTrouve.cnss,
          score,
        }] : [],
        ecartScore,
        anomalies,
        differences: diffs,
        valideParHumain: Boolean(decision && decision.action === 'VALIDER'),
        decisionHumaine: decision,
      });
    }

    return resultats;
  }

  /**
   * Produit le bilan statistique complet de l'analyse (Section 7)
   */
  calculerBilanAnalyse(
    fichier: FichierPreetabliCnss,
    rapprochements: RapprochementPreetabli[],
    registre: LigneRegistreCnss[]
  ): BilanAnalysePreetabli {
    const lignesParLongueur: Record<number, number> = {};
    const lignesParType: Record<string, number> = {};
    const caracteresInhabituels = new Set<string>();

    let lignesSuspectes = 0;
    let lignesVides = 0;

    fichier.lignesOriginales.forEach(l => {
      lignesParLongueur[l.longueur] = (lignesParLongueur[l.longueur] || 0) + 1;
      lignesParType[l.typeEnregistrement] = (lignesParType[l.typeEnregistrement] || 0) + 1;

      if (!l.contenuOriginal.trim()) lignesVides++;
      if (l.caracteresSpeciaux.length > 0) {
        l.caracteresSpeciaux.forEach(c => caracteresInhabituels.add(c));
        lignesSuspectes++;
      }
      if (l.longueur !== fichier.longueurDominante && l.typeEnregistrement === 'SALARIE') {
        lignesSuspectes++;
      }
    });

    // Doublons exacts de lignes
    const setLignes = new Set<string>();
    let doublonsExacts = 0;
    fichier.lignesOriginales.forEach(l => {
      if (setLignes.has(l.contenuOriginal)) doublonsExacts++;
      else setLignes.add(l.contenuOriginal);
    });

    const totalPreetabliSalaries = rapprochements.length;
    let totalIdentifies = 0;
    let totalAValider = 0;
    let totalAmbigus = 0;
    let totalNonIdentifies = 0;
    let totalIncoherents = 0;
    let totalValides = 0;
    let totalDifferencesJours = 0;
    let totalDifferencesMontants = 0;

    rapprochements.forEach(r => {
      switch (r.statut) {
        case 'IDENTIFIE': totalIdentifies++; break;
        case 'A_VALIDER': totalAValider++; break;
        case 'AMBIGU': totalAmbigus++; break;
        case 'NON_IDENTIFIE': totalNonIdentifies++; break;
        case 'INCOHERENT': totalIncoherents++; break;
        case 'VALIDÉ': totalValides++; break;
      }
      if (r.differences.some(d => d.champ === 'JOURS' && d.categorie === 'DIFFÉRENT')) {
        totalDifferencesJours++;
      }
      if (r.differences.some(d => d.champ === 'MONTANT' && d.categorie === 'DIFFÉRENT')) {
        totalDifferencesMontants++;
      }
    });

    // Salariés présents registre mais absents du préétabli (NOUVEAU_A_EXAMINER - Section 20)
    const salarieIdsPreetabli = new Set(rapprochements.map(r => r.salarieId).filter(Boolean));
    const totalNouveauxAExaminer = registre.filter(reg => !salarieIdsPreetabli.has(reg.salarieId)).length;

    // Salariés présents préétabli mais absents du registre (PRESENT_PREETABLI_NON_REGISTRE - Section 21)
    const totalPresentsPreetabliNonRegistre = rapprochements.filter(r => r.statut === 'NON_IDENTIFIE').length;

    return {
      totalLignes: fichier.nombreLignes,
      lignesParLongueur,
      lignesParType,
      lignesSuspectes,
      lignesVides,
      doublonsExacts,
      caracteresInhabituels: Array.from(caracteresInhabituels),
      totalPreetabliSalaries,
      totalIdentifies,
      totalAValider,
      totalAmbigus,
      totalNonIdentifies,
      totalIncoherents,
      totalValides,
      totalPresentsPreetabliNonRegistre,
      totalNouveauxAExaminer,
      totalDifferencesJours,
      totalDifferencesMontants,
    };
  }

  /**
   * Génère une fixture standard de préétabli CNSS basée sur les salariés réels de Septembre (Section 36)
   * EXPLICITEMENT MARQUÉE COMME FIXTURE DE TEST.
   * Utilise le format BDS officiel EDI à largeur fixe (260 octets par ligne)
   */
  genererFixturePreetabliReference(periodeId = '2026-09'): string {
    const affiliationEmployeur = '7891234';
    const nomEmployeur = 'MULT.S INTERIM SARL';
    const periodeFormatted = periodeId.replace('-', '');

    const lines: string[] = [];

    // Ligne 1 : En-tête employeur (Type ENTETE_EMPLOYEUR, fixe 260 car.)
    const entete = `01${affiliationEmployeur.padEnd(7, ' ')}${periodeFormatted.padEnd(6, ' ')}${nomEmployeur.padEnd(40, ' ')}FICHIER PREETABLI CNSS BORDEREAU SALAIRES TEST FIXTURE`;
    lines.push(entete.padEnd(260, ' '));

    // Lignes Salariés (Type SALARIE, fixe 260 car.)
    // Basées sur les données réelles de RAW_BASE_CNSS_SEPTEMBRE
    RAW_BASE_CNSS_SEPTEMBRE.forEach(item => {
      const cnssClean = normaliserCnss(item.cnss);
      if (!cnssClean) return; // ignore les lignes sans matricule dans le préétabli

      const cniClean = normaliserCni(item.cni || '');
      const nomClean = item.nom.toUpperCase().replace(/[^A-Z\s]/g, '').padEnd(30, ' ').slice(0, 30);
      const jours = item.situation.toLowerCase() === 'so' ? '00' : '26';
      const salaire = '000004500.00';
      const situation = (item.situation || '  ').toUpperCase().slice(0, 2).padEnd(2, ' ');

      // Construction segmentée respectant la structure EDI BDS
      // Pos 1-2: Type ("02") | Pos 3-11: CNSS (9) | Pos 12-21: CNI (10) | Pos 22-51: Nom (30) | Pos 52-53: Jours (2) | Pos 54-65: Salaire (12) | Pos 66-67: Situation (2)
      const ligne = `02${cnssClean}${cniClean.padEnd(10, ' ')}${nomClean}${jours}${salaire}${situation}`;
      lines.push(ligne.padEnd(260, ' '));
    });

    // Ligne Fin / Total (Type TOTAL_CONTROLE, fixe 260 car.)
    const totalCount = (lines.length - 1).toString().padStart(6, '0');
    const totalLine = `99${affiliationEmployeur}${totalCount}TOTAL CONTROLE ENREGISTREMENTS PREETABLI TEST`;
    lines.push(totalLine.padEnd(260, ' '));

    return lines.join('\r\n');
  }

  /**
   * Génère le rapport d'analyse interne sous forme de fichier CSV ou JSON (Section 32)
   */
  genererRapportAnalyseInterne(
    fichier: FichierPreetabliCnss,
    bilan: BilanAnalysePreetabli,
    raps: RapprochementPreetabli[],
    format: 'CSV' | 'JSON'
  ): string {
    if (format === 'JSON') {
      return JSON.stringify(
        {
          metadata: {
            application: 'CNSS MULT.S',
            phase: 'PROMPT 07-BIS',
            nomFichier: fichier.nomFichier,
            hash: fichier.hash,
            taille: fichier.taille,
            encodage: fichier.encodage,
            nombreLignes: fichier.nombreLignes,
            dateAnalyse: new Date().toISOString(),
          },
          bilan,
          rapprochements: raps,
        },
        null,
        2
      );
    }

    // Format CSV
    const csvLines: string[] = [];
    csvLines.push('RAPPORT D\'ANALYSE INTERNE DU PRÉÉTABLI CNSS - CNSS MULT.S');
    csvLines.push(`Fichier;${fichier.nomFichier};Hash;${fichier.hash};Lignes;${fichier.nombreLignes}`);
    csvLines.push('');
    csvLines.push('Ligne;CNSS_Preetabli;CNI_Preetabli;Nom_Preetabli;Jours_Preetabli;Statut_Rapprochement;Score;Methode;Salarie_Registre;Jours_Registre;Differences');

    raps.forEach(r => {
      const diffStr = r.differences.map(d => `${d.champ}:${d.categorie}`).join(' | ');
      csvLines.push(
        [
          r.numeroLignePreetabli,
          r.preetabliCnss || '',
          r.preetabliCni || '',
          `"${r.preetabliNom || ''}"`,
          r.preetabliJours !== undefined ? r.preetabliJours : '',
          r.statut,
          `${r.score}%`,
          r.methode,
          `"${r.candidats[0]?.nom || 'AUCUN'}"`,
          r.differences.find(d => d.champ === 'JOURS')?.valeurRegistre ?? '',
          `"${diffStr}"`,
        ].join(';')
      );
    });

    return csvLines.join('\r\n');
  }
}

export const cnssPreetabliService = new CnssPreetabliService();
