/**
 * Service de Registre Mensuel CNSS, Consolidation et Contrôle Final - PROMPT 06
 * Assure la transformation des données validées du workflow en registre contrôlé
 * prêt pour la future déclaration CNSS, avec traçabilité et immuabilité absolues.
 */

import {
  LigneRegistreCnss,
  StatutLigneRegistre,
  CorrectionRegistre,
  BilanRegistreMensuel,
  LignePaieImportee,
  SalarieReferentiel,
  ResultatRapprochement,
  AnomalieLigne,
} from '../types/cnss';
import { persistenceService } from './persistenceService';
import { determinerStatutLigneP5 } from './matchingEngine';
import { normaliserSituation } from './normalizer';

export class CnssRegisterService {
  /**
   * Construit le registre mensuel à partir des données de paie, référentiel, rapprochements et anomalies
   */
  construireRegistre(
    periodeId: string,
    lignesPaie: LignePaieImportee[],
    baseSalaries: SalarieReferentiel[],
    rapprochements: ResultatRapprochement[],
    anomalies: AnomalieLigne[] = []
  ): LigneRegistreCnss[] {
    const maintenant = new Date().toISOString();

    // Map rapide des rapprochements par lignePaieId
    const mapRaps = new Map<string, ResultatRapprochement>();
    rapprochements.forEach(r => {
      mapRaps.set(r.lignePaieId, r);
    });

    // Map des anomalies par lignePaieId
    const mapAnomalies = new Map<string, AnomalieLigne[]>();
    anomalies.forEach(a => {
      if (a.lignePaieId) {
        const exist = mapAnomalies.get(a.lignePaieId) || [];
        exist.push(a);
        mapAnomalies.set(a.lignePaieId, exist);
      }
    });

    // Récupérer le registre existant en mémoire/persistance pour préserver les validations & corrections humaines
    const registreExistant = persistenceService.getRegistrePeriode(periodeId);
    const mapExistant = new Map<string, LigneRegistreCnss>();
    registreExistant.forEach(l => {
      mapExistant.set(l.lignePaieId, l);
    });

    const lignesRegistre: LigneRegistreCnss[] = lignesPaie.map((lignePaie, index) => {
      const rap = mapRaps.get(lignePaie.id);
      const existant = mapExistant.get(lignePaie.id);
      const anosLigne = mapAnomalies.get(lignePaie.id) || [];

      // 1. Identification
      const salarieLie = rap?.salariePropose;
      const salarieId = salarieLie?.id || rap?.salarieBaseId || existant?.salarieId;
      const nomSource = lignePaie.nomCompletBrut || '';
      const nomOfficiel = rap?.nomDeclareFinal || salarieLie?.nomComplet || existant?.nomOfficiel || nomSource;

      // CNI et CNSS
      const cni = (rap?.cniDeclareeFinale || salarieLie?.cni || lignePaie.cniImportee || existant?.cni || '').trim().toUpperCase();
      const cnss = (rap?.cnssDeclareeFinale || salarieLie?.immatriculationCnss || lignePaie.cnssImportee || existant?.cnss || '').trim();

      // 2. Jours : Respect absolu du découplage source / déclaré
      const joursImportes = lignePaie.joursImportes;
      let joursDeclares = existant?.joursDeclares ?? rap?.validationJours?.joursDeclares ?? joursImportes;

      // 3. Salaires : Préservation source et déclaration
      const baseImportee = lignePaie.salaireBase ?? 0;
      const baseDeclaree = existant?.baseDeclaree ?? baseImportee;

      const salaireBrutImporte = lignePaie.salaireBrut ?? 0;
      const salaireBrutDeclare = existant?.salaireBrutDeclare ?? salaireBrutImporte;

      // 4. Situation : priorité absolue à la situation du fichier importé
      const situationBruteLigne = lignePaie.situationImportee;
      const situation = situationBruteLigne
        ? normaliserSituation(situationBruteLigne)
        : (salarieLie?.situation ? normaliserSituation(salarieLie.situation) : 'ACTIF');

      // 5. Statut Rapprochement P5
      const statutRapprochement = rap ? determinerStatutLigneP5(rap) : 'NON_IDENTIFIE';

      // 6. Corrections antérieures
      const corrections: CorrectionRegistre[] = existant?.corrections ? [...existant.corrections] : [];

      // Si une modification des jours a été faite dans le workflow P3/P5
      if (rap?.validationJours?.modifieManuellement && rap.validationJours.justification) {
        const dejatrace = corrections.some(c => c.champ === 'jours' && c.nouvelleValeur === rap.validationJours.joursDeclares);
        if (!dejatrace && rap.validationJours.joursDeclares !== undefined) {
          corrections.push({
            id: `cor_${lignePaie.id}_${Date.now()}`,
            champ: 'jours',
            ancienneValeur: joursImportes,
            nouvelleValeur: rap.validationJours.joursDeclares,
            motif: rap.validationJours.justification,
            date: rap.dateDecision || maintenant,
            auteur: 'Gestionnaire MULT.S',
          });
        }
      }

      // 7. Détermination du statut strict du registre
      const motifsBlocage: string[] = [];

      // Conditions d'identification
      if (!salarieId || statutRapprochement === 'NON_IDENTIFIE') {
        motifsBlocage.push('Salarié non identifié dans le référentiel');
      }

      if (rap?.estAmbigu || statutRapprochement === 'AMBIGU') {
        motifsBlocage.push('Correspondance ambiguë entre plusieurs salariés non arbitrée');
      }

      if (statutRapprochement === 'SORTI_A_ARBITRER' || (situation === 'SORTI' && (joursDeclares > 0) && !rap?.decisionSorti)) {
        motifsBlocage.push('Salarié noté SORTI avec des jours travaillés sans confirmation de reprise');
      }

      // Jours valides
      if (joursDeclares < 0) {
        motifsBlocage.push(`Jours déclarés négatifs (${joursDeclares} j) non autorisés`);
      } else if (joursDeclares > 26) {
        motifsBlocage.push(`Dépassement du plafond légal CNSS (${joursDeclares} j > 26 j)`);
      } else if (isNaN(joursDeclares) || joursDeclares === undefined || joursDeclares === null) {
        motifsBlocage.push('Nombre de jours déclaré invalide ou manquant');
      }

      // Anomalies bloquantes non résolues
      const aAnomaliesBloquantesNonResolues = anosLigne.some(a => a.gravite === 'BLOQUANTE' && !a.estResolue);
      if (aAnomaliesBloquantesNonResolues) {
        motifsBlocage.push('Anomalie bloquante non résolue sur cette ligne');
      }

      // Identifiants manquants (CNI / CNSS)
      const cniManquante = !cni || cni === 'MANQUANT';
      const cnssManquante = !cnss || cnss === 'MANQUANT';

      let statutCalcule: StatutLigneRegistre = 'PRET';

      if (existant?.valide && !existant?.justificationReouverture) {
        statutCalcule = 'VALIDE';
      } else if (motifsBlocage.length > 0) {
        statutCalcule = 'BLOQUE';
      } else if (cniManquante || cnssManquante) {
        statutCalcule = 'A_COMPLETER';
        if (cnssManquante) motifsBlocage.push('Numéro CNSS manquant');
        if (cniManquante) motifsBlocage.push('Numéro CNI manquant');
      } else if (existant?.justificationReouverture) {
        statutCalcule = 'A_CORRIGER';
        motifsBlocage.push(`Ligne réouverte : ${existant.justificationReouverture}`);
      }

      return {
        id: `reg_${periodeId}_${lignePaie.id}`,
        periodeId,
        lignePaieId: lignePaie.id,
        sourceFileId: lignePaie.sourceFichier || 'calcul_salaire.xlsx',
        numeroLigneSource: lignePaie.ligneFichier || index + 2,
        salarieId: salarieId || undefined,
        nomSource,
        nomOfficiel,
        cni: cni || 'MANQUANT',
        cnss: cnss || 'MANQUANT',
        joursImportes,
        joursDeclares,
        baseImportee,
        baseDeclaree,
        salaireBrutImporte,
        salaireBrutDeclare,
        situation,
        situationOriginale: lignePaie.situationImportee || salarieLie?.situationOriginale,
        statutRapprochement,
        statut: statutCalcule,
        anomalies: anosLigne,
        corrections,
        motifsBlocage,
        derniereModification: existant?.derniereModification || maintenant,
        valide: existant?.valide || false,
        dateValidation: existant?.dateValidation,
        verrouille: existant?.verrouille || false,
        dateVerrouillage: existant?.dateVerrouillage,
        justificationReouverture: existant?.justificationReouverture,
      };
    });

    return lignesRegistre;
  }

