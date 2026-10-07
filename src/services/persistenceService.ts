/**
 * Service de persistance locale - PROMPT 03 & PROMPT 04
 * Gère les périodes mensuelles, les salariés référentiels partagés,
 * les alias persistants, les mappings de colonnes, et la traçabilité complète.
 */

import {
  SalarieReferentiel,
  AliasItem,
  StatutPeriode,
  EvenementAudit,
  PeriodeMensuelle,
  ChampMappeType,
  LignePaieImportee,
  ResultatRapprochement,
  LigneRegistreCnss,
  SituationEmploye,
} from '../types/cnss';
import {
  FichierPreetabliCnss,
  RapprochementPreetabli,
  DecisionHumainePreetabli,
} from '../types/cnssPreetabli';
import {
  EntrepriseCnssConfig,
  DocumentBordereauCnss,
} from '../types/cnssBordereau';
import {
  DocumentBordereauPaiementCnss,
  CnssTauxItem,
} from '../types/cnssPaiement';
import { DossierCnssMensuel } from '../types/cnssDossier';
import { normaliserNom, extraireTokensTries, normaliserSituation } from './normalizer';
import { chargerBaseSalariesReelle } from '../data/septembreRealData';

const STORAGE_KEYS = {
  SALARIES: 'cnss_mults_salaries_p4',
  ALIASES: 'cnss_mults_aliases_p4',
  PERIODES: 'cnss_mults_periodes_p4',
  STATUT_PERIODE: 'cnss_mults_statut_periode_p4',
  DECISIONS_SORTIES: 'cnss_mults_decisions_sorties_p4',
  JOURNAL_AUDIT: 'cnss_mults_journal_audit_p4',
  MOIS_ACTIF: 'cnss_mults_mois_actif_p4',
  MAPPINGS_COLONNES: 'cnss_mults_mappings_colonnes_p4',
  ENTREPRISE_CONFIG: 'cnss_mults_entreprise_config_p7b',
  PAIE_PREFIX: 'cnss_mults_paie_lignes_',
  RAPS_PREFIX: 'cnss_mults_rapprochements_',
  REGISTRE_PREFIX: 'cnss_mults_registre_',
  FICHIERS_IMPORTES_PREFIX: 'cnss_mults_fichier_info_',
  PREETABLI_PREFIX: 'cnss_mults_preetabli_',
  PREETABLI_RAPS_PREFIX: 'cnss_mults_preetabli_raps_',
  PREETABLI_DECISIONS_PREFIX: 'cnss_mults_preetabli_decisions_',
  BORDEREAU_PREFIX: 'cnss_mults_bordereau_',
  PAIEMENT_PREFIX: 'cnss_mults_paiement_',
  DOSSIER_PREFIX: 'cnss_mults_dossier_',
  TAUX_CONFIG: 'cnss_mults_taux_config_',
  ANOMALIES_RESOLUES_PREFIX: 'cnss_mults_anomalies_resolues_',
};

export const CONFIG_ENTREPRISE_DEFAUT: EntrepriseCnssConfig = {
  raisonSociale: 'STE MULT.S',
  numeroAffiliation: '6541835',
  agence: 'SIDI BELYOUT',
  adresse: '77 RUE MOHAMED SMIHA ETG 10 N 57',
  ville: 'CASABLANCA',
  codeFormulaireOrdinaires: 'F.212-2-58',
  codeFormulaireEntrants: 'F.212-2-59',
  lignesParPage: 12,
};

// Fallback mémoire
const inMemoryStore = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    // ignore
  }
  return inMemoryStore.get(key) || null;
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch (e) {
    // ignore
  }
  inMemoryStore.set(key, value);
}

function safeRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(key);
      return;
    }
  } catch (e) {
    // ignore
  }
  inMemoryStore.delete(key);
}

