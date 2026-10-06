# SPÉCIFICATION D'ARCHITECTURE SUPABASE & SCHÉMA RELATIONNEL POSTGRESQL (PROMPT 12)
## APPLICATION CNSS MULT.S — SARLAU MULT.S (N° AFFILIÉ : 6541835)

---

## 1. Architecture Actuelle

L'application **CNSS MULT.S** fonctionne actuellement sur une architecture client riche (React 19 + TypeScript + Vite) avec une persistance multi-niveaux articulée autour de :

1. **Couche de Persistance Locale (`persistenceService.ts`) :**
   - Stockage clé-valeur synchrone dans `window.localStorage` avec miroir volatile `inMemoryStore`.
   - Clés préfixées par entités (`cnss_mults_salaries_p4`, `cnss_mults_periodes_p4`, `cnss_mults_paie_lignes_<mois>`, `cnss_mults_rapprochements_<mois>`, etc.).
   - Modèle dénormalisé sous forme d'arborescences JSON sérialisées.

2. **Moteur Métier & Audit (`matchingEngine.ts`, `validationEngine.ts`, `cnssRegisterService.ts`, etc.) :**
   - Algorithme de réconciliation en cascade 6 niveaux (Niveau 1 CNI, Niveau 2 CNSS, Niveau 3 Alias, Niveau 4 Nom normalisé exact, Niveau 5 Token Sort Ratio, Niveau 6 Fuzzy Levenshtein).
   - Règles d'immutabilité stricte : `joursImportes` et `salaireBrut` importés ne sont jamais altérés. Toute modification humaine alimente `joursDeclares` et `justification`.
   - Traçabilité continue par journal d'événements (`journal_audit_p4`).

3. **Système de Sauvegarde et Reprise Après Sinistre (`backupService.ts` — PROMPT 11) :**
   - Format standardisé `.mcnss` avec signature cryptographique SHA-256 déterministe (FIPS 180-2).
   - Restauration atomique, rollback automatique en cas d'erreur, validation d'intégrité globale et archivage mensuel scellé.
   - Indépendance totale vis-à-vis du Cloud (zéro fuite de données vers des serveurs tiers non souverains).

4. **Banc de Tests de Non-Régression :**
   - 13 suites automatisées totalisant **271 / 271 tests réussis**, couvrant la totalité des cas nominaux, limites et réglementaires (PROMPTs 01 à 11).

---

## 2. Architecture Cible

L'architecture cible positionne **Supabase (PostgreSQL 15+)** comme **source de persistance relationnelle principale**, tout en préservant le moteur métier TypeScript existant comme **source de vérité métier absolue**.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 NAVIGATEUR CLIENT                                │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                    MOTEUR MÉTIER TYPESCRIPT (INTOUCHÉ)                    │   │
│   │  - matchingEngine.ts (Fuzzy matching, pondérations, arbitrage)          │   │
│   │  - validationEngine.ts (Plafond 26j, régularisation, 9 anomalies)        │   │
│   │  - cnssRegisterService.ts (Génération du registre mensuel)              │   │
│   │  - cnssBordereauService.ts (F.212-2-58 Ordinaires & F.212-2-59 Entrants) │   │
│   │  - cnssPaiementService.ts (Réf. 511-1-01 Cotisations & Plafond 6000 MAD) │   │
│   │  - cnssDossierService.ts (Contrôle tripartite, scellement SHA-256)      │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                 ┌────────────────────┴─────────────────────┐                     │
│                 ▼                                          ▼                     │
│   ┌───────────────────────────┐              ┌───────────────────────────────┐   │
│   │  BACKUP / EXPORT .MCNSS   │              │   CLIENT SUPABASE (POSTGRES)   │   │
│   │  (PROMPT 11 — CONSERVÉ)   │              │   (JWT Auth + RLS isolée)     │   │
│   │  - Fichier local .mcnss   │              │   - Source principale cible   │   │
│   │  - Hash SHA-256 intègre   │              │   - Multi-postes / Archivage  │   │
│   │  - Zéro dépendance réseau │              │   - Isolation par company_id  │   │
│   └───────────────────────────┘              └──────────────┬────────────────┘   │
└─────────────────────────────────────────────────────────────┼────────────────────┘
                                                              │ HTTPS / TLS 1.3
                                                              ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               SUPABASE POSTGRESQL                                │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                       ROW LEVEL SECURITY (RLS)                           │   │
│   │   auth.company_id() = company_id  ET  role IN ('ADMIN', 'GESTIONNAIRE')   │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│   ┌──────────────────────────────────┴───────────────────────────────────────┐   │
│   │                      SCHÉMA RELATIONNEL NORMALISÉ                         │   │
│   │  - companies (SARLAU MULT.S)           - payroll_lines (Sources brutes)  │   │
│   │  - profiles (Utilisateurs & rôles)     - reconciliations (Rapprochements)│   │
│   │  - employees (Référentiel salariés)    - cnss_registers & register_lines │   │
│   │  - employee_aliases (Variantes nom)    - declarations & payments         │   │
│   │  - periods (Mois, statut, verrous)     - monthly_dossiers & audits       │   │
│   │  - payroll_imports (Traçabilité)       - preetabli_files & records       │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Principes Directeurs
1. **PostgreSQL ne calcule pas les règles CNSS :** Aucun trigger PL/pgSQL ne recalcule les cotisations ou le score de Levenshtein. Ces règles restent testées et éprouvées dans TypeScript.
2. **PostgreSQL garantit l'intégrité référentielle, l'immutabilité et le verrouillage :** Contraintes `FOREIGN KEY`, `CHECK`, `UNIQUE`, et blocage RLS sur les périodes clôturées.
3. **Le format `.mcnss` reste souverain :** Supabase ne remplace pas l'export/import d'archive chiffré et signé en local pour la reprise après sinistre.

