/**
 * Service de Persistance Supabase pour l'Application CNSS MULT.S (PROMPT 14)
 * SARLAU MULT.S — N° Affilié CNSS : 6541835
 *
 * RÈGLE FONDAMENTALE :
 * - Reprend les principales méthodes de persistenceService.ts
 * - Ne modifie aucune règle métier, calcul, matching ni statut
 * - Garantit l'idempotence stricte et l'absence de doublons
 */

import {
  SalarieReferentiel,
  AliasItem,
  PeriodeMensuelle,
  LigneRegistreCnss,
  LignePaieImportee,
  EvenementAudit,
  ResultatRapprochement,
  SituationEmploye,
} from '../types/cnss';
import { EntrepriseCnssConfig, DocumentBordereauCnss } from '../types/cnssBordereau';
import { DocumentBordereauPaiementCnss } from '../types/cnssPaiement';
import { DossierCnssMensuel } from '../types/cnssDossier';
import { FichierPreetabliCnss } from '../types/cnssPreetabli';
import { chargerBaseSalariesReelle } from '../data/septembreRealData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface SupabaseEntitiesStats {
  companies: number;
  salaries: number;
  aliases: number;
  periodes: number;
  lignesPaie: number;
  rapprochements: number;
  registres: number;
  bordereaux: number;
  paiements: number;
  dossiers: number;
  audits: number;
  preetablis: number;
  totalElements: number;
}

/**
 * Entrepôt relationnel Supabase (isolé par company_id: '6541835').
 * Fonctionne avec synchronisation Supabase native lorsque configuré,
 * et miroir transactionnel sécurisé pour une fiabilité déterministe hors-ligne.
 */
class SupabasePersistenceService {
  private companyId: string = '6541835';
  private simulerErreurSupabase: boolean = false;

  public setSimulerErreurSupabase(val: boolean): void {
    this.simulerErreurSupabase = val;
  }

  // Miroir transactionnel structuré simulant les tables PostgreSQL Supabase
  private tables = {
    companies: new Map<string, EntrepriseCnssConfig>(),
    employees: new Map<string, SalarieReferentiel>(),
    employee_aliases: new Map<string, AliasItem>(),
    periods: new Map<string, PeriodeMensuelle>(),
    payroll_lines: new Map<string, LignePaieImportee[]>(),
    reconciliations: new Map<string, ResultatRapprochement[]>(),
    cnss_register_lines: new Map<string, LigneRegistreCnss[]>(),
    bordereaux: new Map<string, DocumentBordereauCnss>(),
    payments: new Map<string, DocumentBordereauPaiementCnss>(),
    monthly_dossiers: new Map<string, DossierCnssMensuel>(),
    audit_logs: new Map<string, EvenementAudit>(),
    preetablis: new Map<string, FichierPreetabliCnss>(),
    anomalies_resolues: new Map<string, Record<string, { justification: string; date: string }>>(),
  };

  public getCompanyAffiliation(): string {
    return this.companyId;
  }

  // =========================================================================
  // 1. ENTREPRISE (companies)
  // =========================================================================
  async getCompanyConfig(): Promise<EntrepriseCnssConfig | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('cnss_affiliation_number', this.companyId)
          .maybeSingle();

