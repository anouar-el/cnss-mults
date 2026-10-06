# AUDIT D'ARCHITECTURE LOGICIELLE CNSS MULT.S (PROMPT 10)
## ANALYSE TECHNIQUE, RESPONSABILITÉS, FLUX ET FACTEURS DE RISQUE

---

## 1. Contexte & Périmètre de l'Audit

L'application **CNSS MULT.S** a été développée de manière incrémentale et rigoureuse du PROMPT 01 au PROMPT 09.
Elle assure la préparation, le contrôle, la consolidation, la certification administrative et l'archivage des déclarations et paiements CNSS pour la société d'intérim **MULT.S SARLAU** (N° Affilié : `6541835`, Agence : `SIDI BELYOUT`).

- **Baseline de départ :** 187 / 187 tests automatisés réussis (100% de succès).
- **TypeScript :** 0 erreur.
- **Règle absolue :** Aucune refactorisation destructrice, préservation intégrale des règles métier existantes.

---

## 2. Cartographie Globale des Composants et Services

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             INTERFACE REACT (UI)                            │
│  App.tsx (Navigation & Orchestration Périodes)                              │
│  ├── RapprochementsView.tsx (P1 - P5)                                       │
│  ├── RegistreCnssView.tsx (P6)                                              │
│  ├── SpecificationExportView.tsx (P7-A)                                     │
│  ├── PreetabliCnssView.tsx (P7-BIS)                                         │
│  ├── BordereauCnssView.tsx & ApercuBordereauCnss.tsx (P7-B)                 │
│  ├── BordereauPaiementView.tsx & ApercuBordereauPaiement.tsx (P8)           │
│  └── ControleFinalCnssView.tsx & ApercuDossierSynthese.tsx (P9)             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            COUCHE SERVICES MÉTIER                           │
│  ├── normalizer.ts (Normalisation CNI, CNSS, Noms, Levenshtein, Tokens)     │
│  ├── matchingEngine.ts (Rapprochement 6 niveaux, Ambiguïté, Statut P5)      │
│  ├── validationEngine.ts (Détection des 8 anomalies, résolutions humaines)  │
│  ├── excelService.ts (Ingestion XLSX/CSV, parsing colonnes, ligne Total)   │
│  ├── cnssRegisterService.ts (Projection immuable, découplage jours/salaires)│
│  ├── cnssExportSpecService.ts (Spécification Export officiel CNSS)          │
│  ├── cnssPreetabliService.ts (Rapprochement Préétabli BDS vs Réel)          │
│  ├── cnssBordereauService.ts (Bordereaux F.212-2-58 et F.212-2-59)          │
│  ├── cnssPaiementService.ts (Calcul Cotisations RG & AMO 511-1-01)          │
│  └── cnssDossierService.ts (Dossier Mensuel Final, Contrôle Tripartite)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       COUCHE PERSISTANCE & MODÈLES                          │
│  ├── persistenceService.ts (Stockage local, fallbacks mémoire, isolats)     │
│  └── types/ (cnss.ts, cnssBordereau.ts, cnssPaiement.ts, cnssDossier.ts...) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Analyse Détaillée des Modules

### 3.1. Normalisation (`normalizer.ts`)
- **Responsabilité :** Transformer les identifiants et chaînes sans jamais altérer les valeurs d'origine.
- **Fonctions clés :**
  - `normaliserNom(texte)` : Nettoyage diacritiques, accents, ponctuation, espaces multiples.
  - `extraireTokensTries(texte)` : Comparaison insensible à l'ordre des prénoms/noms ("IMRAN SAAD" = "SAAD IMRAN").
  - `normaliserCni(cni)` : Suppression des espaces parasites, mise en majuscules (ex: `" BH355016 "` -> `"BH355016"`).
  - `normaliserCnss(cnss)` : Élimination du suffixe `.0` issu d'Excel et des caractères non numériques.
  - `distanceLevenshtein` et `scoreLevenshtein` : Fuzzy matching avec tolérance phonétique et fautes de frappe.
- **Dépendances :** Aucune dépendance externe.
- **Évaluation du risque :** Risque très faible. Fonctions pures, stables et hautement testées.

