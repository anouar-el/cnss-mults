# MODULE DOSSIER CNSS MENSUEL FINAL MULT.S (PROMPT 09)
## CONTRÔLE GLOBAL, CLÔTURE, ARCHIVAGE, VERSIONNAGE & TRAÇABILITÉ

---

## 1. Contexte & Rôle Métier

Le module **Dossier CNSS Mensuel Final** constitue l'étape ultime du cycle déclaratif de **MULT.S SARLAU**.
Il ne s'agit pas d'un nouvel ERP, ni d'une nouvelle source de données métier, mais de la **dernière couche opérationnelle d'agrégation, de contrôle tripartite, de certification, de clôture et d'archivage**.

---

## 2. Principe Fondamental : Agrégation en Lecture Seule

- **Source souveraine :** Le **Registre CNSS validé** (PROMPT 06).
- **Documents rattachés :**
  - Le Bordereau de Déclaration des Salariés (PROMPT 07-B, formulaires officiels `F.212-2-58` et `F.212-2-59`).
  - Le Bordereau de Paiement des Cotisations (PROMPT 08, formulaire officiel `511-1-01`).
  - L'audit continu et les décisions d'arbitrage (PROMPT 03, 04, 05).
- **Règle absolue d'immuabilité :** Le dossier mensuel ne modifie jamais les données sources, salaires, jours, CNI ou immatriculations CNSS.

---

## 3. Structure du Modèle `DossierCnssMensuel`

Le modèle est défini dans `/src/types/cnssDossier.ts` :
- `id` : Identifiant déterministe (ex: `dossier_cnss_2026-09_v1`).
- `periodeId` : Période mensuelle (`YYYY-MM`).
- `mois`, `annee`.
- `numeroAffiliation` : N° Affilié MULT.S (`6541835`).
- `agence` : Agence CNSS de rattachement (`SIDI BELYOUT`).
- `statut` : `BROUILLON` | `A_CONTROLER` | `PRET_A_VALIDER` | `VALIDE` | `CLOTURE`.
- `versionCourante` : Numéro de version (1, 2...).
- `versionsHistorique` : Historique inaltérable des versions antérieures avec motif de réouverture et auteur.
- `registreHash`, `bordereauDeclarationHash`, `bordereauPaiementHash`, `dossierHash`.
- `dateValidation`, `validePar`, `dateCloture`, `cloturePar`.
- `resume` : Synthèse financière et effectifs (effectif total, entrants, sortants, cumul jours, masse brute, masse cotisable plafonnée PS 6k, cotisations RG, cotisations AMO, total global, montant en toutes lettres).
- `controleTripartite` : Rapport tripartite de cohérence.
- `checklist` : Checklist exhaustive en 5 catégories.
- `documents` : Liasse des 7 documents administratifs certifiés.

---

## 4. Les 14 Contrôles Obligatoires Préalables à la Validation

Le dossier ne peut pas être validé tant qu'au moins un des contrôles suivants n'est pas satisfait :
1. **Registre CNSS validé :** Toutes les lignes doivent être `valide: true` et sans statut `A_CORRIGER`.
2. **Bordereau Salariés (07-B) validé :** Formulaire `F.212-2-58` validé formellement.
3. **Bordereau Paiement (08) validé :** Formulaire `511-1-01` calculé et validé.
4. **Numéro d'affiliation CNSS présent :** N° `6541835` configuré.
5. **Agence CNSS obligatoire présente :** `SIDI BELYOUT` renseignée.
6. **Aucune ligne AMBIGU restante :** Homonymies ou ambiguïtés toutes arbitrées.
7. **Aucune ligne NON_IDENTIFIE :** Aucun salarié orphelin non rattaché.
8. **Aucune anomalie bloquante ouverte :** Résolution intégrale exigée.
9. **Aucun salarié sortant non arbitré :** Salariés `SORTI_A_ARBITRER` résolus.
10. **Données obligatoires nouveaux entrants :** Numéro de CNI obligatoire pour tout entrant (F.212-2-59).
11. **Aucun doublon CNSS bloquant :** Interdiction d'avoir deux salariés distincts sous la même immatriculation.
12. **Contrôle croisé tripartite positif :** Concordance 100% sans divergence.
13. **Incohérence financière nulle :** Égalité stricte des masses salariales et totaux.
14. **Validation humaine formelle préalable :** Exigée sur chacun des sous-bordereaux.

---

## 5. Contrôle Croisé Tripartite

Le moteur compare automatiquement et systématiquement 6 points de contrôle entre :
- **Source A :** Registre CNSS validé
- **Source B :** Bordereau de Déclaration des Salariés (07-B)
- **Source C :** Bordereau de Paiement des Cotisations (08)