---

## 3. Entités Métier Existantes et Cartographie

L'analyse exhaustive du code existant identifie **18 entités métier distinctes** :

| # | Entité Métier | Modèle TypeScript Source | Nature | Cycle de Vie |
|---|---------------|--------------------------|--------|--------------|
| 1 | **Entreprise** | `EntrepriseCnssConfig` | Persistante | Permanente (MULT.S SARLAU) |
| 2 | **Utilisateur & Profil** | `auth.users` / Interne | Persistante | Gestion multi-utilisateurs |
| 3 | **Salarié Référentiel** | `SalarieReferentiel` | Persistante | Permanente, enrichie au fil des mois |
| 4 | **Alias Salarié** | `AliasItem` | Persistante | Permanent, cumulatif inter-périodes |
| 5 | **Période Mensuelle** | `PeriodeMensuelle` | Persistante | Mensuelle, de `BROUILLON` à `CLOTURE` |
| 6 | **Import Paie** | `FichierImportInfo` | Immuable | Horodaté, lié à une période |
| 7 | **Ligne de Paie Importée**| `LignePaieImportee` | Immuable | Donnée brute protégée (joursImportes fixés) |
| 8 | **Rapprochement Ligne** | `ResultatRapprochement` | Modifiable | Évolue jusqu'à validation de la période |
| 9 | **Décision de Sortie** | `decisionsSorties` | Historique | Arbitrage sortie confirmée vs réactivation |
| 10 | **Anomalie Détectée** | `AnomalieLigne` | Calculée/Résolue | Dynamique, levable avec justification |
| 11 | **Registre CNSS** | `LigneRegistreCnss` | Consolidée | Figé lors de la validation |
| 12 | **Bordereau Salariés** | `BordereauOrdinaires`/`Entrants`| Projection | F.212-2-58 et F.212-2-59 en lecture seule |
| 13 | **Taux de Cotisation** | `CnssTauxItem` | Référentiel | Paramétrage officiel (Réf: 511-1-01) |
| 14 | **Bordereau Paiement** | `DocumentBordereauPaiement` | Projection | Décompte cotisations & AMO scellé |
| 15 | **Dossier Mensuel** | `DossierCnssMensuel` | Scellée | Scellé par empreinte SHA-256 |
| 16 | **Journal d'Audit** | `EvenementAudit` | Append-Only | Inaltérable, chronologique |
| 17 | **Fichier Préétabli BDS**| `FichierPreetabliCnss` | Immuable | Fichier original conservé verbatim |
| 18 | **Rapprochement BDS** | `RapprochementPreetabli` | Modifiable | Comparaison BDS vs Registre MULT.S |

---

## 4. Diagramme des Relations (Entité-Association)

```
┌──────────────┐
│  COMPANIES   │ (MULT.S SARLAU - Affilié 6541835)
└──────┬───────┘
       │ 1
       │
       ├────────────────────────────────────────┬──────────────────────────────────────┐
       │ *                                      │ *                                    │ *
┌──────▼───────┐                         ┌──────▼───────┐                       ┌──────▼───────┐
│   PROFILES   │                         │  EMPLOYEES   │                       │   PERIODS    │
└──────────────┘                         └──────┬───────┘                       └──────┬───────┘
                                                │ 1                                    │ 1
                                                ├──────────────────────┐               ├──────────────────────┐
                                                │ *                    │ *             │ 1                    │ 1
                                         ┌──────▼───────┐       ┌──────▼───────┐┌──────▼───────┐       ┌──────▼───────┐
                                         │EMPLOYEE_ALIAS│       │DECISIONS_SORT││PAYROLL_IMPORT│       │CNSS_REGISTERS│
                                         └──────────────┘       └──────────────┘└──────┬───────┘       └──────┬───────┘
                                                                                       │ 1                    │ 1
                                                                                       │ *                    │ *
                                                                                ┌──────▼───────┐       ┌──────▼───────┐
                                                                                │ PAYROLL_LINES│       │REGISTER_LINES│
                                                                                └──────┬───────┘       └──────────────┘
                                                                                       │ 1
                                                                                       │ 1
                                                                                ┌──────▼───────┐
                                                                                │RECONCILIATION│
                                                                                └──────────────┘
                                                                                       │ 1
                                                                                       │ *
                                                                                ┌──────▼───────┐
                                                                                │  ANOMALIES   │
                                                                                └──────────────┘
                                                                                       │
                                                                                ┌──────┴───────┐
                                                                                │              │
                                                                         ┌──────▼───────┐┌─────▼────────┐
                                                                         │ DECLARATIONS ││   PAYMENTS   │
                                                                         └──────┬───────┘└─────┬────────┘
                                                                                │ 1            │ 1
                                                                                └───────┬──────┘
                                                                                        │
                                                                                 ┌──────▼───────┐
                                                                                 │MONTHLY_DOSSIE│ (Scellé SHA-256)
                                                                                 └──────┬───────┘
                                                                                        │ 1
                                                                                        │ *
                                                                                 ┌──────▼───────┐
                                                                                 │ AUDIT_LOGS   │ (Append-Only)
                                                                                 └──────────────┘
```

---

## 5. Schéma DDL PostgreSQL Proposé (Complet)

> **AVERTISSEMENT :** Ce code DDL est une proposition d'architecture documentaire formelle pour validation. Il ne doit pas être exécuté avant la phase PROMPT 13.