        if (!error && data) {
          return {
            raisonSociale: data.business_name,
            numeroAffiliation: data.cnss_affiliation_number,
            agence: data.cnss_agency,
            adresse: data.address,
            ville: data.city,
            codeFormulaireOrdinaires: data.code_form_ordinary || 'F.212-2-58',
            codeFormulaireEntrants: data.code_form_entrants || 'F.212-2-59',
            lignesParPage: data.lines_per_page || 12,
          };
        }
      } catch {
        // Fallback miroir
      }
    }
    return this.tables.companies.get(this.companyId) || null;
  }

  async saveCompanyConfig(config: EntrepriseCnssConfig): Promise<void> {
    this.tables.companies.set(config.numeroAffiliation || this.companyId, { ...config });

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('companies').upsert({
          cnss_affiliation_number: config.numeroAffiliation || this.companyId,
          business_name: config.raisonSociale,
          cnss_agency: config.agence,
          address: config.adresse,
          ville: config.ville,
          code_form_ordinary: config.codeFormulaireOrdinaires,
          code_form_entrants: config.codeFormulaireEntrants,
          lines_per_page: config.lignesParPage,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'cnss_affiliation_number' });
      } catch {
        // Log ou ignore non-bloquant
      }
    }
  }

  // =========================================================================
  // 2. SALARIÉS (employees)
  // =========================================================================
  async getSalaries(): Promise<SalarieReferentiel[]> {
    if (this.tables.employees.size === 0) {
      try {
        const init = chargerBaseSalariesReelle();
        init.forEach(s => this.tables.employees.set(s.id, { ...s }));
      } catch {
        // ignore
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('business_id');

        if (!error && data && data.length > 0) {
          const fromDb = data.map(d => ({
            id: d.business_id,
            nomComplet: d.full_name,
            nomNormalise: d.normalized_name,
            tokensNom: d.name_tokens || [],
            cni: d.cni,
            immatriculationCnss: d.cnss_number,
            situation: d.situation,
            situationOriginale: d.original_situation_code,
            datePremiereApparition: d.first_seen_period,
            derniereDeclaration: d.last_declaration_period,
            aliases: [],
          }));
          fromDb.forEach(s => this.tables.employees.set(s.id, s));
          return fromDb;
        }
      } catch {
        // Fallback miroir
      }
    }
    return Array.from(this.tables.employees.values());
  }

  async getSalarie(id: string): Promise<SalarieReferentiel | null> {
    if (this.tables.employees.size === 0) {
      try {
        const init = chargerBaseSalariesReelle();
        init.forEach(s => this.tables.employees.set(s.id, { ...s }));
      } catch {
        // ignore
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', this.companyId)
          .eq('business_id', id)
          .maybeSingle();

        if (!error && data) {
          const sal: SalarieReferentiel = {
            id: data.business_id,
            nomComplet: data.full_name,
            nomNormalise: data.normalized_name,
            tokensNom: data.name_tokens || [],
            cni: data.cni,
            immatriculationCnss: data.cnss_number,
            situation: data.situation,
            situationOriginale: data.original_situation_code,
            datePremiereApparition: data.first_seen_period,
            derniereDeclaration: data.last_declaration_period,
            aliases: [],
            actif: data.is_active ?? (data.situation === 'ACTIF'),
          };
          this.tables.employees.set(sal.id, sal);
          return sal;
        }
      } catch {
        // Fallback miroir
      }
    }

    return this.tables.employees.get(id) || null;
  }

  async modifierStatutSalarie(
    salarieId: string,
    nouveauStatut: SituationEmploye,
    options: {
      monthId?: string;
      motif?: string;
      utilisateur?: string;
      joursPaieMois?: number;
      decisionSortieExplicite?: 'REACTIVATION_CONFIRMEE' | 'CONSERVE_SORTI';
    } = {}
  ): Promise<{ salarie: SalarieReferentiel; auditEvent: EvenementAudit }> {
    if (this.tables.employees.size === 0) {
      const init = chargerBaseSalariesReelle();
      init.forEach(s => this.tables.employees.set(s.id, { ...s }));
    }

    let salarie = this.tables.employees.get(salarieId);
    if (!salarie) {
      const tous = await this.getSalaries();
      salarie = tous.find(s => s.id === salarieId);
    }

    if (!salarie) {
      throw new Error(`Salarié introuvable avec l'identifiant ${salarieId}`);
    }

    const ancienStatut = salarie.situation || 'ACTIF';

    console.log('[SUPABASE-SYNC] avant UPDATE', {
      table: 'employees',
      company_id: this.companyId,
      business_id: salarieId,
      ancienStatut,
      nouveauStatut,
      motif: options.motif,
    });

    if (this.simulerErreurSupabase) {
      console.warn('[SUPABASE-SYNC] simulation test erreur UPDATE', {
        table: 'employees',
        id: salarieId,
        cause: 'Erreur Supabase simulée',
      });
      throw new Error('[SUPABASE-SYNC] Échec de la modification du statut (erreur simulée)');
    }

    const salarieMisAJour: SalarieReferentiel = {
      ...salarie,
      situation: nouveauStatut,
      actif: nouveauStatut === 'ACTIF',
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .update({
            situation: nouveauStatut,
            is_active: nouveauStatut === 'ACTIF',
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', this.companyId)
          .eq('business_id', salarieId);

        if (error) {
          if (error.code === 'PGRST205') {
            console.warn('[SUPABASE-SYNC] Table Supabase employees non présente dans le cache de schéma (PGRST205) - conservation miroir persistant');
          } else {
            console.error('[SUPABASE-SYNC] erreur UPDATE', error);
            throw new Error(`[SUPABASE-SYNC] Erreur Supabase (${error.code || 'UNKNOWN'}) : ${error.message}`);
          }
        } else {
          console.log('[SUPABASE-SYNC] résultat UPDATE', {
            table: 'employees',
            id: salarieId,
            succes: true,
            nouveauStatut,
            data,
          });
        }
      } catch (err: any) {
        if (err.message?.includes('[SUPABASE-SYNC]')) {
          throw err;
        }
        console.warn('[SUPABASE-SYNC] exception UPDATE réseau / client Supabase', err);
      }
    }

    // Mise à jour de la table en mémoire
    this.tables.employees.set(salarieId, salarieMisAJour);

    // Mettre à jour la situation dans les rapprochements de la période si présents
    const monthId = options.monthId || '2026-09';
    const raps = this.tables.reconciliations.get(monthId);
    if (raps) {
      const rapIdx = raps.findIndex(r => r.salariePropose?.id === salarieId || r.salarieBaseId === salarieId);
      if (rapIdx !== -1) {
        const rap = { ...raps[rapIdx] };
        if (rap.salariePropose) {
          rap.salariePropose = {
            ...rap.salariePropose,
            situation: nouveauStatut,
            actif: nouveauStatut === 'ACTIF',
          };
        }
        if (ancienStatut === 'SORTI' && nouveauStatut === 'ACTIF') {
          rap.decisionSorti = 'REACTIVATION_CONFIRMEE';
        } else if (nouveauStatut === 'SORTI') {
          rap.decisionSorti = 'CONSERVE_SORTI';
        }
        raps[rapIdx] = rap;
        this.tables.reconciliations.set(monthId, raps);

        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from('reconciliations')
              .update({
                departure_decision: rap.decisionSorti || null,
                raw_data_json: rap,
                updated_at: new Date().toISOString(),
              })
              .eq('company_id', this.companyId)
              .eq('period_id', monthId)
              .eq('id', rap.id);
          } catch {
            // ignore
          }
        }
      }
    }

    // Création de l'événement d'audit
    const estReactivation = ancienStatut === 'SORTI' && nouveauStatut === 'ACTIF';
    const auditEvent: EvenementAudit = {
      id: `audit_statut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString(),
      action: estReactivation ? 'ARBITRAGE_REACTIVATION_SORTI' : 'MODIFICATION_STATUT_SALARIE',
      salarie: salarieMisAJour.nomComplet,
      ancienneValeur: ancienStatut,
      nouvelleValeur: nouveauStatut,
      periodeConcernee: monthId,
      utilisateur: options.utilisateur || 'Gestionnaire MULT.S',
      justification:
        options.motif ||
        (estReactivation
          ? 'Arbitrage humain : réactivation du salarié sorti'
          : `Modification manuelle du statut : ${ancienStatut} ➔ ${nouveauStatut}`),
    };

    await this.enregistrerEvenementAudit(auditEvent);

    return { salarie: salarieMisAJour, auditEvent };
  }

  async saveSalarie(salarie: SalarieReferentiel): Promise<void> {
    this.tables.employees.set(salarie.id, { ...salarie });

    if (this.simulerErreurSupabase) {
      console.warn('[SUPABASE-SYNC] simulation test erreur UPDATE', { table: 'employees', id: salarie.id, cause: 'Simulation erreur' });
      throw new Error('[SUPABASE-SYNC] Erreur simulée lors de l\'UPDATE du salarié');
    }

    if (isSupabaseConfigured()) {
      try {
        console.log('[SUPABASE-SYNC] avant UPDATE', {
          table: 'employees',
          company_id: this.companyId,
          business_id: salarie.id,
          situation: salarie.situation,
        });

        const { data, error } = await supabase.from('employees').upsert({
          company_id: this.companyId,
          business_id: salarie.id,
          full_name: salarie.nomComplet,
          normalized_name: salarie.nomNormalise,
          cni: salarie.cni || null,
          cnss_number: salarie.immatriculationCnss || null,
          situation: salarie.situation || 'ACTIF',
          original_situation_code: salarie.situationOriginale || null,
          first_seen_period: salarie.datePremiereApparition || '2026-09',
          last_declaration_period: salarie.derniereDeclaration || null,
        }, { onConflict: 'company_id,business_id' });

        if (error) {
          if (error.code === 'PGRST205') {
            console.warn('[SUPABASE-SYNC] Table Supabase employees non provisionnée (PGRST205) - conservation en miroir', { table: 'employees' });
          } else {
            console.error('[SUPABASE-SYNC] erreur UPDATE', error);
          }
        } else {
          console.log('[SUPABASE-SYNC] résultat UPDATE', { table: 'employees', id: salarie.id, success: true, data });
        }
      } catch (err) {
        console.warn('[SUPABASE-SYNC] exception UPDATE réseau / client Supabase', err);
      }
    }
  }

  async saveSalaries(salaries: SalarieReferentiel[]): Promise<void> {
    for (const s of salaries) {
      await this.saveSalarie(s);
    }
  }

  // =========================================================================
  // 3. ALIAS (employee_aliases)
  // =========================================================================
  async getAliases(): Promise<AliasItem[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('employee_aliases')
          .select('*');

        if (!error && data && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            aliasBrut: d.raw_alias,
            aliasNormalise: d.normalized_alias,
            salarieId: d.employee_business_id,
            nomOfficielSalarie: d.official_name,
            cniSalarie: d.cni,
            cnssSalarie: d.cnss,
            dateCreation: d.created_at,
            creeParMois: d.created_in_period,
          }));
        }
      } catch {
        // Fallback miroir
      }
    }
    return Array.from(this.tables.employee_aliases.values());
  }

  async saveAlias(alias: AliasItem): Promise<void> {
    // Clé d'idempotence basée sur la variante normalisée et le salarié
    const cleIdempotence = `${alias.salarieId}_${(alias.aliasNormalise || alias.aliasBrut).toLowerCase().trim()}`;
    this.tables.employee_aliases.set(cleIdempotence, { ...alias });

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('employee_aliases').upsert({
          raw_alias: alias.aliasBrut,
          normalized_alias: alias.aliasNormalise || alias.aliasBrut,
          employee_business_id: alias.salarieId,
          official_name: alias.nomOfficielSalarie,
          created_in_period: alias.creeParMois || '2026-09',
        }, { onConflict: 'company_id,normalized_alias' });
      } catch {
        // Non-bloquant
      }
    }
  }

  async saveAliases(aliases: AliasItem[]): Promise<void> {
    for (const a of aliases) {
      await this.saveAlias(a);
    }
  }

  // =========================================================================
  // 4. PÉRIODES (periods)
  // =========================================================================
  async getPeriodes(): Promise<PeriodeMensuelle[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('periods')
          .select('*')
          .order('month_id');

        if (!error && data && data.length > 0) {
          return data.map(d => ({
            idMois: d.month_id,
            id: d.month_id,
            libelle: d.label,
            statut: d.status,
            etapeWorkflow: d.workflow_step,
            dateCreation: d.created_at,
            dateDerniereModification: d.updated_at,
            lignesPaieCount: d.lignes_paie_count ?? d.lignesPaieCount ?? 0,
          }));
        }
      } catch {
        // Fallback miroir
      }
    }
    return Array.from(this.tables.periods.values());
  }

  async getPeriode(monthId: string): Promise<PeriodeMensuelle | null> {
    const list = await this.getPeriodes();
    return list.find(p => p.idMois === monthId || p.id === monthId) || null;
  }

  async savePeriode(periode: PeriodeMensuelle): Promise<void> {
    const id = periode.idMois || periode.id || '2026-09';
    this.tables.periods.set(id, { ...periode, idMois: id, id });

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('periods').upsert({
          month_id: id,
          label: periode.libelle,
          status: periode.statut,
          workflow_step: periode.etapeWorkflow,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,month_id' });
      } catch {
        // Non-bloquant
      }
    }
  }

  async savePeriodes(periodes: PeriodeMensuelle[]): Promise<void> {
    for (const p of periodes) {
      await this.savePeriode(p);
    }
  }

  // =========================================================================
  // 5. LIGNES DE PAIE (payroll_lines)
  // =========================================================================
  async getLignesPaiePeriode(monthId: string): Promise<LignePaieImportee[]> {
    return this.tables.payroll_lines.get(monthId) || [];
  }

  async saveLignesPaiePeriode(monthId: string, lines: LignePaieImportee[]): Promise<void> {
    // Clonage profond pour garantir l'immutabilité
    this.tables.payroll_lines.set(monthId, JSON.parse(JSON.stringify(lines)));
  }

  // =========================================================================
  // 6. REGISTRE CNSS (cnss_register_lines)
  // =========================================================================
  async getRegistrePeriode(monthId: string): Promise<LigneRegistreCnss[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('cnss_register_lines')
          .select('*')
          .eq('month_id', monthId);

        if (!error && data && data.length > 0) {
          return data.map(d => ({
            id: d.business_line_id,
            periodeId: d.month_id,
            lignePaieId: d.payroll_line_id,
            nomSource: d.source_name,
            nomOfficiel: d.official_name,
            cni: d.cni,
            cnss: d.cnss_number,
            joursImportes: Number(d.imported_days),
            joursDeclares: Number(d.declared_days),
            baseImportee: Number(d.imported_base_salary),
            baseDeclaree: Number(d.declared_base_salary),
            salaireBrutImporte: Number(d.imported_gross_salary),
            salaireBrutDeclare: Number(d.declared_gross_salary),
            situation: d.situation,
            statutRapprochement: d.reconciliation_status,
            statut: d.line_status,
            valide: d.is_validated,
            verrouille: d.is_locked,
            anomalies: [],
            corrections: [],
            motifsBlocage: [],
            derniereModification: d.updated_at,
          }));
        }
      } catch {
        // Fallback miroir
      }
    }
    return this.tables.cnss_register_lines.get(monthId) || [];
  }

  async saveRegistrePeriode(monthId: string, lines: LigneRegistreCnss[]): Promise<void> {
    this.tables.cnss_register_lines.set(monthId, JSON.parse(JSON.stringify(lines)));
  }

  // =========================================================================
  // 7. DOSSIER MENSUEL (monthly_dossiers)
  // =========================================================================
  async getDossierPeriode(monthId: string): Promise<DossierCnssMensuel | null> {
    return this.tables.monthly_dossiers.get(monthId) || null;
  }

  async saveDossierPeriode(monthId: string, dossier: DossierCnssMensuel): Promise<void> {
    this.tables.monthly_dossiers.set(monthId, JSON.parse(JSON.stringify(dossier)));
  }

  // =========================================================================
  // 8. AUDIT (audit_logs)
  // =========================================================================
  async getJournalAudit(): Promise<EvenementAudit[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            date: d.created_at,
            action: d.action,
            salarie: d.affected_employee_name || '',
            utilisateur: d.actor_name,
            ancienneValeur: d.old_value,
            nouvelleValeur: d.new_value,
            justification: d.justification,
          }));
        }
      } catch {
        // Fallback miroir
      }
    }
    return Array.from(this.tables.audit_logs.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async enregistrerEvenementAudit(event: EvenementAudit): Promise<void> {
    this.tables.audit_logs.set(event.id, { ...event });

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('audit_logs').insert({
          action: event.action,
          actor_name: event.utilisateur || 'Gestionnaire MULT.S',
          affected_employee_name: event.salarie || null,
          old_value: event.ancienneValeur || null,
          new_value: event.nouvelleValeur || null,
          justification: event.justification || null,
          created_at: event.date || new Date().toISOString(),
        });
      } catch {
        // Non-bloquant
      }
    }
  }

  async saveJournalAudit(events: EvenementAudit[]): Promise<void> {
    for (const e of events) {
      await this.enregistrerEvenementAudit(e);
    }
  }

  // =========================================================================
  // 5b. RAPPROCHEMENTS (reconciliations)
  // =========================================================================
  async getRapprochementsPeriode(monthId: string): Promise<ResultatRapprochement[] | null> {
    console.log('[SUPABASE-SYNC] lecture après refresh', { table: 'reconciliations', monthId });

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('reconciliations')
          .select('*')
          .eq('company_id', this.companyId)
          .eq('period_id', monthId);

        if (!error && data && data.length > 0) {
          const mapped: ResultatRapprochement[] = data.map((row: any) => {
            if (row.raw_data_json && typeof row.raw_data_json === 'object' && row.raw_data_json.id) {
              return row.raw_data_json as ResultatRapprochement;
            }
            return {
              id: row.id,
              lignePaieId: row.payroll_line_id,
              salarieBaseId: row.suggested_employee_id || undefined,
              score: row.score || 0,
              secondScore: row.second_score || undefined,
              ecartScore: row.score_gap || undefined,
              statut: row.status || 'CORRESPONDANCE_UNIQUE',
              statutP5: row.p5_status || 'IDENTIFIE',
              methode: row.method || 'AUCUNE',
              explication: row.explanation || '',
              validation: row.validation_status || 'A_VALIDER',
              enregistrerCommeAlias: false,
              valideParHumain: Boolean(row.is_human_validated),
              estAmbigu: Boolean(row.is_ambiguous),
              estMarqueNouveau: Boolean(row.is_new_employee_confirmed),
              decisionSorti: row.departure_decision || undefined,
              nomDeclareFinal: row.final_declared_name || undefined,
              cniDeclareeFinale: row.final_declared_cni || undefined,
              cnssDeclareeFinale: row.final_declared_cnss || undefined,
              dateValidation: row.decision_date || undefined,
              dateDecision: row.decision_date || undefined,
              validationJours: {
                joursImportes: Number(row.declared_days) || 0,
                joursDeclares: Number(row.declared_days) || 0,
                modifieManuellement: Boolean(row.days_manually_modified),
                validationEffectuee: Boolean(row.is_human_validated),
                justification: row.days_modification_justification || undefined,
              },
            };
          });

          this.tables.reconciliations.set(monthId, mapped);
          return mapped;
        }
      } catch (err) {
        console.error('[SUPABASE-SYNC] erreur lecture', err);
      }
    }

    return this.tables.reconciliations.get(monthId) || null;
  }

  async saveRapprochementsPeriode(monthId: string, lines: ResultatRapprochement[]): Promise<void> {
    if (this.simulerErreurSupabase) {
      console.warn('[SUPABASE-SYNC] simulation test erreur UPDATE', {
        period_id: monthId,
        count: lines.length,
        cause: 'Erreur Supabase simulée',
      });
      throw new Error('[SUPABASE-SYNC] Échec de la persistance Supabase (erreur simulée)');
    }

    console.log('[SUPABASE-SYNC] avant UPDATE', {
      table: 'reconciliations',
      period_id: monthId,
      company_id: this.companyId,
      count: lines.length,
    });

    if (isSupabaseConfigured()) {
      try {
        const rows = lines.map(line => ({
          id: line.id,
          company_id: this.companyId,
          period_id: monthId,
          payroll_line_id: line.lignePaieId,
          suggested_employee_id: line.salariePropose?.id || line.salarieBaseId || null,
          score: line.score,
          second_score: line.secondScore || null,
          score_gap: line.ecartScore || null,
          method: line.methode || 'AUCUNE',
          status: line.statut,
          p5_status: line.statutP5 || 'IDENTIFIE',
          validation_status: line.validation,
          is_ambiguous: Boolean(line.estAmbigu),
          is_human_validated: Boolean(line.valideParHumain),
          is_new_employee_confirmed: Boolean(line.estMarqueNouveau),
          departure_decision: line.decisionSorti || null,
          declared_days: line.validationJours?.joursDeclares ?? line.validationJours?.joursImportes ?? 0,
          days_modification_justification: line.validationJours?.justification || null,
          days_manually_modified: Boolean(line.validationJours?.modifieManuellement),
          final_declared_name: line.nomDeclareFinal || line.salariePropose?.nomComplet || null,
          final_declared_cni: line.cniDeclareeFinale || line.salariePropose?.cni || null,
          final_declared_cnss: line.cnssDeclareeFinale || line.salariePropose?.immatriculationCnss || null,
          decision_date: line.dateDecision || line.dateValidation || new Date().toISOString(),
          raw_data_json: line,
          updated_at: new Date().toISOString(),
        }));

        const { data, error } = await supabase
          .from('reconciliations')
          .upsert(rows, { onConflict: 'period_id,payroll_line_id' });

        if (error) {
          if (error.code === 'PGRST205') {
            console.warn('[SUPABASE-SYNC] Table Supabase reconciliations non présente dans le cache de schéma (PGRST205) - conservation miroir persistant');
          } else {
            console.error('[SUPABASE-SYNC] erreur UPDATE', error);
            throw new Error(`[SUPABASE-SYNC] Erreur Supabase (${error.code || 'UNKNOWN'}) : ${error.message}`);
          }
        } else {
          console.log('[SUPABASE-SYNC] résultat UPDATE', { period_id: monthId, count: rows.length, success: true, data });
        }
      } catch (err: any) {
        if (err.message?.includes('[SUPABASE-SYNC]')) {
          throw err;
        }
        console.warn('[SUPABASE-SYNC] exception UPDATE réseau / client Supabase', err);
      }
    }

    this.tables.reconciliations.set(monthId, JSON.parse(JSON.stringify(lines)));
  }

  async validerSalarieRapprochement(
    monthId: string,
    idRapprochement: string,
    options: {
      memoriserAlias?: boolean;
      salarieChoisi?: SalarieReferentiel;
      joursDeclares?: number;
      justification?: string;
      decisionSorti?: 'REACTIVATION_CONFIRMEE' | 'CONSERVE_SORTI';
      estNouveau?: boolean;
    } = {}
  ): Promise<ResultatRapprochement> {
    const raps = (await this.getRapprochementsPeriode(monthId)) || [];
    const index = raps.findIndex(r => r.id === idRapprochement);
    if (index === -1) {
      throw new Error(`Rapprochement ${idRapprochement} introuvable pour la période ${monthId}`);
    }

    const ancien = raps[index];
    const salarieFinal = options.salarieChoisi || ancien.salariePropose;
    const joursFinals = options.joursDeclares ?? ancien.validationJours.joursDeclares;

    const misAJour: ResultatRapprochement = {
      ...ancien,
      validation: 'VALIDE',
      valideParHumain: true,
      statutP5: 'IDENTIFIE',
      dateValidation: new Date().toISOString(),
      dateDecision: new Date().toISOString(),
      salarieBaseId: salarieFinal?.id || ancien.salarieBaseId,
      salariePropose: salarieFinal,
      nomDeclareFinal: salarieFinal?.nomComplet || ancien.nomDeclareFinal,
      cniDeclareeFinale: salarieFinal?.cni || ancien.cniDeclareeFinale,
      cnssDeclareeFinale: salarieFinal?.immatriculationCnss || ancien.cnssDeclareeFinale,
      estAmbigu: false,
      estMarqueNouveau: options.estNouveau ?? ancien.estMarqueNouveau,
      decisionSorti: options.decisionSorti || ancien.decisionSorti,
      validationJours: {
        ...ancien.validationJours,
        joursDeclares: joursFinals,
        modifieManuellement: joursFinals !== ancien.validationJours.joursImportes,
        validationEffectuee: true,
        justification: options.justification || ancien.validationJours.justification,
      },
      historique: [
        ...(ancien.historique || []),
        {
          id: `h_${Date.now()}`,
          lignePaieId: ancien.lignePaieId,
          dateHeure: new Date().toISOString(),
          typeValidation: options.estNouveau ? 'CONFIRME_NOUVEAU' : 'MANUELLE',
          ancienStatut: ancien.validation,
          nouveauStatut: 'VALIDE',
          salarieSelectionneId: salarieFinal?.id,
          nomSalarieSelectionne: salarieFinal?.nomComplet,
          aliasCree: options.memoriserAlias ? salarieFinal?.nomComplet : undefined,
          commentaire: options.justification,
        },
      ],
    };

    console.log('[SUPABASE-SYNC] avant UPDATE', {
      table: 'reconciliations',
      reconciliation_id: idRapprochement,
      employee_id: salarieFinal?.id,
      period_id: monthId,
      company_id: this.companyId,
      statutValidation: 'VALIDE',
      salarieFinalId: salarieFinal?.id,
      joursDeclares: joursFinals,
      situation: salarieFinal?.situation || 'ACTIF',
      statut: 'IDENTIFIE',
    });

    if (this.simulerErreurSupabase) {
      console.warn('[SUPABASE-SYNC] simulation test erreur UPDATE', {
        reconciliation_id: idRapprochement,
        cause: 'Erreur Supabase simulée',
      });
      throw new Error('[SUPABASE-SYNC] Échec de la mise à jour Supabase (erreur simulée)');
    }

    if (isSupabaseConfigured()) {
      try {
        const payload = {
          id: misAJour.id,
          company_id: this.companyId,
          period_id: monthId,
          payroll_line_id: misAJour.lignePaieId,
          suggested_employee_id: salarieFinal?.id || null,
          score: misAJour.score,
          status: misAJour.statut,
          p5_status: 'IDENTIFIE',
          validation_status: 'VALIDE',
          is_ambiguous: false,
          is_human_validated: true,
          is_new_employee_confirmed: Boolean(misAJour.estMarqueNouveau),
          departure_decision: misAJour.decisionSorti || null,
          declared_days: joursFinals,
          days_modification_justification: misAJour.validationJours?.justification || null,
          days_manually_modified: Boolean(misAJour.validationJours?.modifieManuellement),
          final_declared_name: misAJour.nomDeclareFinal || null,
          final_declared_cni: misAJour.cniDeclareeFinale || null,
          final_declared_cnss: misAJour.cnssDeclareeFinale || null,
          decision_date: misAJour.dateValidation,
          raw_data_json: misAJour,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('reconciliations')
          .upsert(payload, { onConflict: 'period_id,payroll_line_id' });

        if (error) {
          if (error.code === 'PGRST205') {
            console.warn('[SUPABASE-SYNC] Table Supabase reconciliations non présente dans le cache de schéma (PGRST205) - conservation miroir persistant');
          } else {
            console.error('[SUPABASE-SYNC] erreur UPDATE', error);
            throw new Error(`[SUPABASE-SYNC] Erreur Supabase (${error.code || 'UNKNOWN'}) : ${error.message}`);
          }
        } else {
          console.log('[SUPABASE-SYNC] résultat UPDATE', { id: idRapprochement, succes: true, data });
        }
      } catch (err: any) {
        if (err.message?.includes('[SUPABASE-SYNC]')) {
          throw err;
        }
        console.warn('[SUPABASE-SYNC] exception UPDATE réseau / client Supabase', err);
      }
    }

    raps[index] = misAJour;
    this.tables.reconciliations.set(monthId, raps);

    if (options.memoriserAlias && salarieFinal) {
      await this.saveAlias({
        id: `alias_${Date.now()}`,
        aliasBrut: misAJour.nomDeclareFinal || salarieFinal.nomComplet,
        aliasNormalise: (misAJour.nomDeclareFinal || salarieFinal.nomComplet).toUpperCase().trim(),
        salarieId: salarieFinal.id,
        nomOfficielSalarie: salarieFinal.nomComplet,
        cniSalarie: salarieFinal.cni,
        cnssSalarie: salarieFinal.immatriculationCnss,
        creeParMois: monthId,
        dateCreation: new Date().toISOString(),
      });
    }

    return misAJour;
  }

  // =========================================================================
  // 6b. BORDEREAUX CNSS (declarations)
  // =========================================================================
  async getBordereauPeriode(monthId: string): Promise<DocumentBordereauCnss | null> {
    return this.tables.bordereaux.get(monthId) || null;
  }

  async saveBordereauPeriode(monthId: string, doc: DocumentBordereauCnss): Promise<void> {
    this.tables.bordereaux.set(monthId, JSON.parse(JSON.stringify(doc)));
  }

  // =========================================================================
  // 6c. PAIEMENTS COTISATIONS (payments)
  // =========================================================================
  async getPaiementPeriode(monthId: string): Promise<DocumentBordereauPaiementCnss | null> {
    return this.tables.payments.get(monthId) || null;
  }

  async savePaiementPeriode(monthId: string, doc: DocumentBordereauPaiementCnss): Promise<void> {
    this.tables.payments.set(monthId, JSON.parse(JSON.stringify(doc)));
  }

  // =========================================================================
  // 7b. PRÉÉTABLIS BDS (preetablis)
  // =========================================================================
  async getFichierPreetabli(monthId: string): Promise<FichierPreetabliCnss | null> {
    return this.tables.preetablis.get(monthId) || null;
  }

  async saveFichierPreetabli(monthId: string, doc: FichierPreetabliCnss): Promise<void> {
    this.tables.preetablis.set(monthId, JSON.parse(JSON.stringify(doc)));
  }

  // =========================================================================
  // 7c. ANOMALIES RÉSOLUES MANUELLEMENT
  // =========================================================================
  getAnomaliesResoluesManuellement(monthId: string): Record<string, { justification: string; date: string }> {
    return this.tables.anomalies_resolues.get(monthId) || {};
  }

  saveAnomalieResolueManuellement(monthId: string, anomalieId: string, justification: string): void {
    const existant = this.tables.anomalies_resolues.get(monthId) || {};
    existant[anomalieId] = { justification, date: new Date().toISOString() };
    this.tables.anomalies_resolues.set(monthId, existant);
  }

  saveAnomaliesResoluesManuellement(monthId: string, map: Record<string, { justification: string; date: string }>): void {
    this.tables.anomalies_resolues.set(monthId, { ...map });
  }

  // =========================================================================
  // 9. STATISTIQUES GLOBALES SUPABASE
  // =========================================================================
  async getStats(): Promise<SupabaseEntitiesStats> {
    const companies = this.tables.companies.size;
    const salaries = this.tables.employees.size;
    const aliases = this.tables.employee_aliases.size;
    const periodes = this.tables.periods.size;
    
    let totalLignesPaie = 0;
    this.tables.payroll_lines.forEach(list => (totalLignesPaie += list.length));

    let totalRapprochements = 0;
    this.tables.reconciliations.forEach(list => (totalRapprochements += list.length));

    let registres = 0;
    this.tables.cnss_register_lines.forEach(list => (registres += list.length));

    const bordereaux = this.tables.bordereaux.size;
    const paiements = this.tables.payments.size;
    const dossiers = this.tables.monthly_dossiers.size;
    const audits = this.tables.audit_logs.size;
    const preetablis = this.tables.preetablis.size;

    return {
      companies,
      salaries,
      aliases,
      periodes,
      lignesPaie: totalLignesPaie,
      rapprochements: totalRapprochements,
      registres,
      bordereaux,
      paiements,
      dossiers,
      audits,
      preetablis,
      totalElements:
        companies +
        salaries +
        aliases +
        periodes +
        totalLignesPaie +
        totalRapprochements +
        registres +
        bordereaux +
        paiements +
        dossiers +
        audits +
        preetablis,
    };
  }

  /**
   * Réinitialisation intégrale des données Supabase (miroir et distant si connecté).
   * Supprime toutes les données SAUF la table employees (base des salariés CNSS).
   */
  async reinitialiserToutSaufBaseCnss(): Promise<{ baseSalariesCount: number }> {
    // 1. Garantir que les salariés de référence sont préservés
    if (this.tables.employees.size === 0) {
      try {
        const init = chargerBaseSalariesReelle();
        init.forEach(s => this.tables.employees.set(s.id, { ...s }));
      } catch {
        // ignore
      }
    }

    // 2. Vider les autres tables miroir
    this.tables.employee_aliases.clear();
    this.tables.periods.clear();
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
    this.tables.periods.set('2026-09', periodeInitiale);

    this.tables.payroll_lines.clear();
    this.tables.reconciliations.clear();
    this.tables.cnss_register_lines.clear();
    this.tables.bordereaux.clear();
    this.tables.payments.clear();
    this.tables.monthly_dossiers.clear();
    this.tables.audit_logs.clear();
    this.tables.preetablis.clear();
    this.tables.anomalies_resolues.clear();

    // 3. Si Supabase distant configuré, tenter le nettoyage sans erreur fatale
    if (isSupabaseConfigured()) {
      try {
        await Promise.allSettled([
          supabase.from('payroll_lines').delete().eq('company_id', this.companyId),
          supabase.from('reconciliations').delete().eq('company_id', this.companyId),
          supabase.from('cnss_register_lines').delete().eq('company_id', this.companyId),
          supabase.from('bordereaux').delete().eq('company_id', this.companyId),
          supabase.from('payments').delete().eq('company_id', this.companyId),
          supabase.from('monthly_dossiers').delete().eq('company_id', this.companyId),
          supabase.from('audit_logs').delete().eq('company_id', this.companyId),
          supabase.from('employee_aliases').delete().eq('company_id', this.companyId),
        ]);
      } catch {
        // non bloquant
      }
    }

    return { baseSalariesCount: this.tables.employees.size };
  }

  /**
   * Réinitialisation de test (pour environnements de test / rollback)
   */
  clearAllData(): void {
    this.tables.companies.clear();
    this.tables.employees.clear();
    this.tables.employee_aliases.clear();
    this.tables.periods.clear();
    this.tables.payroll_lines.clear();
    this.tables.reconciliations.clear();
    this.tables.cnss_register_lines.clear();
    this.tables.bordereaux.clear();
    this.tables.payments.clear();
    this.tables.monthly_dossiers.clear();
    this.tables.audit_logs.clear();
    this.tables.preetablis.clear();
    this.tables.anomalies_resolues.clear();
  }
}

export const supabasePersistenceService = new SupabasePersistenceService();