  /**
   * Applique une correction manuelle sur les jours d'une ligne du registre.
   * RÈGLE STRICTE : Justification obligatoire, joursImportes reste 100% intact !
   */
  appliquerCorrectionJours(
    ligne: LigneRegistreCnss,
    nouveauxJours: number,
    motif: string,
    auteur = 'Gestionnaire MULT.S'
  ): { succes: boolean; ligneModifiee?: LigneRegistreCnss; erreur?: string } {
    if (!motif || !motif.trim()) {
      return {
        succes: false,
        erreur: 'La justification est obligatoire pour toute correction de jours.',
      };
    }

    if (isNaN(nouveauxJours) || nouveauxJours < 0 || nouveauxJours > 26) {
      return {
        succes: false,
        erreur: 'Les jours déclarés doivent être un nombre compris entre 0 et 26.',
      };
    }

    if (ligne.verrouille) {
      return {
        succes: false,
        erreur: 'Cette ligne est verrouillée. Demandez d\'abord une réouverture avec motif.',
      };
    }

    const maintenant = new Date().toISOString();
    const ancienneValeur = ligne.joursDeclares;

    const correction: CorrectionRegistre = {
      id: `cor_${Date.now()}`,
      champ: 'jours',
      ancienneValeur,
      nouvelleValeur: nouveauxJours,
      motif: motif.trim(),
      date: maintenant,
      auteur,
    };

    const motifsBlocage = ligne.motifsBlocage.filter(
      m => !m.includes('jours') && !m.includes('Dépassement') && !m.includes('Plafond')
    );

    // Réévaluer le statut
    let nouveauStatut: StatutLigneRegistre = 'PRET';
    if (motifsBlocage.length > 0) {
      nouveauStatut = 'BLOQUE';
    } else if (ligne.cni === 'MANQUANT' || ligne.cnss === 'MANQUANT') {
      nouveauStatut = 'A_COMPLETER';
    }

    const ligneModifiee: LigneRegistreCnss = {
      ...ligne,
      joursDeclares: nouveauxJours,
      // joursImportes reste INTACT !
      corrections: [...ligne.corrections, correction],
      motifsBlocage,
      statut: nouveauStatut,
      derniereModification: maintenant,
      justificationReouverture: undefined,
    };

    persistenceService.enregistrerEvenementAudit({
      id: `audit_reg_j_${Date.now()}`,
      date: maintenant,
      action: 'MODIFICATION_JOURS',
      salarie: ligne.nomOfficiel,
      ancienneValeur: `${ancienneValeur} j`,
      nouvelleValeur: `${nouveauxJours} j (Source: ${ligne.joursImportes} j)`,
      justification: motif.trim(),
      utilisateur: auteur,
    });

    return { succes: true, ligneModifiee };
  }