```sql
-- ============================================================================
-- SCHÉMA SUPABASE POSTGRESQL — APPLICATION CNSS MULT.S (PROMPT 12)
-- SOCIÉTÉ MULT.S SARLAU — N° AFFILIATION CNSS : 6541835
-- ============================================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABLE : companies (Entreprise émettrice / Multi-tenant isolation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(120) NOT NULL,
    legal_form VARCHAR(20) NOT NULL DEFAULT 'SARLAU',
    rc_number VARCHAR(30) NOT NULL,
    fiscal_id VARCHAR(30) NOT NULL,
    ice_number VARCHAR(30) NOT NULL,
    cnss_affiliation_number VARCHAR(15) NOT NULL UNIQUE,
    cnss_agency VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    code_form_ordinary VARCHAR(20) NOT NULL DEFAULT 'F.212-2-58',
    code_form_entrants VARCHAR(20) NOT NULL DEFAULT 'F.212-2-59',
    lines_per_page INT NOT NULL DEFAULT 12 CHECK (lines_per_page > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.companies IS 'Entreprise émettrice MULT.S SARLAU affiliée à la CNSS.';

-- ----------------------------------------------------------------------------
-- 2. TABLE : profiles (Utilisateurs rattachés & Contrôle des accès RBAC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'GESTIONNAIRE' CHECK (role IN ('ADMIN', 'GESTIONNAIRE', 'CONSULTATION')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. TABLE : employees (Référentiel permanent des salariés)
-- Règle : Les CNI et N° CNSS ne servent JAMAIS de clé primaire technique.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    business_id VARCHAR(50) NOT NULL, -- Ex: 'sal_01', 'sal_ref_1728100'
    full_name VARCHAR(120) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL,
    cni VARCHAR(20),
    cnss_number VARCHAR(15),
    situation VARCHAR(25) NOT NULL DEFAULT 'ACTIF' CHECK (situation IN ('ACTIF', 'SORTI', 'ACCIDENT_TRAVAIL', 'SUSPENDU')),
    original_situation_code VARCHAR(10), -- Ex: 'so', 'AT'
    first_seen_period VARCHAR(7) NOT NULL, -- Ex: '2026-09'
    last_declaration_period VARCHAR(7),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_employee_business_id UNIQUE (company_id, business_id)
);

-- Index pour accélérer le rapprochement par nom, CNI et CNSS
CREATE INDEX IF NOT EXISTS idx_employees_normalized_name ON public.employees(company_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_employees_cni ON public.employees(company_id, cni) WHERE cni IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_cnss ON public.employees(company_id, cnss_number) WHERE cnss_number IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. TABLE : employee_aliases (Variantes orthographiques validées)
-- Règle : Un salarié référentiel possède plusieurs alias persistés multi-mois.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    raw_alias VARCHAR(120) NOT NULL,
    normalized_alias VARCHAR(120) NOT NULL,
    created_in_period VARCHAR(7) NOT NULL,
    validated_by_user VARCHAR(100) NOT NULL DEFAULT 'Gestionnaire MULT.S',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_alias UNIQUE (company_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_employee_aliases_norm ON public.employee_aliases(company_id, normalized_alias);

-- ----------------------------------------------------------------------------
-- 5. TABLE : periods (Périodes mensuelles de paie et déclaration)
-- Règle : Unicité absolue (company_id, month_id) — Ex: '2026-09'.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    month_id VARCHAR(7) NOT NULL, -- Format standard 'YYYY-MM' (Ex: '2026-09')
    label VARCHAR(50) NOT NULL,   -- Ex: 'Septembre 2026'
    status VARCHAR(25) NOT NULL DEFAULT 'BROUILLON' CHECK (status IN ('BROUILLON', 'PRET_POUR_DECLARATION', 'EN_COURS', 'VALIDE', 'CLOTURE')),
    workflow_step INT NOT NULL DEFAULT 1 CHECK (workflow_step BETWEEN 1 AND 10),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at TIMESTAMPTZ,
    closed_by VARCHAR(100),
    closure_justification TEXT,
    reopened_at TIMESTAMPTZ,
    reopened_by VARCHAR(100),
    reopening_justification TEXT,
    version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_period UNIQUE (company_id, month_id)
);

-- ----------------------------------------------------------------------------
-- 6. TABLE : payroll_imports (Fichiers Excel de paie importés)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
    filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
    sha256_hash CHAR(64) NOT NULL,
    total_rows INT NOT NULL CHECK (total_rows >= 0),
    valid_rows INT NOT NULL CHECK (valid_rows >= 0),
    ignored_rows INT NOT NULL DEFAULT 0,
    anomalous_rows INT NOT NULL DEFAULT 0,
    sheet_name VARCHAR(100) NOT NULL DEFAULT 'Feuil1',
    column_mapping JSONB NOT NULL DEFAULT '[]'::jsonb,
    imported_by VARCHAR(100) NOT NULL DEFAULT 'Gestionnaire MULT.S',
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. TABLE : payroll_lines (Données originales importées brutes — IMMUABLES)
-- Règle : jours_importes et salaire_brut_importe ne sont JAMAIS modifiés.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    import_id UUID NOT NULL REFERENCES public.payroll_imports(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
    business_line_id VARCHAR(50) NOT NULL, -- Ex: 'paie_0', 'paie_1'
    source_row_index INT NOT NULL CHECK (source_row_index >= 1),
    raw_full_name VARCHAR(120) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL,
    name_tokens TEXT[] NOT NULL DEFAULT '{}',
    imported_days NUMERIC(5,2) NOT NULL, -- IMMUABLE (peut être négatif ou > 26 à l'import)
    imported_base_salary NUMERIC(12,2) DEFAULT 0.00,
    imported_gross_salary NUMERIC(12,2) DEFAULT 0.00,
    imported_cni VARCHAR(20),
    imported_cnss VARCHAR(15),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_period_business_line UNIQUE (period_id, business_line_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_lines_period ON public.payroll_lines(period_id);

-- ----------------------------------------------------------------------------
-- 8. TABLE : reconciliations (Résultats du rapprochement et arbitrages humains)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
    payroll_line_id UUID NOT NULL REFERENCES public.payroll_lines(id) ON DELETE RESTRICT,
    suggested_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    second_score INT CHECK (second_score BETWEEN 0 AND 100),
    score_gap INT,
    method VARCHAR(30) NOT NULL, -- 'CNI_EXACTE', 'ALIAS_VALIDE', 'FUZZY', 'MANUEL', etc.
    status VARCHAR(30) NOT NULL,
    p5_status VARCHAR(30) NOT NULL, -- 'IDENTIFIE', 'A_VALIDER', 'AMBIGU', 'NON_IDENTIFIE', etc.
    validation_status VARCHAR(20) NOT NULL DEFAULT 'A_VALIDER' CHECK (validation_status IN ('AUTOMATIQUE', 'A_VALIDER', 'VALIDE', 'REJETE')),
    is_ambiguous BOOLEAN NOT NULL DEFAULT FALSE,
    is_human_validated BOOLEAN NOT NULL DEFAULT FALSE,
    is_new_employee_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    departure_decision VARCHAR(30) CHECK (departure_decision IN ('REACTIVATION_CONFIRMEE', 'CONSERVE_SORTI')),
    
    -- Valeurs déclarées (découplées des valeurs importées)
    declared_days NUMERIC(5,2) NOT NULL, -- Déclaré légalement (0 à 26 j)
    days_modification_justification TEXT,
    days_manually_modified BOOLEAN NOT NULL DEFAULT FALSE,
    
    final_declared_name VARCHAR(120),
    final_declared_cni VARCHAR(20),
    final_declared_cnss VARCHAR(15),
    final_declared_salary NUMERIC(12,2),
    
    ambiguous_candidates_json JSONB DEFAULT '[]'::jsonb,
    explanation TEXT NOT NULL DEFAULT '',
    decision_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reconciliation_line UNIQUE (period_id, payroll_line_id)
);

CREATE INDEX IF NOT EXISTS idx_reconciliations_period_p5 ON public.reconciliations(period_id, p5_status);

-- ----------------------------------------------------------------------------
-- 9. TABLE : line_anomalies (Anomalies et contrôles réglementaires)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.line_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
    reconciliation_id UUID NOT NULL REFERENCES public.reconciliations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- 'JOURS_NEGATIFS', 'JOURS_SUPERIEURS_26', 'CORRESPONDANCE_AMBIGUE', etc.
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('BLOQUANTE', 'AVERTISSEMENT', 'INFO')),
    message TEXT NOT NULL,
    original_value TEXT NOT NULL,
    suggested_value TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolution_action TEXT,
    resolution_justification TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_anomalies_period_unresolved ON public.line_anomalies(period_id, severity) WHERE is_resolved = FALSE;

-- ----------------------------------------------------------------------------
-- 10. TABLE : cnss_registers (En-tête de registre mensuel validé)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cnss_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT UNIQUE,
    month_id VARCHAR(7) NOT NULL,
    total_lines INT NOT NULL CHECK (total_lines >= 0),
    ready_lines INT NOT NULL DEFAULT 0,
    validated_lines INT NOT NULL DEFAULT 0,
    blocked_lines INT NOT NULL DEFAULT 0,
    total_declared_days NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    total_declared_gross_salary NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    is_ready_for_declaration BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. TABLE : cnss_register_lines (Lignes consolidées du registre mensuel)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cnss_register_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    register_id UUID NOT NULL REFERENCES public.cnss_registers(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
    reconciliation_id UUID NOT NULL REFERENCES public.reconciliations(id) ON DELETE RESTRICT,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    
    source_name VARCHAR(120) NOT NULL,
    official_name VARCHAR(120) NOT NULL,
    cni VARCHAR(20) NOT NULL,
    cnss_number VARCHAR(15) NOT NULL,
    
    -- Comparaison stricte Valeur Importée vs Valeur Déclarée
    imported_days NUMERIC(5,2) NOT NULL,
    declared_days NUMERIC(5,2) NOT NULL CHECK (declared_days >= 0 AND declared_days <= 26),
    imported_base_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    declared_base_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    imported_gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    declared_gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    
    situation VARCHAR(25) NOT NULL,
    reconciliation_status VARCHAR(30) NOT NULL,
    line_status VARCHAR(25) NOT NULL DEFAULT 'PRET' CHECK (line_status IN ('BROUILLON', 'A_COMPLETER', 'A_CORRIGER', 'BLOQUE', 'PRET', 'VALIDE')),
    is_validated BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    corrections_history_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    blocking_reasons TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_register_lines_reg ON public.cnss_register_lines(register_id);

-- ----------------------------------------------------------------------------
-- 12. TABLE : declarations_salaries (Bordereaux de déclaration des salariés)
-- Formulaire F.212-2-58 (Salariés ordinaires) & F.212-2-59 (Salariés entrants)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.declarations_salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT UNIQUE,
    reference_number VARCHAR(60) NOT NULL,
    emission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_salaries_count INT NOT NULL CHECK (total_salaries_count >= 0),
    total_entrants_count INT NOT NULL DEFAULT 0,
    total_sortants_count INT NOT NULL DEFAULT 0,
    total_declared_days NUMERIC(8,2) NOT NULL CHECK (total_declared_days >= 0),
    ordinary_pages_json JSONB NOT NULL,
    entrants_pages_json JSONB NOT NULL,
    is_validated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 13. TABLE : cnss_rates (Référentiel des taux officiels de cotisation CNSS)
-- Conforme Document Officiel CNSS Maroc Réf. 511-1-01
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cnss_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    code_rubrique VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    regime VARCHAR(30) NOT NULL CHECK (regime IN ('REGIME_GENERAL', 'AMO')),
    total_rate NUMERIC(5,2) NOT NULL CHECK (total_rate >= 0),
    employer_rate NUMERIC(5,2),
    employee_rate NUMERIC(5,2),
    is_capped BOOLEAN NOT NULL DEFAULT FALSE,
    monthly_cap NUMERIC(10,2) DEFAULT NULL, -- 6000.00 MAD pour Prestations Sociales
    legal_source VARCHAR(100) NOT NULL DEFAULT 'Document Officiel CNSS Maroc Réf: 511-1-01',
    is_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    formula TEXT NOT NULL DEFAULT 'assiette * taux',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 14. TABLE : contribution_payments (Bordereaux de paiement des cotisations)
-- Décompte financier certifié (Page 1 Régime Général & Page 2 AMO)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contribution_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT UNIQUE,
    reference_number VARCHAR(60) NOT NULL,
    emission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL, -- Ex: 10 du mois suivant
    payment_month_label VARCHAR(50) NOT NULL,
    
    total_declared_payroll NUMERIC(14,2) NOT NULL,
    capped_payroll_prestation_sociale NUMERIC(14,2) NOT NULL,
    
    -- Régime Général
    amount_allocations_familiales NUMERIC(12,2) NOT NULL, -- 6.40%
    amount_prestations_sociales NUMERIC(12,2) NOT NULL,   -- 13.46%
    total_general_contributions NUMERIC(12,2) NOT NULL,   -- C1 + C2
    amount_tfp NUMERIC(12,2) NOT NULL,                    -- 1.60%
    total_global_general NUMERIC(12,2) NOT NULL,
    
    -- AMO
    amount_participation_amo NUMERIC(12,2) NOT NULL,      -- 1.85%
    amount_cotisation_amo NUMERIC(12,2) NOT NULL,         -- 4.52%
    total_global_amo NUMERIC(12,2) NOT NULL,              -- 6.37%
    
    -- Total Final consolidé
    grand_total_to_pay NUMERIC(14,2) NOT NULL,
    total_in_words TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'BROUILLON' CHECK (status IN ('BROUILLON', 'VALIDE', 'VERROUILLE')),
    breakdown_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 15. TABLE : monthly_dossiers (Dossier mensuel scellé & preuve d'authenticité)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT UNIQUE,
    version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
    status VARCHAR(25) NOT NULL DEFAULT 'BROUILLON' CHECK (status IN ('BROUILLON', 'A_CONTROLER', 'PRET_A_VALIDER', 'VALIDE', 'CLOTURE')),
    sha256_seal CHAR(64) NOT NULL, -- Empreinte cryptographique de scellement
    tripartite_check_passed BOOLEAN NOT NULL DEFAULT FALSE,
    total_employees_count INT NOT NULL CHECK (total_employees_count >= 0),
    total_amount_to_pay NUMERIC(14,2) NOT NULL,
    closed_at TIMESTAMPTZ,
    closed_by VARCHAR(100),
    closure_justification TEXT,
    reopened_at TIMESTAMPTZ,
    reopened_by VARCHAR(100),
    reopening_justification TEXT,
    financial_summary_json JSONB NOT NULL,
    tripartite_checks_json JSONB NOT NULL,
    attached_documents_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 16. TABLE : audit_logs (Journal d'audit inaltérable chronologique)
-- Règle : Append-Only absolu (zéro UPDATE, zéro DELETE). Pas de fuite CNI/salaires.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    period_id UUID REFERENCES public.periods(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name VARCHAR(100) NOT NULL DEFAULT 'Gestionnaire MULT.S',
    action VARCHAR(60) NOT NULL, -- 'MODIFICATION_JOURS', 'ARBITRAGE_AMBIGU', 'CLOTURE_MOIS', etc.
    target_entity VARCHAR(50) NOT NULL, -- 'reconciliations', 'periods', 'registers', etc.
    target_entity_id VARCHAR(50),
    affected_employee_name VARCHAR(120),
    old_value TEXT,
    new_value TEXT,
    justification TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_period ON public.audit_logs(company_id, period_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 17. TABLE : preetabli_files (Fichiers préétablis / BDS CNSS verbatim)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preetabli_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
    filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    total_lines INT NOT NULL CHECK (total_lines >= 0),
    analysis_status VARCHAR(30) NOT NULL DEFAULT 'BRUT',
    raw_lines_json JSONB NOT NULL,
    detected_employer_affiliation VARCHAR(15),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 18. TABLE : preetabli_reconciliations (Rapprochements préétabli vs Registre)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preetabli_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    preetabli_file_id UUID NOT NULL REFERENCES public.preetabli_files(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE RESTRICT,
    line_number INT NOT NULL,
    raw_content TEXT NOT NULL,
    preetabli_cnss VARCHAR(15),
    preetabli_cni VARCHAR(20),
    preetabli_name VARCHAR(120),
    preetabli_days NUMERIC(5,2),
    matched_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    score INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'A_VALIDER',
    differences_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. Stratégie de Clés Primaires, Clés Étrangères et Contraintes

| Table | Clé Primaire (PK) | Identifiant Métier Stable | Clés Étrangères (FK) | Règle ON DELETE | Justification Sécurité |
|---|---|---|---|---|---|
| `companies` | `id` (UUID) | `cnss_affiliation_number` ('6541835') | - | - | Entreprise racine non supprimable |
| `profiles` | `id` (UUID) | Email utilisateur | `company_id` | `RESTRICT` | Pas d'orphelin sans entreprise |
| `employees` | `id` (UUID) | `business_id` ('sal_01') | `company_id` | `RESTRICT` | Protection des salariés historiques |
| `employee_aliases`| `id` (UUID) | `normalized_alias` | `employee_id`, `company_id` | `CASCADE` (si salarié supprimé) | Les alias suivent le salarié |
| `periods` | `id` (UUID) | `month_id` ('2026-09') | `company_id` | `RESTRICT` | Périodes immuables après clôture |
| `payroll_imports` | `id` (UUID) | `sha256_hash` | `period_id`, `company_id` | `RESTRICT` | Audit de traçabilité des imports |
| `payroll_lines` | `id` (UUID) | `business_line_id` | `import_id`, `period_id` | `CASCADE` (import réinitialisé) | Sources paie protégées |
| `reconciliations` | `id` (UUID) | `(period_id, payroll_line_id)`| `payroll_line_id`, `suggested_employee_id` | `RESTRICT` | Pas de suppression sans trace |
| `line_anomalies` | `id` (UUID) | Code anomalie par ligne | `reconciliation_id`, `period_id` | `CASCADE` | Recalculable dynamiquement |
| `cnss_registers` | `id` (UUID) | `(company_id, month_id)` | `period_id`, `company_id` | `RESTRICT` | Registre officiel unique par mois |
| `cnss_register_lines`| `id` (UUID)| `(register_id, reconciliation_id)`| `register_id`, `reconciliation_id` | `CASCADE` | Découplage strict ligne par ligne |
| `declarations_salaries`| `id` (UUID)| `reference_number` | `period_id`, `company_id` | `RESTRICT` | Déclaration F.212-2-58 officielle |
| `cnss_rates` | `id` (UUID) | `code_rubrique` | `company_id` | `RESTRICT` | Taux Réf. 511-1-01 non supprimables |
| `contribution_payments`| `id` (UUID)| `reference_number` | `period_id`, `company_id` | `RESTRICT` | Pièce comptable officielle scellée |
| `monthly_dossiers`| `id` (UUID)| `(period_id, version)` | `period_id`, `company_id` | `RESTRICT` | Dossier scellé avec SHA-256 |
| `audit_logs` | `id` (UUID) | Horodatage + UUID | `company_id`, `period_id` | `RESTRICT` / `SET NULL` | **Append-Only absolu** (jamais de DELETE) |

---

## 7. Politiques de Sécurité Row Level Security (RLS)

Toutes les tables ont RLS activé par défaut (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

### 1. Fonction d'isolation de l'Entreprise
```sql
-- Fonction sécurisée pour extraire le company_id de l'utilisateur authentifié
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Fonction pour extraire le rôle de l'utilisateur
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 2. Politiques Spécifiques par Rôle et Verrouillage Période