### 3.2. Moteur de Rapprochement (`matchingEngine.ts`)
- **Responsabilité :** Rapprocher les lignes de paie avec la base CNSS selon une stricte hiérarchie en 6 niveaux.
  - Niveau 1 : CNI exacte (score 100).
  - Niveau 2 : CNSS exacte (score 100).
  - Niveau 3 : Alias validé (score 100).
  - Niveau 4 : Nom normalisé exact (score 100).
  - Niveau 5 : Token Sort (inversion prénom/nom, score 98).
  - Niveau 6 : Fuzzy matching (Levenshtein avec seuil d'ambiguïté si écart < 5%).
- **Règles critiques :**
  - Tout cas ambigu impose un statut `AMBIGU` et interdit toute association automatique.
  - Tout salarié avec score < 80% reste `NON_IDENTIFIE`.
  - Statut P5 calculé strictement via `determinerStatutLigneP5`.
- **Dépendances :** `normalizer.ts`, `persistenceService.ts`.
- **Évaluation du risque :** Risque maîtrisé. La séparation claire des niveaux empêche tout matching opportuniste non désiré.

### 3.3. Moteur d'Anomalies & Validation Humaine (`validationEngine.ts`)
- **Responsabilité :** Détecter et gérer les 8 typologies d'anomalies :
  1. `JOURS_NEGATIFS` (Bloquante)
  2. `JOURS_SUPERIEURS_26` (Bloquante)
  3. `JOURS_ZERO` (Avertissement)
  4. `JOURS_MANQUANTS` (Bloquante)
  5. `CNI_MANQUANTE` (Bloquante pour entrant)
  6. `CNSS_MANQUANTE` (Avertissement / Bloquante)
  7. `DOUBLON_CNSS` / `DOUBLON_CNI` (Bloquante)
  8. `CORRESPONDANCE_AMBIGUE` (Bloquante)
- **Dépendances :** Types CNSS, `persistenceService.ts`.
- **Évaluation du risque :** Faible. Les règles de blocage sont strictes.

### 3.4. Service Registre CNSS (`cnssRegisterService.ts`)
- **Responsabilité :** Transformer les résultats de paie et de rapprochement en Registre CNSS unifié.
- **Principe fondamental :** Découplage strict entre données importées (`joursImportes`, `baseImportee`) et données déclarées (`joursDeclares`, `baseDeclaree`).
- **Immuabilité :** Toute correction manuelle est enregistrée avec motif justificatif dans `corrections` et tracée dans le journal d'audit.
- **Dépendances :** `persistenceService.ts`, `matchingEngine.ts`.
- **Évaluation du risque :** Modéré. Fichier central dans le cycle de vie de la déclaration.

### 3.5. Bordereaux Déclaration Salariés (`cnssBordereauService.ts`)
- **Responsabilité :** Séparer les salariés ordinaires (formulaire `F.212-2-58`) et les salariés entrants (formulaire `F.212-2-59`).
- **Pagination :** Découpage strict en pages de 12 salariés avec cumuls de page et récapitulatif global.
- **Dépendances :** Types `cnssBordereau.ts`, `persistenceService.ts`.
- **Évaluation du risque :** Faible. Projection purement en lecture seule.

### 3.6. Bordereau de Paiement des Cotisations (`cnssPaiementService.ts`)
- **Responsabilité :** Calcul des cotisations CNSS du Régime Général (RG) et de l'Assurance Maladie Obligatoire (AMO) selon le formulaire officiel `511-1-01`.
- **Règles officielles :**
  - Prestations Sociales : 13.06% (plafonné à 6 000 MAD par salarié).
  - Allocations Familiales : 6.40% (non plafonné).
  - Taxe Formation Professionnelle : 1.60% (non plafonné).
  - AMO Participation Ouvrière : 1.85% (non plafonné).
  - AMO Solidarité Patronale : 4.52% (non plafonné).
- **Dépendances :** Types `cnssPaiement.ts`, `persistenceService.ts`.
- **Évaluation du risque :** Critique. Les calculs financiers doivent rester strictement constants.

### 3.7. Dossier CNSS Mensuel Final (`cnssDossierService.ts`)
- **Responsabilité :** Agrégation finale, contrôle croisé tripartite (Registre vs Bordereau Salariés vs Bordereau Paiement), scellement par empreinte déterministe sha256, clôture définitive et réouverture encadrée avec motif.
- **Contrôles obligatoires :** 14 contrôles vérifiés préalablement à toute validation.
- **Dépendances :** `cnssBordereauService.ts`, `cnssPaiementService.ts`, `persistenceService.ts`.
- **Évaluation du risque :** Modéré. Module très robuste scellé par empreinte.

### 3.8. Service de Persistance (`persistenceService.ts`)
- **Responsabilité :** Gestion du stockage local avec compatibilité universelle (navigateur `localStorage` et fallback mémoire pour les tests unitaires et environnements sans DOM).
- **Isolation :** Préfixes de clés stricts par période (`cnss_mults_paie_lignes_YYYY-MM`, `cnss_mults_registre_YYYY-MM`...).
- **Dépendances :** Types CNSS, `normalizer.ts`.
- **Évaluation du risque :** Clé de voûte de la persistance. Doit être protégée contre toute réinitialisation intempestive.

---

## 4. Analyse des Dépendances & Risques de Régression

| Composant / Module | Dépendances Amont | Dépendances Aval | Risque de Régression | Action Recommandée |
| :--- | :--- | :--- | :---: | :--- |
| `normalizer.ts` | Aucune | Tous les services | **Très Faible** | Conserver intact, zéro modification non documentée. |
| `matchingEngine.ts` | `normalizer`, `persistence` | `App.tsx`, `cnssRegisterService` | **Moyen** | Couvrir les cas limites d'ambiguïté et de doublons. |
| `cnssRegisterService.ts` | `matchingEngine`, `persistence` | `Bordereaux`, `Dossier` | **Élevé** | Sanctuariser l'immuabilité de `joursImportes`. |
| `cnssPaiementService.ts` | `cnssRegisterService`, `persistence` | `App.tsx`, `cnssDossierService` | **Critique** | Contrôle croisé strict de la formule de calcul. |
| `cnssDossierService.ts` | Tous les services amont | `App.tsx`, `ControleFinalCnssView` | **Élevé** | Vérifier systématiquement les 14 verrous de sécurité. |
| `persistenceService.ts` | Aucune (sauf types) | Tous les modules | **Critique** | Valider l'étanchéité des périodes et l'idempotence des sauvegardes. |

---

## 5. Synthèse & Conclusion de l'Audit d'Architecture

L'architecture actuelle de **CNSS MULT.S** présente :
1. Une **séparation des responsabilités exemplaire** (normalisation → matching → validation humaine → registre immuable → bordereaux officiels → paiement → dossier final scellé).
2. Un respect strict du principe de **projection en lecture seule** pour les documents administratifs de sortie.
3. Une **traçabilité inaltérable** par journal d'audit chronologique.
4. Aucun couplage dangereux ni dépendance circulaire identifiée.

Aucune refactorisation structurelle n'est requise ; la phase PROMPT 10 se concentre sur le durcissement, la détection des cas limites et la validation par les bancs de tests exhaustifs.