  /**
   * Valide individuellement une ligne du registre prête pour la déclaration
   */
  validerLigneIndividuelle(
    ligne: LigneRegistreCnss,
    utilisateur = 'Gestionnaire MULT.S'
  ): { succes: boolean; ligneValidee?: LigneRegistreCnss; erreur?: string } {
    if (ligne.statut === 'BLOQUE') {
      return {
        succes: false,
        erreur: `Impossible de valider une ligne bloquée : ${ligne.motifsBlocage.join(', ')}`,
      };
    }

    if (ligne.statut === 'A_COMPLETER') {
      return {
        succes: false,
        erreur: 'Des informations obligatoires (CNI ou CNSS) sont manquantes.',
      };
    }

    const maintenant = new Date().toISOString();

    const ligneValidee: LigneRegistreCnss = {
      ...ligne,
      statut: 'VALIDE',
      valide: true,
      verrouille: true,
      dateValidation: maintenant,
      dateVerrouillage: maintenant,
      derniereModification: maintenant,
      justificationReouverture: undefined,
    };

    persistenceService.enregistrerEvenementAudit({
      id: `audit_val_indiv_${Date.now()}`,
      date: maintenant,
      action: 'VALIDATION_CORRESPONDANCE',
      salarie: ligne.nomOfficiel,
      ancienneValeur: ligne.statut,
      nouvelleValeur: 'VALIDE',
      justification: 'Validation individuelle de la ligne dans le registre CNSS',
      utilisateur,
    });

    return { succes: true, ligneValidee };
  }