#### Exemple sur `employees` (Référentiel Salariés)
```sql
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les profils actifs de la même entreprise
CREATE POLICY "employees_select_policy" ON public.employees
FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

-- Écriture/Modification : réservée aux rôles ADMIN et GESTIONNAIRE
CREATE POLICY "employees_insert_update_policy" ON public.employees
FOR ALL TO authenticated
USING (
    company_id = public.current_company_id() 
    AND public.current_user_role() IN ('ADMIN', 'GESTIONNAIRE')
)
WITH CHECK (
    company_id = public.current_company_id() 
    AND public.current_user_role() IN ('ADMIN', 'GESTIONNAIRE')
);
```

#### Exemple sur `reconciliations` et `cnss_register_lines` (Verrouillage Période Clôturée)
```sql
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;

-- Modification interdite si la période est CLOTURE
CREATE POLICY "reconciliations_update_lock_policy" ON public.reconciliations
FOR UPDATE TO authenticated
USING (
    company_id = public.current_company_id()
    AND public.current_user_role() IN ('ADMIN', 'GESTIONNAIRE')
    AND NOT EXISTS (
        SELECT 1 FROM public.periods p 
        WHERE p.id = reconciliations.period_id AND (p.status = 'CLOTURE' OR p.is_locked = TRUE)
    )
)
WITH CHECK (
    company_id = public.current_company_id()
    AND public.current_user_role() IN ('ADMIN', 'GESTIONNAIRE')
    AND NOT EXISTS (
        SELECT 1 FROM public.periods p 
        WHERE p.id = reconciliations.period_id AND (p.status = 'CLOTURE' OR p.is_locked = TRUE)
    )
);
```

