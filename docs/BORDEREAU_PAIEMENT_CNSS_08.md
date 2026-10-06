# MODULE DE CALCUL & BORDEREAU DE PAIEMENT DES COTISATIONS CNSS MULT.S (PROMPT 08)

## 1. Contexte & Documents de Référence Métier

Le module **Bordereau de Paiement des Cotisations CNSS** est conforme au document administratif officiel CNSS Maroc :
- **Référence officielle du formulaire :** `511-1-01` (Indice `03`)
- **Volet 1 (Page 1) :** *Régime Général* (Allocations Familiales, Prestations Sociales, Taxe de Formation Professionnelle)
- **Volet 2 (Page 2) :** *Assurance Maladie Obligatoire (AMO)* (Participation AMO, Cotisations AMO)

---

## 2. Séparation Stricte des Deux Bordereaux

L'architecture MULT.S maintient une séparation étanche entre :
1. **Bordereau de Déclaration des Salariés (PROMPT 07-B) :**
   - Formulaire `F.212-2-58` (Salariés Ordinaires et Sortants avec code situation `SO`)
   - Formulaire `F.212-2-59` (Nouveaux Entrants avec CNI obligatoire)
   - Contenu : N° Immatriculation CNSS, Nom & Prénom, Jours Déclarés, CNI, Situation.
2. **Bordereau de Paiement des Cotisations (PROMPT 08) :**
   - Formulaire `511-1-01` (Régime Général & AMO)
   - Contenu : Masses salariales (déplafonnée et plafonnée), taux légaux confirmés, cotisations par case, total global dû.

---

## 3. Données Source & Hiérarchie des Valeurs Financières

Le générateur de paiement est une **projection en lecture seule** à partir du **Registre CNSS validé** :
- **Règle d'or :** Ne modifie jamais le registre, les jours déclarés, les salaires déclarés ou l'audit.
- **Assiette individuelle :** Utilise rigoureusement `salaireBrutDeclare` (ou `baseDeclaree`). Jamais `salaireBrutImporte` lorsqu'une valeur déclarée validée existe.
- **Plafonnement Prestations Sociales :** Plafond légal de **6 000,00 MAD** par salarié (`Math.min(salaireBrutDeclare, 6000)`).
- **Assiettes Déplafonnées :** Allocations Familiales (6,40%), TFP (1,60%), Participation AMO (1,85%), Cotisation AMO (4,52%).

---

## 4. Référentiel des Taux Officiels & Cases du Formulaire

| Volet | Case | Désignation Rubrique | Assiette Retenue | Taux Total | Part Patronale | Part Salariale | Plafond | Statut |
| :--- | :---: | :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **Régime Général** | **1** | Allocations Familiales | Masse brute totale | **6,40 %** | 6,40 % | 0,00 % | Aucun | CONFIRMÉ |
| **Régime Général** | **2** | Prestations Sociales | Masse plafonnée | **13,46 %** | 8,98 % | 4,48 % | 6 000 MAD/sal. | CONFIRMÉ |
| **Régime Général** | **3** | *Total Cotisations Versées (1 + 2)* | - | - | - | - | - | CALCULÉ |
| **Régime Général** | **8** | Taxe Formation Professionnelle (TFP) | Masse brute totale | **1,60 %** | 1,60 % | 0,00 % | Aucun | CONFIRMÉ |
| **Régime Général** | **10**| **Montant Global Régime Général (3 + 8)** | - | - | - | - | - | **TOTAL RG** |
| **Volet AMO** | **1** | Participation AMO | Masse brute totale | **1,85 %** | 1,85 % | 0,00 % | Aucun | CONFIRMÉ |
| **Volet AMO** | **2** | Cotisation AMO | Masse brute totale | **4,52 %** | 2,26 % | 2,26 % | Aucun | CONFIRMÉ |
| **Volet AMO** | **3** | *Total Cotisations AMO (1 + 2)* | - | - | - | - | - | CALCULÉ |
| **Volet AMO** | **10**| **Montant Global AMO (Case 3)** | - | - | - | - | - | **TOTAL AMO** |

*Règle absolue :* Aucun taux non officiellement documenté n'a été inventé. Toute rubrique sans formule certaine est marquée `À CONFIRMER` et bloque le calcul.

---

## 5. Contrôle Croisé Tripartite

Avant toute validation du paiement, le moteur exécute un contrôle croisé strict :
1. **Concordance Registre :**
   - Aucune anomalie bloquante non résolue.
   - Toutes les lignes déclarées sont marquées `valide: true`.
   - Présence obligatoire du numéro d'affilié CNSS (`6541835`).
2. **Concordance Déclaration des Salariés (07-B) :**
   - Égalité stricte de l'effectif déclaré.
   - Égalité stricte du cumul des jours déclarés.
3. **Concordance Réglementaire :**
   - 100% des taux appliqués sont confirmés et actifs.

---

## 6. Validation Formelle, Verrouillage & Réouverture

- **Validation Humaine :** Saisie du signataire habilité (ex: *Directeur Financier*), horodatage ISO, empreinte cryptographique SHA-256 (hash) et basculement du statut en `VALIDE` & `verrouille: true`.
- **Réouverture Encadrée :** Nécessite obligatoirement un motif justificatif d'au moins 5 caractères consigné dans l'audit.

---

## 7. Bilan du Banc de Tests Automatisés (PROMPT 08)

Le banc de test `/src/tests/testPrompt08.ts` valide **27 / 27** cas d'exigences :
- Calcul exact sur exemple historique CNSS (34 281,71 MAD RG + 10 175,88 MAD AMO = 44 457,59 MAD).
- Détection des lignes non validées ou écarts d'effectif / jours.
- Blocage si absence d'affiliation CNSS ou taux non confirmé.
- Conversion en toutes lettres en Dirhams marocains.
- Export administratif CSV.

### Bilan Global CNSS MULT.S :
- **PROMPT 01 à PROMPT 07-B :** 135 / 135 tests réussis
- **PROMPT 08 :** 27 / 27 tests réussis
- **TOTAL GLOBAL :** **162 / 162 tests réussis (100% de réussite)**