  /**
   * Réouverture d'une ligne du registre validée.
   * RÈGLE STRICTE : Motif obligatoire + audit REGISTRE_REOUVERT + statut -> A_CORRIGER
   */
  demanderReouvertureLigne(
    ligne: LigneRegistreCnss,
    motif: string,
    utilisateur = 'Gestionnaire MULT.S'
  ): { succes: boolean; ligneReouverte?: LigneRegistreCnss; erreur?: string } {
    if (!motif || !motif.trim()) {
      return {
        succes: false,
        erreur: 'Le motif de réouverture est obligatoire.',
      };
    }

    const maintenant = new Date().toISOString();

    const ligneReouverte: LigneRegistreCnss = {
      ...ligne,
      statut: 'A_CORRIGER',
      valide: false,
      verrouille: false,
      justificationReouverture: motif.trim(),
      derniereModification: maintenant,
      motifsBlocage: [...ligne.motifsBlocage, `Réouverture demandée : ${motif.trim()}`],
    };

    persistenceService.enregistrerEvenementAudit({
      id: `audit_reouv_lig_${Date.now()}`,
      date: maintenant,
      action: 'REGISTRE_REOUVERT',
      salarie: ligne.nomOfficiel,
      ancienneValeur: 'VALIDE',
      nouvelleValeur: 'A_CORRIGER',
      justification: motif.trim(),
      utilisateur,
    });

    return { succes: true, ligneReouverte };
  }

  /**
   * Détecte les anomalies de cohérence et doublons (CNI / CNSS partagés par des salariés distincts)
   */
  detecterIncoherencesRegistre(lignes: LigneRegistreCnss[]): {
    doublonsCni: Array<{ cni: string; salaries: string[] }>;
    doublonsCnss: Array<{ cnss: string; salaries: string[] }>;
    sansSource: LigneRegistreCnss[];
    sansPeriode: LigneRegistreCnss[];
  } {
    const cniMap = new Map<string, Set<string>>();
    const cnssMap = new Map<string, Set<string>>();
    const sansSource: LigneRegistreCnss[] = [];
    const sansPeriode: LigneRegistreCnss[] = [];

    lignes.forEach(l => {
      if (!l.lignePaieId) sansSource.push(l);
      if (!l.periodeId) sansPeriode.push(l);

      if (l.cni && l.cni !== 'MANQUANT') {
        const set = cniMap.get(l.cni) || new Set<string>();
        set.add(l.nomOfficiel);
        cniMap.set(l.cni, set);
      }

      if (l.cnss && l.cnss !== 'MANQUANT') {
        const set = cnssMap.get(l.cnss) || new Set<string>();
        set.add(l.nomOfficiel);
        cnssMap.set(l.cnss, set);
      }
    });

    const doublonsCni: Array<{ cni: string; salaries: string[] }> = [];
    cniMap.forEach((salaries, cni) => {
      if (salaries.size > 1) {
        doublonsCni.push({ cni, salaries: Array.from(salaries) });
      }
    });

    const doublonsCnss: Array<{ cnss: string; salaries: string[] }> = [];
    cnssMap.forEach((salaries, cnss) => {
      if (salaries.size > 1) {
        doublonsCnss.push({ cnss, salaries: Array.from(salaries) });
      }
    });

    return { doublonsCni, doublonsCnss, sansSource, sansPeriode };
  }

