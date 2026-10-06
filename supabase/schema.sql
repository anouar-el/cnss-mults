-- ============================================================================
-- SCHÉMA OFFICIEL SUPABASE POSTGRESQL — APPLICATION CNSS MULT.S (PROMPT 16)
-- SARLAU MULT.S — N° AFFILIATION CNSS : 6541835
-- 
-- INSTRUCTIONS :
-- 1. Ouvrez votre projet Supabase (https://supabase.com/dashboard)
-- 2. Allez dans le menu "SQL Editor"
-- 3. Collez l'intégralité de ce script et cliquez sur "Run"
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLE : companies
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(120) NOT NULL,
    legal_form VARCHAR(20) NOT NULL DEFAULT 'SARLAU',
    rc_number VARCHAR(30) NOT NULL DEFAULT '489210',
    fiscal_id VARCHAR(30) NOT NULL DEFAULT '40291823',
    ice_number VARCHAR(30) NOT NULL DEFAULT '002391029000045',
    cnss_affiliation_number VARCHAR(15) NOT NULL UNIQUE,
    cnss_agency VARCHAR(50) NOT NULL DEFAULT 'Casablanca Sidi Maârouf',
    address TEXT NOT NULL DEFAULT '120 BD ABDELMOUMEN, ÉTAGE 4, CASABLANCA',
    city VARCHAR(50) NOT NULL DEFAULT 'Casablanca',
    code_form_ordinary VARCHAR(20) NOT NULL DEFAULT 'F.212-2-58',
    code_form_entrants VARCHAR(20) NOT NULL DEFAULT 'F.212-2-59',
    lines_per_page INT NOT NULL DEFAULT 12 CHECK (lines_per_page > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertion de la société par défaut MULT.S (Affilié 6541835)
INSERT INTO public.companies (cnss_affiliation_number, business_name, cnss_agency, address, city)
VALUES ('6541835', 'STE MULT.S', 'Casablanca Sidi Maârouf', '120 BD ABDELMOUMEN, ÉTAGE 4, CASABLANCA', 'Casablanca')
ON CONFLICT (cnss_affiliation_number) DO NOTHING;

-- 2. TABLE : employees
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(20) NOT NULL DEFAULT '6541835',
    business_id VARCHAR(50) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    normalized_name VARCHAR(120) NOT NULL,
    cni VARCHAR(20),
    cnss_number VARCHAR(15),
    situation VARCHAR(25) NOT NULL DEFAULT 'ACTIF',
    original_situation_code VARCHAR(10),
    first_seen_period VARCHAR(7) NOT NULL DEFAULT '2026-09',
    last_declaration_period VARCHAR(7),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_employee_business_id UNIQUE (company_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_employees_normalized_name ON public.employees(company_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_employees_cni ON public.employees(company_id, cni);
CREATE INDEX IF NOT EXISTS idx_employees_cnss ON public.employees(company_id, cnss_number);

-- 3. TABLE : employee_aliases
CREATE TABLE IF NOT EXISTS public.employee_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(20) NOT NULL DEFAULT '6541835',
    employee_business_id VARCHAR(50) NOT NULL,
    raw_alias VARCHAR(120) NOT NULL,
    normalized_alias VARCHAR(120) NOT NULL,
    official_name VARCHAR(120) NOT NULL,
    cni VARCHAR(20),
    cnss VARCHAR(15),
    created_in_period VARCHAR(7) NOT NULL DEFAULT '2026-09',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_alias UNIQUE (company_id, normalized_alias)
);

-- 4. TABLE : periods
CREATE TABLE IF NOT EXISTS public.periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(20) NOT NULL DEFAULT '6541835',
    month_id VARCHAR(7) NOT NULL,
    label VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'BROUILLON',
    workflow_step INT NOT NULL DEFAULT 1,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lignes_paie_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_company_period UNIQUE (company_id, month_id)
);

-- 5. TABLE : reconciliations (Table clé pour la persistance des validations)
CREATE TABLE IF NOT EXISTS public.reconciliations (
    id VARCHAR(100) PRIMARY KEY,
    company_id VARCHAR(20) NOT NULL DEFAULT '6541835',
    period_id VARCHAR(7) NOT NULL,
    payroll_line_id VARCHAR(100) NOT NULL,
    suggested_employee_id VARCHAR(50),
    score INT NOT NULL DEFAULT 0,
    second_score INT,
    score_gap INT,
    method VARCHAR(50) NOT NULL DEFAULT 'AUCUNE',
    status VARCHAR(50) NOT NULL DEFAULT 'CORRESPONDANCE_UNIQUE',
    p5_status VARCHAR(50) NOT NULL DEFAULT 'A_VALIDER',
    validation_status VARCHAR(50) NOT NULL DEFAULT 'A_VALIDER',
    is_ambiguous BOOLEAN NOT NULL DEFAULT FALSE,
    is_human_validated BOOLEAN NOT NULL DEFAULT FALSE,
    is_new_employee_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    departure_decision VARCHAR(50),
    declared_days NUMERIC(5,2) NOT NULL DEFAULT 0,
    days_modification_justification TEXT,
    days_manually_modified BOOLEAN NOT NULL DEFAULT FALSE,
    final_declared_name VARCHAR(120),
    final_declared_cni VARCHAR(20),
    final_declared_cnss VARCHAR(15),
    final_declared_salary NUMERIC(12,2),
    ambiguous_candidates_json JSONB DEFAULT '[]'::jsonb,
    explanation TEXT DEFAULT '',
    decision_date TIMESTAMPTZ,
    raw_data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reconciliation_line UNIQUE (period_id, payroll_line_id)
);

CREATE INDEX IF NOT EXISTS idx_reconciliations_period ON public.reconciliations(company_id, period_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_validation ON public.reconciliations(company_id, period_id, validation_status);

-- 6. TABLE : audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(20) NOT NULL DEFAULT '6541835',
    action VARCHAR(60) NOT NULL,
    actor_name VARCHAR(100) NOT NULL DEFAULT 'Gestionnaire MULT.S',
    affected_employee_name VARCHAR(120),
    old_value TEXT,
    new_value TEXT,
    justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- Permissives pour la clé publique (anon) et les utilisateurs authentifiés
-- avec partitionnement strict par company_id: '6541835'
-- ============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Accès complet companies
CREATE POLICY "companies_all_access" ON public.companies
    FOR ALL TO anon, authenticated
    USING (cnss_affiliation_number = '6541835')
    WITH CHECK (cnss_affiliation_number = '6541835');

-- Accès complet employees
CREATE POLICY "employees_all_access" ON public.employees
    FOR ALL TO anon, authenticated
    USING (company_id = '6541835')
    WITH CHECK (company_id = '6541835');

-- Accès complet employee_aliases
CREATE POLICY "aliases_all_access" ON public.employee_aliases
    FOR ALL TO anon, authenticated
    USING (company_id = '6541835')
    WITH CHECK (company_id = '6541835');

-- Accès complet periods
CREATE POLICY "periods_all_access" ON public.periods
    FOR ALL TO anon, authenticated
    USING (company_id = '6541835')
    WITH CHECK (company_id = '6541835');

-- Accès complet et UPDATE sur reconciliations
CREATE POLICY "reconciliations_all_access" ON public.reconciliations
    FOR ALL TO anon, authenticated
    USING (company_id = '6541835')
    WITH CHECK (company_id = '6541835');

-- Accès audit_logs
CREATE POLICY "audit_logs_all_access" ON public.audit_logs
    FOR ALL TO anon, authenticated
    USING (company_id = '6541835')
    WITH CHECK (company_id = '6541835');

-- Accorder les permissions au schéma public pour les rôles anon et authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
