# CNSS MULT.S — Déclaration & Télé-déclaration CNSS
**SARLAU MULT.S — N° Affilié CNSS : 6541835**

Application web complète de gestion, rapprochement paie / préétabli CNSS, détection et correction des anomalies, calcul des cotisations (Plafond 6 000 DH, AMO 4.11%, Taxe Formation Professionnelle 1.60%, Prestations Sociales 21.09%), génération du Registre CNSS, bordereaux de paiement et télé-déclaration.

---

## 🚀 Fonctionnalités Clés

- **Rapprochement intelligent** : Réconciliation multi-critères entre le fichier de paie mensuel et le référentiel CNSS (matricule, CNI, similarité fuzzy Levenshtein).
- **Gestion des Ambigus & Anomalies** :
  - Sélection et arbitrage immédiat des salariés ambigus.
  - Correction directe des jours (0 à 26 j), du salaire brut, du CNI, et de l'immatriculation CNSS.
  - Levée d'anomalie administrative avec motif d'audit.
- **Workflow en 10 étapes** : Import paie, vérification base, rapprochement, validation des entrées/sorties, registre, contrôle final, bordereau de cotisations, télédéclaration et clôture mensuelle.
- **Sauvegarde & Restauration `.mcnss`** : Sauvegarde chiffrée avec contrôle d'intégrité SHA-256, restauration atomique avec rollback.
- **Architecture Supabase / PostgreSQL** : Schéma relationnel prêt pour la synchronisation Cloud avec RLS multi-tenant (`company_id: 6541835`).

---

## 🛠️ Installation & Démarrage

```bash
# 1. Cloner le dépôt
git clone <URL_DU_REPO>
cd cnss-mults

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY

# 4. Lancer le serveur de développement
npm run dev

# 5. Compiler pour la production
npm run build
```

---

## 🧪 Tests

La suite comprend **271 tests unitaires et d'intégration** validant l'ensemble des règles métier CNSS marocaines :

```bash
# Exécution du contrôle de types
npm run lint

# Exécution de la suite de tests complète (Prompt 01 à 11)
node --import tsx -e "
import { executerTestsSeptembre } from './src/tests/testRunner.ts';
import { executerTestsPrompt02 } from './src/tests/testPrompt02.ts';
import { executerTestsPrompt03 } from './src/tests/testPrompt03.ts';
import { executerTestsPrompt04 } from './src/tests/testPrompt04.ts';
import { executerTestsPrompt05 } from './src/tests/testPrompt05.ts';
import { executerTestsPrompt06 } from './src/tests/testPrompt06.ts';
import { executerTestsPrompt07A } from './src/tests/testPrompt07A.ts';
import { executerTestsPrompt07Bis } from './src/tests/testPrompt07Bis.ts';
import { executerTestsPrompt07B } from './src/tests/testPrompt07B.ts';
import { executerTestsPrompt08 } from './src/tests/testPrompt08.ts';
import { executerTestsPrompt09 } from './src/tests/testPrompt09.ts';
import { executerTestsPrompt10 } from './src/tests/testPrompt10.ts';
import { executerTestsPrompt11 } from './src/tests/testPrompt11.ts';
"
```

---

## 🔒 Sécurité & Conformité

- **Plafond CNSS** : 6 000,00 DH par salarié / mois.
- **Taux de cotisation** :
  - Prestations sociales : 21.09% (Allocations familiales 6.40% + Prestations sociales 14.69% dont part salariale 4.48% et part patronale 16.61%).
  - Assurance Maladie Obligatoire (AMO) : 4.11% (Part salariale 2.26%, part patronale 1.85%).
  - Taxe Formation Professionnelle : 1.60% (Part patronale exclusive sur salaire brut non plafonné).
  - Participation AMO : 1.85%.
- **Persistance locale + Supabase** : Synchronisation miroir avec validation d'intégrité avant écriture.