#### Exemple sur `audit_logs` (Append-Only Absolu)
```sql
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Lecture : accessible à l'entreprise
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
FOR SELECT TO authenticated
USING (company_id = public.current_company_id());

-- Insertion : tout utilisateur actif peut logger un événement
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (company_id = public.current_company_id());

-- MODIFICATION ET SUPPRESSION STRICTEMENT INTERDITES PAR RLS (Zéro policy UPDATE/DELETE)
```

---

## 8. Authentification, Rôles et Isolation MULT.S

### Matrice des Rôles (RBAC)

| Rôle | Consultation | Rapprochement & Arbitrage | Import Paie / BDS | Modification Données | Clôture / Scellement | Réouverture | Administration Utilisateurs |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `CONSULTATION` | ✅ OUI | ❌ NON | ❌ NON | ❌ NON | ❌ NON | ❌ NON | ❌ NON |
| `GESTIONNAIRE` | ✅ OUI | ✅ OUI | ✅ OUI | ✅ OUI | ✅ OUI | ❌ NON | ❌ NON |
| `ADMIN` | ✅ OUI | ✅ OUI | ✅ OUI | ✅ OUI | ✅ OUI | ✅ OUI (Justification requise) | ✅ OUI |

### Isolation Société MULT.S
La société **MULT.S SARLAU** est configurée avec ses identifiants officiels au Maroc :
- **Raison Sociale :** STE MULT.S SARLAU
- **N° Affiliation CNSS :** 6541835
- **Registre du Commerce (RC) :** 713005
- **Identifiant Fiscal (IF) :** 71792005
- **Identifiant Commun de l'Entreprise (ICE) :** 003893711000052
- **Agence de rattachement CNSS :** SIDI BELYOUT (Casablanca)