export const persistenceService = {
  // =========================================================================
  // GESTION DES PÉRIODES MENSUELLES (Section 1 & 17)
  // =========================================================================

  getPeriodes(): PeriodeMensuelle[] {
    try {
      const data = safeGet(STORAGE_KEYS.PERIODES);
      if (data) return JSON.parse(data);
    } catch (e) {
      // ignore
    }

    // Période initiale par défaut (Septembre 2026 - Période vierge à l'étape 1)
    const periodeInitiale: PeriodeMensuelle = {
      idMois: '2026-09',
      libelle: 'Septembre 2026',
      statut: 'BROUILLON',
      etapeWorkflow: 1, // Étape 1 : Importer
      dateCreation: '2026-09-01T08:00:00.000Z',
      nomFichierPaie: undefined,
      lignesPaieCount: 0,
      salariesDeclaresCount: 0,
    };
    safeSet(STORAGE_KEYS.PERIODES, JSON.stringify([periodeInitiale]));
    return [periodeInitiale];
  },

  savePeriodes(periodes: PeriodeMensuelle[]): void {
    safeSet(STORAGE_KEYS.PERIODES, JSON.stringify(periodes));
  },

  getPeriode(idMois: string): PeriodeMensuelle | undefined {
    return this.getPeriodes().find(p => p.idMois === idMois);
  },

  creerPeriode(idMois: string, libelle: string): { periode: PeriodeMensuelle; estNouvelle: boolean } {
    const list = this.getPeriodes();
    const existante = list.find(p => p.idMois === idMois);
    if (existante) {
      return { periode: existante, estNouvelle: false };
    }

    const nouvelle: PeriodeMensuelle = {
      idMois,
      libelle,
      statut: 'BROUILLON',
      etapeWorkflow: 1, // Étape 1 : Importer
      dateCreation: new Date().toISOString(),
      lignesPaieCount: 0,
      salariesDeclaresCount: 0,
    };

    list.push(nouvelle);
    this.savePeriodes(list);

    // Initialiser les lignes de paie vides pour ce nouveau mois (pas de copie des jours de septembre, Section 17)
    this.saveLignesPaiePeriode(idMois, []);
    this.saveRapprochementsPeriode(idMois, []);

    this.enregistrerEvenementAudit({
      id: `audit_per_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'CREATION_SALARIE',
      salarie: `Période ${libelle}`,
      nouvelleValeur: idMois,
      justification: `Création officielle de la période ${libelle} (Statut BROUILLON)`,
    });

    return { periode: nouvelle, estNouvelle: true };
  },

  updatePeriode(idMois: string, updates: Partial<PeriodeMensuelle>): PeriodeMensuelle | undefined {
    const list = this.getPeriodes();
    const idx = list.findIndex(p => p.idMois === idMois);
    if (idx === -1) return undefined;

    list[idx] = {
      ...list[idx],
      ...updates,
      dateDerniereModification: new Date().toISOString(),
    };
    this.savePeriodes(list);
    return list[idx];
  },

  // =========================================================================
  // DONNÉES PAR PÉRIODE (LIGNES PAIE ET RAPPROCHEMENTS)
  // =========================================================================

  getLignesPaiePeriode(idMois: string): LignePaieImportee[] | null {
    try {
      const data = safeGet(`${STORAGE_KEYS.PAIE_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveLignesPaiePeriode(idMois: string, lignes: LignePaieImportee[]): void {
    safeSet(`${STORAGE_KEYS.PAIE_PREFIX}${idMois}`, JSON.stringify(lignes));
    this.updatePeriode(idMois, { lignesPaieCount: lignes.length });
  },

  getRapprochementsPeriode(idMois: string): ResultatRapprochement[] | null {
    try {
      const data = safeGet(`${STORAGE_KEYS.RAPS_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveRapprochementsPeriode(idMois: string, raps: ResultatRapprochement[]): void {
    safeSet(`${STORAGE_KEYS.RAPS_PREFIX}${idMois}`, JSON.stringify(raps));
  },

  // =========================================================================
  // DOUBLE IMPORT PROTECTION (Section 16)
  // =========================================================================

  verifierDoubleImport(
    idMois: string,
    nomFichier: string,
    taille?: number,
    lignesCount?: number
  ): boolean {
    const info = this.getFichierImporteInfo(idMois);
    if (!info) return false;

    // Détecte si même nom et même taille ou même nom de fichier sur la même période
    if (info.nomFichier.toLowerCase() === nomFichier.toLowerCase()) {
      if (taille && info.taille && info.taille === taille) return true;
      if (lignesCount && info.lignesCount && info.lignesCount === lignesCount) return true;
      return true;
    }
    return false;
  },

  getFichierImporteInfo(idMois: string): { nomFichier: string; taille?: number; lignesCount?: number; dateImport: string } | null {
    try {
      const data = safeGet(`${STORAGE_KEYS.FICHIERS_IMPORTES_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  enregistrerFichierImporte(idMois: string, nomFichier: string, taille?: number, lignesCount?: number): void {
    safeSet(
      `${STORAGE_KEYS.FICHIERS_IMPORTES_PREFIX}${idMois}`,
      JSON.stringify({
        nomFichier,
        taille,
        lignesCount,
        dateImport: new Date().toISOString(),
      })
    );
  },

  // =========================================================================
  // MAPPINGS DE COLONNES PERSISTANTS (Section 5)
  // =========================================================================

  getMappingsColonnes(): Record<string, ChampMappeType> {
    try {
      const data = safeGet(STORAGE_KEYS.MAPPINGS_COLONNES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  saveMappingColonne(colonneSource: string, champCible: ChampMappeType): void {
    const mappings = this.getMappingsColonnes();
    mappings[colonneSource.trim().toUpperCase()] = champCible;
    safeSet(STORAGE_KEYS.MAPPINGS_COLONNES, JSON.stringify(mappings));
  },

  // =========================================================================
  // BASE SALARIÉS RÉFÉRENTIELLE (PARTAGÉE TOUS MOIS)
  // =========================================================================

  getSalaries(): SalarieReferentiel[] {
    try {
      const data = safeGet(STORAGE_KEYS.SALARIES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveSalaries(salaries: SalarieReferentiel[]): void {
    safeSet(STORAGE_KEYS.SALARIES, JSON.stringify(salaries));
  },

  modifierStatutSalarie(
    salarieId: string,
    nouveauStatut: SituationEmploye,
    options: {
      monthId?: string;
      motif?: string;
      utilisateur?: string;
    } = {}
  ): { salarie: SalarieReferentiel; auditEvent: EvenementAudit } {
    const list = this.getSalaries();
    const idx = list.findIndex(s => s.id === salarieId);
    let salarie: SalarieReferentiel;
    let ancienStatut = 'ACTIF';

    if (idx !== -1) {
      ancienStatut = list[idx].situation || 'ACTIF';
      list[idx] = {
        ...list[idx],
        situation: nouveauStatut,
        actif: nouveauStatut === 'ACTIF',
      };
      salarie = list[idx];
      this.saveSalaries(list);
    } else {
      salarie = {
        id: salarieId,
        nomComplet: salarieId,
        nomNormalise: salarieId,
        tokensNom: [],
        aliases: [],
        situation: nouveauStatut,
        actif: nouveauStatut === 'ACTIF',
      };
      list.push(salarie);
      this.saveSalaries(list);
    }

    if (ancienStatut === 'SORTI' && nouveauStatut === 'ACTIF') {
      this.enregistrerDecisionSortie(
        salarieId,
        salarie.nomComplet,
        'MAINTENU_ACTIF',
        options.motif || 'Réactivation manuelle du salarié'
      );
    } else if (nouveauStatut === 'SORTI') {
      this.enregistrerDecisionSortie(
        salarieId,
        salarie.nomComplet,
        'SORTIE_CONFIRMEE',
        options.motif || 'Sortie manuelle du salarié'
      );
    }

    const auditEvent: EvenementAudit = {
      id: `audit_statut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString(),
      action: ancienStatut === 'SORTI' && nouveauStatut === 'ACTIF' ? 'ARBITRAGE_REACTIVATION_SORTI' : 'MODIFICATION_STATUT_SALARIE',
      salarie: salarie.nomComplet,
      ancienneValeur: ancienStatut,
      nouvelleValeur: nouveauStatut,
      periodeConcernee: options.monthId || '2026-09',
      utilisateur: options.utilisateur || 'Gestionnaire MULT.S',
      justification: options.motif || `Modification manuelle du statut : ${ancienStatut} ➔ ${nouveauStatut}`,
    };

    this.enregistrerEvenementAudit(auditEvent);
    return { salarie, auditEvent };
  },

  creerNouveauSalarieReferentiel(donnees: {
    nomComplet: string;
    cni?: string;
    immatriculationCnss?: string;
    situation?: SituationEmploye | string;
    situationOriginale?: string;
    datePremiereApparition?: string;
  }): { salarie: SalarieReferentiel; estNouveau: boolean; doublonDetecte?: SalarieReferentiel } {
    const salaries = this.getSalaries();
    const nomNormalise = normaliserNom(donnees.nomComplet);
    const tokens = extraireTokensTries(donnees.nomComplet);
    const sitNorm = donnees.situation ? normaliserSituation(donnees.situation) : 'ACTIF';

    const doublon = salaries.find(s => {
      if (s.nomNormalise === nomNormalise) return true;
      if (donnees.cni && s.cni && s.cni.trim().toUpperCase() === donnees.cni.trim().toUpperCase()) return true;
      if (donnees.immatriculationCnss && s.immatriculationCnss && s.immatriculationCnss === donnees.immatriculationCnss) return true;
      return false;
    });

    if (doublon) {
      if (donnees.situation) {
        doublon.situation = sitNorm;
        doublon.situationOriginale = donnees.situationOriginale || String(donnees.situation);
        doublon.actif = sitNorm === 'ACTIF';
        this.saveSalaries(salaries);
      }
      return { salarie: doublon, estNouveau: false, doublonDetecte: doublon };
    }

    const permanentId = `sal_ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nouveauSalarie: SalarieReferentiel = {
      id: permanentId,
      nomComplet: donnees.nomComplet.trim().toUpperCase(),
      nomNormalise,
      tokensNom: tokens,
      cni: donnees.cni?.trim().toUpperCase(),
      immatriculationCnss: donnees.immatriculationCnss?.trim(),
      situation: sitNorm,
      situationOriginale: donnees.situationOriginale || (donnees.situation ? String(donnees.situation) : undefined),
      actif: sitNorm === 'ACTIF',
      datePremiereApparition: donnees.datePremiereApparition || new Date().toISOString(),
      aliases: [],
    };

    salaries.push(nouveauSalarie);
    this.saveSalaries(salaries);

    this.enregistrerEvenementAudit({
      id: `audit_crea_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'CREATION_SALARIE',
      salarie: nouveauSalarie.nomComplet,
      nouvelleValeur: `ID: ${permanentId}, CNI: ${nouveauSalarie.cni || '-'}, CNSS: ${nouveauSalarie.immatriculationCnss || '-'}`,
      justification: "Ajout formel d'un nouveau salarié entrant à la base de référence",
    });

    return { salarie: nouveauSalarie, estNouveau: true };
  },

  // =========================================================================
  // ALIAS PERSISTANTS (PARTAGÉS TOUS MOIS)
  // =========================================================================

  getAliases(): AliasItem[] {
    try {
      const data = safeGet(STORAGE_KEYS.ALIASES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveAliases(aliases: AliasItem[]): void {
    safeSet(STORAGE_KEYS.ALIASES, JSON.stringify(aliases));
  },

  ajouterAlias(alias: Omit<AliasItem, 'id' | 'dateCreation' | 'aliasNormalise'>): AliasItem {
    const list = this.getAliases();
    const aliasNormalise = normaliserNom(alias.aliasBrut);

    const existantIdx = list.findIndex(a => a.aliasNormalise === aliasNormalise);
    const nouvelAlias: AliasItem = {
      ...alias,
      id: existantIdx >= 0 ? list[existantIdx].id : `alias_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      aliasNormalise,
      dateCreation: new Date().toISOString(),
    };

    if (existantIdx >= 0) {
      list[existantIdx] = nouvelAlias;
    } else {
      list.push(nouvelAlias);
    }

    this.saveAliases(list);

    this.enregistrerEvenementAudit({
      id: `audit_alias_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'CREATION_ALIAS',
      salarie: alias.nomOfficielSalarie,
      nouvelleValeur: `Alias: "${alias.aliasBrut}" lié à ID: ${alias.salarieId}`,
      justification: "Mémorisation d'une variante de nom validée pour les mois suivants",
    });

    return nouvelAlias;
  },

  supprimerAlias(id: string): void {
    const list = this.getAliases().filter(a => a.id !== id);
    this.saveAliases(list);
  },

  trouverAlias(nomBrut: string): AliasItem | undefined {
    const norm = normaliserNom(nomBrut);
    return this.getAliases().find(a => a.aliasNormalise === norm);
  },

  // =========================================================================
  // DÉCISIONS DE SORTIES
  // =========================================================================

  getDecisionsSorties(): Record<string, 'SORTIE_CONFIRMEE' | 'MAINTENU_ACTIF'> {
    try {
      const data = safeGet(STORAGE_KEYS.DECISIONS_SORTIES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  saveDecisionsSorties(decisions: Record<string, 'SORTIE_CONFIRMEE' | 'MAINTENU_ACTIF'>): void {
    safeSet(STORAGE_KEYS.DECISIONS_SORTIES, JSON.stringify(decisions));
  },

  enregistrerDecisionSortie(
    salarieId: string,
    nomSalarie: string,
    decision: 'SORTIE_CONFIRMEE' | 'MAINTENU_ACTIF',
    justification?: string
  ): void {
    const decs = this.getDecisionsSorties();
    const ancienne = decs[salarieId];
    decs[salarieId] = decision;
    this.saveDecisionsSorties(decs);

    this.enregistrerEvenementAudit({
      id: `audit_sort_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'CONFIRMATION_SORTIE',
      salarie: nomSalarie,
      ancienneValeur: ancienne,
      nouvelleValeur: decision,
      justification: justification || (decision === 'SORTIE_CONFIRMEE' ? 'Sortie validée par le gestionnaire' : 'Maintien du salarié actif dans le référentiel'),
    });
  },

  // =========================================================================
  // STATUT DE PÉRIODE & CLÔTURE
  // =========================================================================

  getStatutPeriode(idMois = '2026-09'): StatutPeriode {
    const p = this.getPeriode(idMois);
    return p ? p.statut : 'BROUILLON';
  },

  setStatutPeriode(idMois: string, statut: StatutPeriode, justification?: string): void {
    const p = this.getPeriode(idMois);
    const ancien = p ? p.statut : 'BROUILLON';
    this.updatePeriode(idMois, { statut, justificationCloture: justification });

    this.enregistrerEvenementAudit({
      id: `audit_statut_${Date.now()}`,
      date: new Date().toISOString(),
      action: statut === 'CLOTURE' ? 'CLOTURE_MOIS' : statut === 'BROUILLON' && ancien === 'CLOTURE' ? 'REOUVERTURE_MOIS' : 'VALIDATION_CORRESPONDANCE',
      salarie: `Période ${idMois}`,
      ancienneValeur: ancien,
      nouvelleValeur: statut,
      justification: justification || `Changement du statut de la période vers ${statut}`,
    });
  },

  updateStatutPeriode(idMois: string, statut: StatutPeriode, justification?: string): void {
    this.setStatutPeriode(idMois, statut, justification);
  },

  // =========================================================================
  // REGISTRE CNSS MENSUEL (PROMPT 06)
  // =========================================================================

  getRegistrePeriode(idMois: string): LigneRegistreCnss[] {
    try {
      const data = safeGet(`${STORAGE_KEYS.REGISTRE_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveRegistrePeriode(idMois: string, registre: LigneRegistreCnss[]): void {
    safeSet(`${STORAGE_KEYS.REGISTRE_PREFIX}${idMois}`, JSON.stringify(registre));
  },

  mettreAJourLigneRegistre(idMois: string, ligne: LigneRegistreCnss): void {
    const list = this.getRegistrePeriode(idMois);
    const index = list.findIndex(l => l.id === ligne.id);
    if (index >= 0) {
      list[index] = ligne;
    } else {
      list.push(ligne);
    }
    this.saveRegistrePeriode(idMois, list);
  },

  // =========================================================================
  // FICHIER PRÉÉTABLI CNSS & RAPPROCHEMENTS (PROMPT 07-BIS)
  // =========================================================================

  getFichierPreetabli(idMois: string): FichierPreetabliCnss | null {
    try {
      const data = safeGet(`${STORAGE_KEYS.PREETABLI_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveFichierPreetabli(idMois: string, fichier: FichierPreetabliCnss): void {
    safeSet(`${STORAGE_KEYS.PREETABLI_PREFIX}${idMois}`, JSON.stringify(fichier));
  },

  deleteFichierPreetabli(idMois: string): void {
    safeRemove(`${STORAGE_KEYS.PREETABLI_PREFIX}${idMois}`);
    safeRemove(`${STORAGE_KEYS.PREETABLI_RAPS_PREFIX}${idMois}`);
    safeRemove(`${STORAGE_KEYS.PREETABLI_DECISIONS_PREFIX}${idMois}`);
  },

  getRapprochementsPreetabli(idMois: string): RapprochementPreetabli[] {
    try {
      const data = safeGet(`${STORAGE_KEYS.PREETABLI_RAPS_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveRapprochementsPreetabli(idMois: string, raps: RapprochementPreetabli[]): void {
    safeSet(`${STORAGE_KEYS.PREETABLI_RAPS_PREFIX}${idMois}`, JSON.stringify(raps));
  },

  getDecisionsPreetabli(idMois: string): Record<string, DecisionHumainePreetabli> {
    try {
      const data = safeGet(`${STORAGE_KEYS.PREETABLI_DECISIONS_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  saveDecisionPreetabli(idMois: string, ligneId: string, decision: DecisionHumainePreetabli): void {
    const decs = this.getDecisionsPreetabli(idMois);
    decs[ligneId] = decision;
    safeSet(`${STORAGE_KEYS.PREETABLI_DECISIONS_PREFIX}${idMois}`, JSON.stringify(decs));
  },

  // =========================================================================
  // BORDEREAU DE DÉCLARATION CNSS (PROMPT 07-B)
  // =========================================================================

  getEntrepriseConfig(): EntrepriseCnssConfig {
    try {
      const data = safeGet(STORAGE_KEYS.ENTREPRISE_CONFIG);
      if (data) {
        return { ...CONFIG_ENTREPRISE_DEFAUT, ...JSON.parse(data) };
      }
    } catch (e) {
      // fallback
    }
    return { ...CONFIG_ENTREPRISE_DEFAUT };
  },

  saveEntrepriseConfig(config: EntrepriseCnssConfig): void {
    safeSet(STORAGE_KEYS.ENTREPRISE_CONFIG, JSON.stringify(config));
  },

  getBordereauPeriode(idMois: string): DocumentBordereauCnss | null {
    try {
      const data = safeGet(`${STORAGE_KEYS.BORDEREAU_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveBordereauPeriode(idMois: string, doc: DocumentBordereauCnss): void {
    safeSet(`${STORAGE_KEYS.BORDEREAU_PREFIX}${idMois}`, JSON.stringify(doc));
  },

  supprimerBordereauPeriode(idMois: string): void {
    safeRemove(`${STORAGE_KEYS.BORDEREAU_PREFIX}${idMois}`);
  },

  // =========================================================================
  // BORDEREAU DE PAIEMENT DES COTISATIONS (PROMPT 08)
  // =========================================================================

  getPaiementPeriode(idMois: string): DocumentBordereauPaiementCnss | null {
    try {
      const data = safeGet(`${STORAGE_KEYS.PAIEMENT_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  savePaiementPeriode(idMois: string, doc: DocumentBordereauPaiementCnss): void {
    safeSet(`${STORAGE_KEYS.PAIEMENT_PREFIX}${idMois}`, JSON.stringify(doc));
  },

  supprimerPaiementPeriode(idMois: string): void {
    safeRemove(`${STORAGE_KEYS.PAIEMENT_PREFIX}${idMois}`);
  },

  getTauxConfig(): CnssTauxItem[] | null {
    try {
      const data = safeGet(STORAGE_KEYS.TAUX_CONFIG);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveTauxConfig(taux: CnssTauxItem[]): void {
    safeSet(STORAGE_KEYS.TAUX_CONFIG, JSON.stringify(taux));
  },

  // =========================================================================
  // DOSSIER CNSS MENSUEL (PROMPT 09)
  // =========================================================================

  getDossierPeriode(idMois: string): DossierCnssMensuel | null {
    try {
      const data = safeGet(`${STORAGE_KEYS.DOSSIER_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveDossierPeriode(idMois: string, dossier: DossierCnssMensuel): void {
    safeSet(`${STORAGE_KEYS.DOSSIER_PREFIX}${idMois}`, JSON.stringify(dossier));
  },

  supprimerDossierPeriode(idMois: string): void {
    safeRemove(`${STORAGE_KEYS.DOSSIER_PREFIX}${idMois}`);
  },

  // =========================================================================
  // JOURNAL D'AUDIT GLOBAL
  // =========================================================================

  getJournalAudit(): EvenementAudit[] {
    try {
      const data = safeGet(STORAGE_KEYS.JOURNAL_AUDIT);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  enregistrerEvenementAudit(evt: EvenementAudit): void {
    const list = this.getJournalAudit();
    list.unshift(evt);
    if (list.length > 200) list.pop();
    safeSet(STORAGE_KEYS.JOURNAL_AUDIT, JSON.stringify(list));
  },

  saveJournalAudit(list: EvenementAudit[]): void {
    safeSet(STORAGE_KEYS.JOURNAL_AUDIT, JSON.stringify(list));
  },

  getMoisActif(): string {
    const m = safeGet(STORAGE_KEYS.MOIS_ACTIF);
    return m || '2026-09';
  },

  setMoisActif(mois: string): void {
    safeSet(STORAGE_KEYS.MOIS_ACTIF, mois);
  },

  getAnomaliesResoluesManuellement(idMois: string): Record<string, { justification: string; date: string }> {
    try {
      const data = safeGet(`${STORAGE_KEYS.ANOMALIES_RESOLUES_PREFIX}${idMois}`);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  saveAnomalieResolueManuellement(idMois: string, anomalieId: string, justification: string): void {
    const list = this.getAnomaliesResoluesManuellement(idMois);
    list[anomalieId] = {
      justification,
      date: new Date().toISOString(),
    };
    safeSet(`${STORAGE_KEYS.ANOMALIES_RESOLUES_PREFIX}${idMois}`, JSON.stringify(list));
  },

  /**
   * Réinitialisation intégrale des données de travail.
   * Supprime toutes les données (paies, rapprochements, registres, préétablis,
   * bordereaux, paiements, dossiers, alias, décisions, anomalies)
   * SAUF la base des salariés de la CNSS (77 salariés de référence).
   */
  reinitialiserToutSaufBaseCnss(): { baseSalariesCount: number } {
    // 1. Conserver ou réinitialiser la base officielle des salariés CNSS
    let salaries = this.getSalaries();
    if (!salaries || salaries.length === 0) {
      salaries = chargerBaseSalariesReelle();
    }
    safeSet(STORAGE_KEYS.SALARIES, JSON.stringify(salaries));

    // 2. Réinitialiser la configuration entreprise par défaut
    safeSet(STORAGE_KEYS.ENTREPRISE_CONFIG, JSON.stringify(CONFIG_ENTREPRISE_DEFAUT));

    // 3. Réinitialiser la période à Septembre 2026 vierge (étape 1, 0 lignes)
    const periodeInitiale: PeriodeMensuelle = {
      idMois: '2026-09',
      libelle: 'Septembre 2026',
      statut: 'BROUILLON',
      etapeWorkflow: 1,
      dateCreation: new Date().toISOString(),
      nomFichierPaie: undefined,
      lignesPaieCount: 0,
      salariesDeclaresCount: 0,
    };
    safeSet(STORAGE_KEYS.PERIODES, JSON.stringify([periodeInitiale]));
    safeSet(STORAGE_KEYS.MOIS_ACTIF, '2026-09');

    // 4. Vider les alias et décisions de sorties et mappings
    safeSet(STORAGE_KEYS.ALIASES, JSON.stringify([]));
    safeSet(STORAGE_KEYS.DECISIONS_SORTIES, JSON.stringify({}));
    safeSet(STORAGE_KEYS.MAPPINGS_COLONNES, JSON.stringify({}));

    // 5. Initialiser un journal d'audit propre
    const auditInit: EvenementAudit = {
      id: `audit_reset_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'CREATION_SALARIE',
      salarie: 'Base CNSS MULT.S',
      nouvelleValeur: `${salaries.length} salariés référentiels`,
      justification: 'Réinitialisation générale des données — Conservation stricte de la base des salariés de la CNSS',
    };
    safeSet(STORAGE_KEYS.JOURNAL_AUDIT, JSON.stringify([auditInit]));

    // 6. Nettoyer toutes les clés dynamiques de paie, raps, registres, bordereaux, préétablis, etc.
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const clesASupprimer: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (
            k &&
            k.startsWith('cnss_mults_') &&
            k !== STORAGE_KEYS.SALARIES &&
            k !== STORAGE_KEYS.ENTREPRISE_CONFIG &&
            k !== STORAGE_KEYS.PERIODES &&
            k !== STORAGE_KEYS.MOIS_ACTIF &&
            k !== STORAGE_KEYS.ALIASES &&
            k !== STORAGE_KEYS.DECISIONS_SORTIES &&
            k !== STORAGE_KEYS.MAPPINGS_COLONNES &&
            k !== STORAGE_KEYS.JOURNAL_AUDIT
          ) {
            clesASupprimer.push(k);
          }
        }
        clesASupprimer.forEach(k => window.localStorage.removeItem(k));
      }
    } catch (e) {
      // ignore
    }

    for (const k of Array.from(inMemoryStore.keys())) {
      if (
        k.startsWith('cnss_mults_') &&
        k !== STORAGE_KEYS.SALARIES &&
        k !== STORAGE_KEYS.ENTREPRISE_CONFIG &&
        k !== STORAGE_KEYS.PERIODES &&
        k !== STORAGE_KEYS.MOIS_ACTIF &&
        k !== STORAGE_KEYS.ALIASES &&
        k !== STORAGE_KEYS.DECISIONS_SORTIES &&
        k !== STORAGE_KEYS.MAPPINGS_COLONNES &&
        k !== STORAGE_KEYS.JOURNAL_AUDIT
      ) {
        inMemoryStore.delete(k);
      }
    }

    return { baseSalariesCount: salaries.length };
  },

  clearAll(): void {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith('cnss_mults_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => window.localStorage.removeItem(k));
      }
    } catch (e) {
      // ignore
    }
    inMemoryStore.clear();
  },
};