  /**
   * Contrôle global du mois : vérifie la conformité de l'ensemble du registre
   */
  verifierRegistreMensuel(lignes: LigneRegistreCnss[]): BilanRegistreMensuel {
    let prets = 0;
    let valides = 0;
    let bloques = 0;
    let aCompleter = 0;
    let aCorriger = 0;
    let avecAnomalies = 0;
    let avecCorrections = 0;

    const erreurs: string[] = [];
    const avertissements: string[] = [];

    const { doublonsCni, doublonsCnss, sansSource } = this.detecterIncoherencesRegistre(lignes);

    if (doublonsCni.length > 0) {
      doublonsCni.forEach(d => {
        erreurs.push(`Conflit CNI [${d.cni}] partagée par plusieurs salariés : ${d.salaries.join(', ')}`);
      });
    }

    if (doublonsCnss.length > 0) {
      doublonsCnss.forEach(d => {
        erreurs.push(`Conflit N° CNSS [${d.cnss}] partagé par plusieurs salariés : ${d.salaries.join(', ')}`);
      });
    }

    if (sansSource.length > 0) {
      erreurs.push(`${sansSource.length} ligne(s) sans référence de source de paie`);
    }

    lignes.forEach(ligne => {
      if (ligne.corrections.length > 0) avecCorrections++;
      if (ligne.anomalies.length > 0) avecAnomalies++;

      switch (ligne.statut) {
        case 'VALIDE':
          valides++;
          break;
        case 'PRET':
          prets++;
          break;
        case 'BLOQUE':
          bloques++;
          erreurs.push(`${ligne.nomOfficiel} : ${ligne.motifsBlocage.join(' ; ')}`);
          break;
        case 'A_COMPLETER':
          aCompleter++;
          avertissements.push(`${ligne.nomOfficiel} : informations manquantes (${ligne.motifsBlocage.join(', ')})`);
          break;
        case 'A_CORRIGER':
          aCorriger++;
          erreurs.push(`${ligne.nomOfficiel} : nécessite une correction (${ligne.motifsBlocage.join(', ')})`);
          break;
        case 'BROUILLON':
          bloques++;
          break;
      }
    });

    const pret =
      lignes.length > 0 &&
      bloques === 0 &&
      aCompleter === 0 &&
      aCorriger === 0 &&
      doublonsCni.length === 0 &&
      doublonsCnss.length === 0 &&
      sansSource.length === 0;

    return {
      pret,
      total: lignes.length,
      prets,
      valides,
      bloques,
      aCompleter,
      aCorriger,
      avecAnomalies,
      avecCorrections,
      erreurs,
      avertissements,
    };
  }

  /**
   * Valide l'ensemble du registre si aucune condition bloquante ne subsiste
   */
  validerToutLeRegistre(
    lignes: LigneRegistreCnss[],
    utilisateur = 'Gestionnaire MULT.S'
  ): { succes: boolean; lignesValidees?: LigneRegistreCnss[]; bilan: BilanRegistreMensuel; erreur?: string } {
    const bilan = this.verifierRegistreMensuel(lignes);

    if (!bilan.pret) {
      return {
        succes: false,
        bilan,
        erreur: `Validation impossible : ${bilan.bloques} bloqué(s), ${bilan.aCompleter} à compléter, ${bilan.aCorriger} à corriger.`,
      };
    }

    const maintenant = new Date().toISOString();

    const lignesValidees = lignes.map(l => ({
      ...l,
      statut: 'VALIDE' as StatutLigneRegistre,
      valide: true,
      verrouille: true,
      dateValidation: maintenant,
      dateVerrouillage: maintenant,
      derniereModification: maintenant,
    }));

    persistenceService.enregistrerEvenementAudit({
      id: `audit_reg_glob_${Date.now()}`,
      date: maintenant,
      action: 'VALIDATION_REGISTRE',
      salarie: `${lignes.length} salariés`,
      nouvelleValeur: 'REGISTRE_VALIDE',
      justification: `Validation globale du registre CNSS (${lignes.length} lignes)`,
      utilisateur,
    });

    return { succes: true, lignesValidees, bilan };
  }

  /**
   * Exporte un fichier CSV de contrôle interne (outil de vérification humaine)
   */
  exporterControleCsv(lignes: LigneRegistreCnss[], periodeId: string): string {
    const entetes = [
      '#',
      'Nom officiel',
      'Nom source',
      'CNI',
      'CNSS',
      'Jours source',
      'Jours déclarés',
      'Base déclarée',
      'Brut déclaré',
      'Situation',
      'Statut registre',
      'Motifs / Remarques',
    ];

    const lignesCsv = lignes.map((l, i) => [
      i + 1,
      `"${(l.nomOfficiel || '').replace(/"/g, '""')}"`,
      `"${(l.nomSource || '').replace(/"/g, '""')}"`,
      l.cni || '',
      l.cnss || '',
      l.joursImportes,
      l.joursDeclares,
      l.baseDeclaree,
      l.salaireBrutDeclare,
      l.situation,
      l.statut,
      `"${(l.motifsBlocage || []).join(' | ').replace(/"/g, '""')}"`,
    ]);

    return [entetes.join(';'), ...lignesCsv.map(r => r.join(';'))].join('\n');
  }
}

export const cnssRegisterService = new CnssRegisterService();