Chaque table opérationnelle référence `company_id`, garantissant l'isolation logique étanche et préparant sans surcoût un éventuel fonctionnement multi-dossiers fiduciaire.

---

## 9. Mapping TypeScript vers PostgreSQL

| Modèle TypeScript (`src/types/`) | Table Supabase PostgreSQL | Clé Primaire TypeScript | Clé Primaire PostgreSQL | Particularités & Sérialisation |
|---|---|---|---|---|
| `EntrepriseCnssConfig` | `public.companies` | `numeroAffiliation` | `id` (UUID) | Paramètres officiels MULT.S |
| `SalarieReferentiel` | `public.employees` | `id` (string: 'sal_01') | `id` (UUID) + `business_id` | `nomNormalise` indexé, tokens préservés |
| `AliasItem` | `public.employee_aliases` | `id` (string) | `id` (UUID) | `employee_id` FK, contrainte unique normalisée |
| `PeriodeMensuelle` | `public.periods` | `idMois` ('2026-09') | `id` (UUID) + `month_id` | État de clôture & verrous RLS |
| `AnalyseFichierExcel` (métadonnées) | `public.payroll_imports` | Nom / Horodatage | `id` (UUID) | Empreinte SHA-256 du fichier source |
| `LignePaieImportee` | `public.payroll_lines` | `id` ('paie_0') | `id` (UUID) + `business_line_id` | **joursImportes STRICTEMENT IMMUABLES** |
| `ResultatRapprochement` | `public.reconciliations` | `id` ('rap_paie_0') | `id` (UUID) | Découplage `declared_days` / `imported_days` |
| `AnomalieLigne` | `public.line_anomalies` | `id` ('ano_neg_...') | `id` (UUID) | Suivi de résolution et levée manuelle |
| `LigneRegistreCnss` | `public.cnss_register_lines` | `id` ('reg_01') | `id` (UUID) | Consolidé officiel pour Damancom |
| `BordereauOrdinaires`/`Entrants`| `public.declarations_salaries` | `referenceStructuree` | `id` (UUID) | F.212-2-58 et F.212-2-59 paginés en JSONB |
| `CnssTauxItem` | `public.cnss_rates` | `id` / `codeRubrique` | `id` (UUID) | Plafond 6000 MAD pour Prestations Sociales |
| `DocumentBordereauPaiement` | `public.contribution_payments` | `referenceStructuree` | `id` (UUID) | Totaux C1, C2, TFP, AMO, arrondi centime |
| `DossierCnssMensuel` | `public.monthly_dossiers` | `idMois` + `version` | `id` (UUID) | Empreinte `sha256_seal` de scellement |
| `EvenementAudit` | `public.audit_logs` | `id` ('audit_...') | `id` (UUID) | Table Append-Only, aucun salaire/CNI en clair |
| `FichierPreetabliCnss` | `public.preetabli_files` | `id` (string) | `id` (UUID) | Lignes originales conservées verbatim |
| `RapprochementPreetabli` | `public.preetabli_reconciliations`| `id` (string) | `id` (UUID) | Différences détectées structurées en JSONB |