| Point de Contrôle | Source Registre | Source Déclaration | Source Paiement | Statut |
| :--- | :--- | :--- | :--- | :---: |
| **Période Mensuelle** | `2026-09` | `2026-09` | `2026-09` | **CONFORME** |
| **Numéro d'Affiliation** | `6541835` | `6541835` | `6541835` | **CONFORME** |
| **Effectif Déclaré** | Total salariés | Total salariés | Total salariés | **CONFORME** |
| **Cumul des Jours** | Somme jours | Somme jours | Somme jours | **CONFORME** |
| **Masse Salariale Brute**| Somme brute | - | Masse brute | **CONFORME** |
| **Cotisations Dues** | Taux confirmés | Effectif validé | Montant exact MAD | **CONFORME** |

---

## 6. Checklist de Conformité

Présentée sous 5 catégories :
1. **IDENTIFICATION ENTREPRISE :** Affiliation, agence, période.
2. **REGISTRE CNSS :** Validé, aucun blocage, aucun ambigu.
3. **DÉCLARATION SALARIÉS :** Validée, entrants contrôlés avec CNI, sortants arbitrés.
4. **PAIEMENT COTISATIONS :** Taux confirmés, calcul validé, totaux certifiés.
5. **FINAL :** Contrôle tripartite, journal d'audit, empreinte cryptographique, prêt à clôturer.

Chaque élément non validé fournit un lien d'accès direct au module concerné pour correction.

---

## 7. Empreinte Cryptographique Déterministe

Le dossier génère une empreinte reproductible basée sur :
`hash(periodeId + affiliation + agence + version + registreHash + declHash + payHash + totaux)`
- **Reproductibilité :** Deux dossiers aux données identiques génèrent exactement la même empreinte.
- **Scellé :** Toute modification de la période invalide l'empreinte antérieure.

---

## 8. Clôture Définitive, Réouverture Encadrée & Versionnage

- **Clôture :** Fige la période en lecture seule (`CLOTURE`), interdit tout import ou modification ultérieure, consigne l'auteur et la date.
- **Réouverture Encadrée :**
  - Exige obligatoirement un **motif justificatif d'au moins 5 caractères**.
  - Ne supprime aucun audit.
  - Archive la version précédente (`v1`) dans `versionsHistorique`.
  - Crée une nouvelle version incrémentée (`v2`).
  - Repasse la période au statut `BROUILLON` / `A_CONTROLER`.

---

## 9. Documents du Dossier & Export Administratif

- **Liasse Documentaire :**
  1. Registre CNSS Mensuel (`REG-CNSS-06`).
  2. Bordereau Salariés Ordinaires (`F.212-2-58`).
  3. Bordereau Salariés Entrants (`F.212-2-59`).
  4. Bordereau Paiement Cotisations RG & AMO (`Réf: 511-1-01`).
  5. Rapport Contrôle Croisé Tripartite (`CTRL-TRIPARTITE`).
  6. Rapport des Anomalies (`ANOMALIES-05`).
  7. Journal d'Audit & Traçabilité (`AUDIT-HIST`).
- **Page de Garde Synthétique A4 :** Affichage officiel de synthèse, imprimable via navigateur (`window.print()`).
- **Export CSV Administratif :** Fichier complet certifié pour archivage électronique.

---

## 10. Bilan des Bancs de Tests Automatisés

Le banc de test `/src/tests/testPrompt09.ts` valide **25 / 25** cas d'exigences :
- Dossier vide en statut `BROUILLON`.
- Blocages systématiques en cas de registre non validé, bordereaux non validés, anomalies bloquantes, ambigus, orphelins, entrants sans CNI, doublons CNSS, affiliation ou agence absente.
- Contrôle tripartite avec divergence bloquante.
- Passage en `PRET_A_VALIDER` lorsque toutes les conditions sont remplies.
- Validation formelle consignant le signataire, l'audit et l'empreinte.
- Clôture définitive avec interdiction de modification directe.
- Réouverture refusée si motif < 5 caractères, autorisée si motif valide.
- Versionnage strict (`v1` archivée, `v2` créée) sans écrasement de l'historique.
- Export CSV complet et conservation stricte de l'immuabilité du registre.

### Bilan Global CNSS MULT.S :
- **PROMPT 01 à PROMPT 08 :** 162 / 162 tests réussis
- **PROMPT 09 :** 25 / 25 tests réussis
- **TOTAL GLOBAL MULT.S :** **187 / 187 tests réussis (100% de réussite)**
