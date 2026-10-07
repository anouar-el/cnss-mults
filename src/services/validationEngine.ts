/**
 * Moteur de contrôle, d'audit et de validation métier - PROMPT 03
 * Règle absolue : les données originales (joursImportes) restent strictement intouchables.
 */

import {
  ResultatRapprochement,
  SalarieReferentiel,
  AnomalieLigne,
  ValidationJours,
  SortieItem,
  BilanControlePret,
} from '../types/cnss';
import { normaliserCni } from './normalizer';

export const validationEngine = {
  /**
   * Analyse approfondie de conformité CNSS
   */
  auditer(
    rapprochements: ResultatRapprochement[],
    baseSalaries: SalarieReferentiel[],
    anomaliesResoluesManuellement?: Record<string, { justification: string; date: string }>
  ): AnomalieLigne[] {
    const anomalies: AnomalieLigne[] = [];

    rapprochements.forEach(rap => {
      const { validationJours, salariePropose, lignePaieId, id } = rap;
      const nomSalarie = rap.nomDeclareFinal || rap.salariePropose?.nomComplet || rap.lignePaieId;
      const joursImp = validationJours.joursImportes;

      // 1. JOURS MANQUANTS OU INVALIDES (Section 6) -> Bloquante
      if (joursImp === undefined || joursImp === null || isNaN(joursImp)) {
        anomalies.push({
          id: `ano_invalide_${id}`,
          salarieConcerne: nomSalarie,
          lignePaieId,
          code: 'JOURS_MANQUANTS',
          gravite: 'BLOQUANTE',
          message: `Nombre de jours invalide ou manquant (NaN / vide). Déclaration impossible sans saisie manuelle.`,
          valeurOriginale: String(joursImp),
          valeurSuggeree: 0,
          estResolue: validationJours.validationEffectuee && validationJours.joursDeclares !== undefined,
          actionResolution: validationJours.validationEffectuee ? `Corrigé manuellement à ${validationJours.joursDeclares} j` : undefined,
        });
      }

      // 2. JOURS NÉGATIFS (Section 3) -> Bloquante (ex: -5, -4, -2)
      if (joursImp < 0) {
        const estResolue = validationJours.validationEffectuee && (validationJours.joursDeclares ?? -1) >= 0;
        anomalies.push({
          id: `ano_neg_${id}`,
          salarieConcerne: nomSalarie,
          lignePaieId,
          code: 'JOURS_NEGATIFS',
          gravite: 'BLOQUANTE',
          message: `Jours importés négatifs (${joursImp} j). La CNSS rejette les jours négatifs sur le BDS. Une validation humaine est obligatoire.`,
          valeurOriginale: joursImp,
          valeurSuggeree: 0,
          estResolue,
          actionResolution: estResolue ? `Déclaré à ${validationJours.joursDeclares} j (${validationJours.justification || 'Neutralisé'})` : undefined,
        });
      }

      // 3. JOURS > 26 (Section 4) -> Bloquante (ex: 27)
      if (joursImp > 26) {
        const estResolue = validationJours.validationEffectuee && (validationJours.joursDeclares ?? 99) <= 26;
        anomalies.push({
          id: `ano_sup26_${id}`,
          salarieConcerne: nomSalarie,
          lignePaieId,
          code: 'JOURS_SUPERIEURS_26',
          gravite: 'BLOQUANTE',
          message: `Dépassement du plafond légal CNSS (${joursImp} j > 26 j). Nécessite une validation humaine (plafonnement à 26 j ou maintien justifié).`,
          valeurOriginale: joursImp,
          valeurSuggeree: 26,
          estResolue,
          actionResolution: estResolue ? `Fixé à ${validationJours.joursDeclares} j (${validationJours.justification || 'Plafonné'})` : undefined,
        });
      }

      // 4. JOURS = 0 (Section 5) -> Avertissement
      if (joursImp === 0) {
        anomalies.push({
          id: `ano_zero_${id}`,
          salarieConcerne: nomSalarie,
          lignePaieId,
          code: 'JOURS_ZERO',
          gravite: 'AVERTISSEMENT',
          message: `Salarié avec 0 jour ouvré. Ne doit pas être déclaré ce mois-ci et ne constitue pas automatiquement une sortie définitive.`,
          valeurOriginale: 0,
          estResolue: true, // Informatif / avertissement
        });
      }

      // 5. CORRESPONDANCE AMBIGUË (Section 6) -> Bloquante
      if (rap.estAmbigu && rap.validation !== 'VALIDE') {
        anomalies.push({
          id: `ano_ambigu_${id}`,
          salarieConcerne: nomSalarie,
          lignePaieId,
          code: 'CORRESPONDANCE_AMBIGUE',
          gravite: 'BLOQUANTE',
          message: rap.explication,
          valeurOriginale: `${rap.score}%`,
          estResolue: false,
        });
      }

      // 6. SALARIÉ NON IDENTIFIÉ (Section 7) -> Bloquante
      if (rap.statut === 'NON_IDENTIFIE' && rap.validation !== 'VALIDE') {
        anomalies.push({
          id: `ano_non_id_${id}`,
          salarieConcerne: nomSalarie,
          lignePaieId,
          code: 'SALARIE_NON_IDENTIFIE',
          gravite: 'BLOQUANTE',
          message: `Salarié non identifié avec certitude (Score: ${rap.score}%). Décision humaine requise (Nouveau ou rattachement).`,
          valeurOriginale: `${rap.score}%`,
          estResolue: false,
        });
      }

      // 7. SALARIÉ SORTI RETRAVAILLANT (Section 13) -> Avertissement
      const estSorti = (salariePropose && salariePropose.situation === 'SORTI') || rap.situationImportee === 'SORTI';
      if (salariePropose && estSorti && (validationJours.joursDeclares ?? joursImp) > 0) {
        const estArbitre = rap.decisionSorti !== undefined;
        anomalies.push({
          id: `ano_sorti_jours_${id}`,
          salarieConcerne: salariePropose.nomComplet,
          lignePaieId,
          code: 'SALARIE_SORTI_AVEC_JOURS',
          gravite: 'AVERTISSEMENT',
          message: `Salarié noté 'SORTI' (so) dans la base CNSS mais ayant ${joursImp} jours travaillés ce mois-ci. Réactivation requise.`,
          valeurOriginale: 'Situation base: SORTI',
          estResolue: estArbitre,
          actionResolution: estArbitre ? (rap.decisionSorti === 'REACTIVATION_CONFIRMEE' ? 'Réactivation confirmée' : 'Maintenu sorti') : undefined,
        });
      }

      // 8. CNI MANQUANTE pour salarié actif à déclarer (Section 7)
      const cniFinale = rap.cniDeclareeFinale || salariePropose?.cni;
      const joursADeclarer = validationJours.joursDeclares ?? joursImp;
      if (joursADeclarer > 0 && !normaliserCni(cniFinale)) {
        anomalies.push({
          id: `ano_cni_${id}`,
          salarieConcerne: nomSalarie,
          lignePaieId,
          code: 'CNI_MANQUANTE',
          gravite: 'AVERTISSEMENT',
          message: `CNI non renseignée pour ce salarié à déclarer. Nécessaire pour la conformité Damancom.`,
          valeurOriginale: 'Non renseignée',
          estResolue: Boolean(rap.cniDeclareeFinale),
        });
      }

      // 9. CNSS MANQUANTE (Section 8)
      const cnssFinale = rap.cnssDeclareeFinale || salariePropose?.immatriculationCnss;
      if (joursADeclarer > 0 && !cnssFinale) {
        const estNouveau = rap.estMarqueNouveau;
        anomalies.push({
          id: `ano_cnss_${id}`,
          salarieConcerne: nomSalarie,
          lignePaieId,
          code: 'CNSS_MANQUANTE',
          gravite: estNouveau ? 'INFO' : 'AVERTISSEMENT',
          message: estNouveau
            ? `Nouveau salarié entrant : immatriculation CNSS à demander auprès de l'agence.`
            : `Numéro d'immatriculation CNSS manquant pour cet ancien salarié.`,
          valeurOriginale: 'Non immatriculé',
          estResolue: Boolean(rap.cnssDeclareeFinale),
        });
      }
    });

    // Prise en compte des anomalies levées manuellement avec justification administrative
    if (anomaliesResoluesManuellement) {
      anomalies.forEach(ano => {
        const override = anomaliesResoluesManuellement[ano.id];
        if (override) {
          ano.estResolue = true;
          ano.justificationResolution = override.justification;
          ano.dateResolution = override.date;
          ano.actionResolution = ano.actionResolution || 'Levée manuellement par dérogation administrative';
        }
      });
    }

    return anomalies;
  },

  /**
   * Validation humaine stricte des jours (Section 1)
   * RÈGLE ABSOLUE : joursImportes n'est JAMAIS altéré
   */
  corrigerJoursHumainement(
    validationActuelle: ValidationJours,
    nouveauxJoursDeclares: number,
    justification: string
  ): ValidationJours {
    return {
      joursImportes: validationActuelle.joursImportes, // INTACT
      joursDeclares: nouveauxJoursDeclares,
      ancienneValeurDeclaree: validationActuelle.joursDeclares,
      modifieManuellement: true,
      validationEffectuee: true,
      justification,
      dateValidation: new Date().toISOString(),
    };
  },

  /**
   * Détection et suivi des sorties (Sections 11, 12, 14, 17)
   * Compare la base connue avec le fichier de paie courant
   */
  identifierSorties(
    baseSalaries: SalarieReferentiel[],
    rapprochements: ResultatRapprochement[],
    decisionsSorties: Record<string, 'SORTIE_CONFIRMEE' | 'MAINTENU_ACTIF'>
  ): SortieItem[] {
    const idsSalariesDeclares = new Set<string>();

    rapprochements.forEach(r => {
      const joursDecl = r.validationJours.joursDeclares ?? r.validationJours.joursImportes;
      if (joursDecl > 0) {
        if (r.salarieBaseId) idsSalariesDeclares.add(r.salarieBaseId);
        if (r.salariePropose?.id) idsSalariesDeclares.add(r.salariePropose.id);
      }
    });

    const sorties: SortieItem[] = [];

    baseSalaries.forEach(sal => {
      if (!idsSalariesDeclares.has(sal.id)) {
        const rapLigne = rapprochements.find(r => r.salarieBaseId === sal.id || r.salariePropose?.id === sal.id);
        const estPointageZero = rapLigne && rapLigne.validationJours.joursImportes === 0;

        let motif = 'Absent du fichier de calcul des salaires';
        if (estPointageZero) {
          motif = 'Présent dans le fichier de paie avec 0 jour ouvré';
        }

        const decision = decisionsSorties[sal.id];
        const statutSortie: SortieItem['statutSortie'] = decision ? decision : 'A_CONFIRMER';

        sorties.push({
          salarieId: sal.id,
          salarie: sal,
          situationPrecedente: sal.situationOriginale || sal.situation || 'ACTIF',
          derniersJours: estPointageZero ? 0 : undefined,
          statutSortie,
          motif,
        });
      }
    });

    return sorties;
  },

  /**
   * CONTRÔLE GLOBAL AVANT DÉCLARATION (Section 18)
   */
  verifierPretPourDeclaration(
    rapprochements: ResultatRapprochement[],
    baseSalaries: SalarieReferentiel[],
    anomalies: AnomalieLigne[]
  ): BilanControlePret {
    const blocages: string[] = [];
    const avertissements: string[] = [];

    // 1. Contrôle des anomalies bloquantes non résolues
    const bloquantes = anomalies.filter(a => a.gravite === 'BLOQUANTE' && !a.estResolue);
    bloquantes.forEach(b => {
      blocages.push(`[${b.code}] ${b.salarieConcerne} : ${b.message}`);
    });

    // 2. Contrôle des cas ambigus non arbitrés
    const ambigusNonResolus = rapprochements.filter(r => r.estAmbigu && r.validation !== 'VALIDE');
    ambigusNonResolus.forEach(r => {
      blocages.push(`Correspondance ambiguë non arbitrée : "${r.lignePaieId}" nécessite un choix parmi les candidats.`);
    });

    // 3. Contrôle des non identifiés sans décision explicite
    const nonIdNonResolus = rapprochements.filter(r => r.statut === 'NON_IDENTIFIE' && r.validation !== 'VALIDE');
    nonIdNonResolus.forEach(r => {
      blocages.push(`Salarié non identifié : "${r.lignePaieId}" doit être confirmé comme Nouveau ou rattaché.`);
    });

    // 4. Contrôle des jours négatifs résiduels
    const joursNegatifs = rapprochements.filter(r => {
      const jd = r.validationJours.joursDeclares ?? r.validationJours.joursImportes;
      return jd < 0;
    });
    joursNegatifs.forEach(r => {
      blocages.push(`Jours déclarés négatifs (${r.validationJours.joursImportes} j) pour "${r.lignePaieId}" non résolus.`);
    });

    // 5. Contrôle des jours supérieurs à 26 résiduels
    const joursSuperieurs26 = rapprochements.filter(r => {
      const jd = r.validationJours.joursDeclares ?? r.validationJours.joursImportes;
      return jd > 26;
    });
    joursSuperieurs26.forEach(r => {
      blocages.push(`Dépassement du plafond légal de 26 jours (${r.validationJours.joursImportes} j) pour "${r.lignePaieId}".`);
    });

    // Avertissements informatifs
    const avs = anomalies.filter(a => a.gravite === 'AVERTISSEMENT' && !a.estResolue);
    avs.forEach(a => {
      avertissements.push(`[${a.code}] ${a.salarieConcerne} : ${a.message}`);
    });

    const estPret = blocages.length === 0;

    return {
      estPret,
      statut: estPret ? 'PRET' : 'NON_PRET',
      blocages,
      avertissements,
      totalBloquantes: blocages.length,
      totalAvertissements: avertissements.length,
    };
  },
};
