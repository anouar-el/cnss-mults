# RAPPORT D'OPTIMISATION & DE SIMPLIFICATION CNSS MULT.S (PROMPT 10)
## ANALYSE DES REDONDANCES, SURCHARGES COGNITIVES ET RECOMMANDATIONS

---

## 1. Principes Directeurs

Conformément à la règle absolue de **PROMPT 10**, **aucune fonctionnalité n'a été supprimée automatiquement**.
Ce document recense de manière objective les éléments qui présentent une redondance fonctionnelle, une complexité résiduelle ou une opportunité d'allègement futur, avec une analyse d'impact et de dépendances.

---

## 2. Inventaire des Éléments Analysés

### 2.1. Stockage Redondant des Rapprochements et du Registre
- **Fonctionnalité :** Coexistence dans la persistance locale de `cnss_mults_rapprochements_YYYY-MM` et de `cnss_mults_registre_YYYY-MM`.
- **Utilisation actuelle :** 
  - `rapprochements` conserve l'état interactif de validation humaine de l'étape 5 (décisions d'arbitrage, scores, candidats proposés).
  - `registre` conserve la projection consolidée post-validation (statut `VALIDE`, base déclarée, jours déclarés, historique des corrections).
- **Dépendances :** `RapprochementsView.tsx`, `matchingEngine.ts`, `cnssRegisterService.ts`.
- **Risque en cas de modification :** Risque moyen de désynchronisation si l'utilisateur modifie une ligne dans le registre sans répercuter dans le rapprochement.
- **Recommandation :** **CONSERVER EN L'ÉTAT**. La séparation actuelle est conceptuellement saine : le rapprochement est une zone de travail interactive, le registre est le document officiel immuable.

### 2.2. Modale de Comparaison Face-à-Face (`ComparaisonFaceAFaceModal.tsx`)
- **Fonctionnalité :** Affichage comparatif visuel entre la ligne de paie importée et la fiche du salarié en base.
- **Utilisation actuelle :** Invoquée ponctuellement depuis `RapprochementsView` pour les cas litigieux.
- **Dépendances :** `RapprochementsView.tsx`.
- **Risque en cas de modification :** Faible. Aucun calcul critique n'est exécuté dans ce composant d'affichage.
- **Recommandation :** **CONSERVER**. Bien que moins fréquemment utilisée que la modale d'anomalie, elle apporte une valeur ajoutée forte pour le gestionnaire en cas d'homonymie ou de doute sur la CNI.

### 2.3. Multiplicité des Formats de Calcul de Hash
- **Fonctionnalité :** Fonction de hachage `calculerHash` présente dans `cnssDossierService.ts` et `cnssRegisterService.ts`.
- **Utilisation actuelle :** Génération des empreintes d'intégrité (scellé sha256 déterministe).
- **Dépendances :** `cnssDossierService.ts`, `cnssRegisterService.ts`.
- **Risque en cas de modification :** Très faible si factorisé, mais risque de casser la reproductibilité historique des empreintes déjà scellées.
- **Recommandation :** **CONSERVER EN L'ÉTAT**. Ne pas factoriser immédiatement pour préserver la baseline des empreintes calculées dans les tests 06 et 09.

### 2.4. Onglets de Bancs d'Essais dans l'En-tête Applicatif
- **Fonctionnalité :** 11 onglets de tests individuels (`TESTS_P2` à `TESTS_P10`) affichés dans la barre de navigation de `App.tsx`.
- **Utilisation actuelle :** Permet à l'auditeur et à l'utilisateur de constater la validation unitaire de chaque prompt.
- **Dépendances :** `App.tsx`, runners de tests `/src/tests/`.
- **Risque en cas de modification :** Nul sur le métier, mais impact visuel (barre d'onglets allongée).
- **Recommandation :** **CONSERVER DURANT LA VALIDATION**. Ces onglets constituent la preuve formelle et auditable des 187+ tests réussis. En production finale ultra-épurée, ils pourront être regroupés dans un panneau d'administration unique dédié aux audits.

### 2.5. Logs Console Résiduels
- **Fonctionnalité :** `console.log` d'information dans certains parseurs et test runners.
- **Utilisation actuelle :** Suivi d'exécution en environnement de développement.
- **Dépendances :** Aucune dépendance fonctionnelle.
- **Risque en cas de modification :** Nul.
- **Recommandation :** **ÉPURATION SÉCURISÉE (effectuée en PROMPT 10)**. Suppression de toute journalisation console susceptible de faire transiter des identifiants sensibles (CNI, CNSS, salaires).

---

## 3. Synthèse des Recommandations

| Élément Analysé | Statut Immédiat | Action Future Recommandée |
| :--- | :---: | :--- |
| Découplage Rapprochements / Registre | **Maintenu** | Aucun changement, modèle éprouvé. |
| Modale Face-à-Face | **Maintenue** | Conserver pour l'ergonomie de validation. |
| Hachage déterministe | **Maintenu** | Garantir la stricte rétro-compatibilité. |
| Onglets de tests | **Maintenus** | À regrouper éventuellement en post-audit. |
| Nettoyage logs données personnelles | **Effectué** | Sanitisation stricte des flux console. |