---

## 10. Mapping `persistenceService.ts` vers Supabase

| Méthode actuelle `persistenceService` | Stockage Actuel | Équivalent Cible Supabase | Stratégie de Transition |
|---|---|---|---|
| `getSalaries()` / `saveSalaries()` | `STORAGE_KEYS.SALARIES` | `supabase.from('employees').select()` | Cache mémoire + Fetch Supabase |
| `getAliases()` / `ajouterAlias()` | `STORAGE_KEYS.ALIASES` | `supabase.from('employee_aliases').insert()` | Déduplication par contrainte `UNIQUE` |
| `getPeriodes()` / `updatePeriode()` | `STORAGE_KEYS.PERIODES` | `supabase.from('periods').upsert()` | Vérification statut `CLOTURE` via RLS |
| `getLignesPaiePeriode(m)` | `PAIE_PREFIX + m` | `supabase.from('payroll_lines').select()` | Lecture filtrée par `period_id` |
| `getRapprochementsPeriode(m)` | `RAPS_PREFIX + m` | `supabase.from('reconciliations').select()` | Sauvegarde atomique avec batching |
| `getRegistrePeriode(m)` | `REGISTRE_PREFIX + m` | `supabase.from('cnss_register_lines').select()`| Jointure avec `cnss_registers` |
| `getBordereauPeriode(m)` | `BORDEREAU_PREFIX + m` | `supabase.from('declarations_salaries').select()`| Sauvegarde scellée avec audit |
| `getPaiementPeriode(m)` | `PAIEMENT_PREFIX + m` | `supabase.from('contribution_payments').select()`| Sauvegarde certifiée des cotisations |
| `getDossierPeriode(m)` | `DOSSIER_PREFIX + m` | `supabase.from('monthly_dossiers').select()` | Validation empreinte SHA-256 |
| `getJournalAudit()` / `enregistrer()` | `JOURNAL_AUDIT` | `supabase.from('audit_logs').insert()` | Écriture directe asynchrone non-bloquante |
| `getAnomaliesResoluesManuellement()` | `ANOMALIES_RESOLUES_PREFIX`| `supabase.from('line_anomalies').update()` | Mise à jour de la résolution avec motif |

---

## 11. Stratégie de Migration Progressive (Phases A à F)

Pour garantir une transition 100% sécurisée sans interruption de service ni perte de données :

```
[ PHASE A ]
Local Storage Actuel (Baseline 271/271 validée, PROMPT 11 opérationnel)
       │
       ▼
[ PHASE B ]
Déploiement Schéma Supabase + Module de Double Écriture (Dual Write)
- Chaque action persiste en local (synchrone) ET transmet à Supabase (asynchrone)
- Tolérance aux pannes réseau : le local reste maître
       │
       ▼
[ PHASE C ]
Outil de Rapprochement Automatique (Local vs Supabase Reconciliation Check)
- Vérification que pour chaque période : hash local = hash Supabase
       │
       ▼
[ PHASE D ]
Recette et Validation Formelle par les Gestionnaires
- Vérification des états des périodes clôturées (Septembre 2026 intact)
       │
       ▼
[ PHASE E ]
Supabase devient la Source Principale
- Les requêtes lisent en priorité Supabase
- Le stockage local bascule en cache hors-ligne de session
       │
       ▼
[ PHASE F ]
Régime Nominal Supabase + Sauvegardes .mcnss Automatiques
- Supabase pour le travail multi-utilisateurs
- .mcnss pour l'archivage légal souverain et la reprise après sinistre
```

---

## 12. Stratégie de Rollback

En cas d'anomalie réseau, d'erreur de migration ou d'indisponibilité de l'instance Supabase :

1. **Bascule instantanée sur le stockage local :** Le client détecte l'absence de connectivité Supabase et active immédiatement le mode hors-ligne local sans blocage UI.
2. **Restauration via `.mcnss` :** Le service de restauration de PROMPT 11 (`backupService.restoreFullBackup()`) permet de recharger l'état complet certifié en moins de 500 ms.
3. **Immutabilité des identifiants :** Comme les `business_id` ('sal_01', 'paie_0', '2026-09') sont conservés dans Supabase, aucune désynchronisation d'ID n'est possible lors d'un rollback.

---

## 13. Compatibilité avec le Format `.mcnss` (PROMPT 11)

L'introduction de Supabase **ne remplace pas** et **n'altère pas** le format de backup `.mcnss`.

1. **Découplage délibéré :**
   - **Supabase** = Base de données relationnelle transactionnelle (travail quotidien, multi-postes, historisation).
   - **`.mcnss`** = Coffre-fort d'archive cryptographique (SHA-256 déterministe, zéro dépendance Cloud, restauration en un clic).
2. **Export Supabase vers `.mcnss` :** Un endpoint ou une fonction de service pourra requêter Supabase pour exporter directement l'archive `.mcnss` certifiée.
3. **Import `.mcnss` vers Supabase :** Lors d'un sinistre, une archive `.mcnss` pourra peupler une nouvelle instance Supabase vierge en toute conformité.

---

## 14. Matrice d'Analyse des Risques & Mitigations

| Risque Identifié | Gravité | Probabilité | Mesure de Mitigation Conçue |
|---|:---:|:---:|---|
| **Perte ou altération des 271 tests existants** | Critique | Nulle | Les tests tournent sur les moteurs TypeScript purs sans dépendance réseau. |
| **Fuite de données sensibles (CNI, salaires) dans les logs** | Élevée | Faible | Contrainte d'audit stricte : pas de données sensibles en clair dans `audit_logs`. |
| **Modification silencieuse d'une période clôturée** | Critique | Faible | Protection double : validation applicative TypeScript + RLS bloquante PostgreSQL. |
| **Désynchronisation entre jours importés et jours déclarés** | Critique | Nulle | Deux colonnes distinctes dans `payroll_lines` et `reconciliations` (`imported_days` vs `declared_days`). |
| **Suppression accidentelle en cascade de données historiques** | Élevée | Faible | Clés étrangères configurées en `ON DELETE RESTRICT` sur toutes les entités sensibles. |
| **Rupture de connectivité internet** | Moyenne | Moyenne | Maintien du fallback local et du format d'archive `.mcnss` local. |

---

## 15. Plan Directeur Préparatoire pour PROMPT 13 (Non Exécuté)

Lorsque le passage à l'étape suivante sera autorisé par l'utilisateur, les actions prévues seront :
1. Installation ciblée du client Supabase (`@supabase/supabase-js`).
2. Création du connecteur adaptateur `supabaseClient.ts` avec gestion des variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Création du fichier de migration initial `supabase/migrations/20261006_init_cnss_mults.sql` reprenant le DDL validé.
4. Implémentation du service d'initialisation et de synchronisation sans régression sur les 271 tests existants.
