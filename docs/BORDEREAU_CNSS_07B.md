# BORDEREAU DE DÉCLARATION DES SALARIÉS CNSS — SPÉCIFICATION TECHNIQUE & RAPPORT PROMPT 07-B

**Application :** CNSS MULT.S (Gestion Intérim & Préparation Déclarations CNSS)  
**Document :** Moteur de Génération du Bordereau de Déclaration des Salariés  
**Version :** 2026.1-PROMPT07B  
**Date :** Octobre 2026  
**Auteur :** Moteur de Développement AI Studio Build  
**Statut :** Validé (135/135 tests réussis, 0 régression)

---

## 1. DOCUMENTS DE RÉFÉRENCE OFFICIELS CNSS MAROC

L'architecture du générateur reproduit fidèlement la présentation et les exigences des deux formulaires officiels CNSS réels fournis dans le dossier :

### A. Formulaire F.212-2-58 : BORDEREAU DE DÉCLARATION DES SALARIÉS (ورقة التصريح بالأجراء)
- **Destiné à :** Tous les salariés affiliés réguliers ainsi que les salariés sortants (`situation = 'SO'`).
- **En-tête :**
  - Titre bilingue : `BORDEREAU DE DÉCLARATION DES SALARIÉS` / `ورقة التصريح بالأجراء`
  - Logo CNSS : `الضمان الإجتماعي / CNSS`
  - `EMIS LE` / `تاريخ الإصدار` : Date d'émission au format `DD/MM/YYYY`
  - `Référence structurée` / `المرجع التركيبي` : Ex `654183526080179`
  - Bloc Entreprise : `STE MULT.S`, adresse (`77 RUE MOHAMED SMIHA ETG 10 N 57`), ville (`CASABLANCA`).
  - Bloc Gestion :
    - `N° Affilié` / `رقم المنخرط` : 7 chiffres (ex: `6541835`)
    - `Agence` / `الوكالة` : Agence CNSS de rattachement (ex: `SIDI BELYOUT`)
    - `Mois` / `الشهر` : Mois de déclaration (ex: `8` ou `9`)
    - `Année` / `السنة` : Année (ex: `2026`)
    - `Page` / `الصفحة` : Numéro de page courante / Total de pages (ex: `1 / 5`)
- **Colonnes Salariés :**
  1. `N° immatriculé` / `رقم المسجل` (9 chiffres stricts)
  2. `Nom et prénom` / `الإسم العائلي والشخصي`
  3. `Nombre de jours` / `عدد الأيام` (Strictement issu de `joursDeclares`, max 26)
  4. `Situation` / `الوضعية` (Vide si actif ordinaire, `SO` pour Sorti, `AT` pour Accident de travail, `MT` pour Maternité)
- **Pied de page :**
  - `Signature et cachet de l'employeur` / `طابع و امضاء المشغل` : `A ... le ... / بتاريخ`
  - `TOTAL CUMULE DE LA PAGE ET DES PAGES PRECEDENTES` / `مجموع الصفحة والصفحات السابقة`
  - Total des jours de la page, Total cumulé précédent, Total cumulé global
  - Mention légale : `NB: pour de plus amples informations se referer aux instructions de`
  - Code formulaire : `F.212-2-58`

---

### B. Formulaire F.212-2-59 : BORDEREAU DE DÉCLARATION DES SALARIÉS ENTRANTS (ورقة التصريح بالأجراء الجدد)
- **Destiné à :** Les salariés déclarés pour la première fois (nouveaux entrants validés dans le workflow MULT.S).
- **En-tête :**
  - Titre bilingue : `BORDEREAU DE DÉCLARATION DES SALARIÉS ENTRANTS` / `ورقة التصريح بالأجراء الجدد`
  - Bloc Entreprise : `STE MULT.S`, `N° Affilié` (`6541835`), `Ville` (`CASABLANCA`).
  - Bloc Gestion : `N° Affilié`, `Agence`, `Mois`, `Année`, `Page` (ex: `1 / 2`).
- **Colonnes Salariés :**
  1. `N° immatriculé` / `رقم المسجل` (9 chiffres stricts)
  2. `Nom et prénom` / `الإسم العائلي والشخصي`
  3. `CNI` / `بطاقة التعريف الوطنية` (**STRICTEMENT OBLIGATOIRE** pour les entrants)
  4. `Nbre de jours` / `عدد الأيام` (issu de `joursDeclares`)
- **Pied de page :**
  - Cachet et signature de l'employeur
  - Total cumulé de la page et des pages précédentes
  - Code formulaire : `F.212-2-59`

---

## 2. SÉPARATION ABSOLUE AVEC LE BORDEREAU DE PAIEMENT

Conformément à la directive formelle :
- Le bordereau de paiement des cotisations (masses salariales, taux plafonnés/déplafonnés, cotisations patronales/salariales, montant global à verser) **NE FAIT PAS PARTIE** de ce module de déclaration des salariés.
- Il est strictement réservé pour un module ultérieur dédié (`BordereauPaiementCnss`).
- Le présent moteur gère uniquement les jours de travail, matricules, CNI, noms et situations administratives.

---

## 3. RÈGLE D'IMMUABILITÉ & ARCHITECTURE

```
   [ REGISTRE CNSS SCELLÉ ] (Lecture seule absolue)
              │
              ▼
   [ CONTRÔLE D'ÉLIGIBILITÉ EXHAUSTIF ]
      (Affiliation, Agence, CNSS 9 chiffres, CNI entrants,
       Jours <= 26, Pas de doublons, Pas d'anomalies bloquantes)
              │
              ▼
   [ CLASSIFICATION DES LIGNES ]
       ├── SALARIE_ORDINAIRE ──> Formulaire F.212-2-58 (Situation vide)
       ├── SALARIE_SORTANT   ──> Formulaire F.212-2-58 (Situation 'SO')
       └── SALARIE_ENTRANT   ──> Formulaire F.212-2-59 (CNI obligatoire)
              │
              ▼
   [ MOTEUR DE PAGINATION (12 lignes/page) ]
              │
              ▼
   [ VALIDATION HUMAINE & VERROUILLAGE ]
              │
              ▼
   [ APERÇU / IMPRESSION A4 PAYSAGE & EXPORT CSV INTERNE ]
```

### Protection des données source :
- Le générateur est une **projection pure sans effet de bord**.
- `joursImportes` et `joursDeclares` demeurent strictement immuables dans le registre.
- Cas `joursImportes = 27` et `joursDeclares = 26` : le bordereau affiche `26`, le registre conserve `27`.
- Cas `joursImportes < 0` non régularisé : Génération formellement bloquée.

---

## 4. CONTRÔLES D'ÉLIGIBILITÉ STRICTS (`verifierEligibiliteBordereau`)

Avant toute génération, les 16 conditions suivantes sont vérifiées :
1. Période valide (`YYYY-MM`).
2. Registre validé ou prêt (aucune ligne en statut `BROUILLON` non contrôlée).
3. Configuration entreprise : `numeroAffiliation` renseigné et uniquement numérique (ex: `6541835`).
4. Configuration entreprise : `agence` renseignée (ex: `SIDI BELYOUT`).
5. Immatriculation CNSS présente pour chaque salarié.
6. Immatriculation CNSS strictement conforme au format 9 chiffres numériques.
7. Nom et prénom présents et non vides (aucun `NON IDENTIFIE` ou `INCONNU`).
8. Jours déclarés numériques, `>= 0` et `<= 26` (plafond légal).
9. Aucun jour négatif non corrigé (`joursImportes < 0` sans décision).
10. Aucune anomalie bloquante non résolue sur les lignes du registre.
11. Aucun salarié ambigu ou avec arbitrage en suspens.
12. Salariés sortants : situation expressément confirmée (`SORTI` ou `SO`).
13. Salariés entrants : CNI marocaine obligatoirement renseignée et valide.
14. Salariés entrants : décision d'entrée / création formellement validée.
15. Détection de doublons : Aucun matricule CNSS répété sur deux lignes distinctes.
16. Aucune ligne orpheline.

---

## 5. MENTION DU CARACTÈRE ADMINISTRATIF INTERNE

Tous les documents visuels et exports CSV générés portent la mention obligatoire :
> **« Document généré à partir du registre MULT.S — format administratif interne. »**
Ce document ne prétend pas être un fichier d'échange machine officiel non documenté, mais constitue la réplique administrative exacte des formulaires officiels F.212-2-58 et F.212-2-59 pour les besoins de contrôle et d'archivage d'intérim.

---

## 6. VALIDATION PAR TESTS AUTOMATISÉS

Le banc de test `/src/tests/testPrompt07B.ts` valide 24 exigences unitaires :
- `TEST_07B_01` : Registre validé -> génération autorisée.
- `TEST_07B_02` : Registre non validé -> refus.
- `TEST_07B_03` : N° affiliation absent -> refus.
- `TEST_07B_04` : Agence absente -> refus.
- `TEST_07B_05` : CNSS absent -> refus.
- `TEST_07B_06` : CNSS invalide -> refus.
- `TEST_07B_07` : Salarié ambigu -> refus.
- `TEST_07B_08` : Salarié non identifié -> refus.
- `TEST_07B_09` : Anomalie bloquante non résolue -> refus.
- `TEST_07B_10` : joursImportes = 27 / joursDeclares = 26 -> bordereau = 26.
- `TEST_07B_11` : joursImportes = -5 sans correction -> refus.
- `TEST_07B_12` : Entrant validé avec CNI -> présent dans BordereauEntrants (F.212-2-59).
- `TEST_07B_13` : Entrant sans CNI -> refus.
- `TEST_07B_14` : Deux CNSS identiques -> refus.
- `TEST_07B_15` : Salarié sorti non arbitré -> refus.
- `TEST_07B_16` : Salarié sorti validé -> situation SO sur F.212-2-58.
- `TEST_07B_17` : Période Octobre 2026 -> mois=10 et annee=2026 corrects.
- `TEST_07B_18` : Numéro d'affiliation configuré (6541835) projeté fidèlement.
- `TEST_07B_19` : Même données -> résultat déterministe (même hash et totaux).
- `TEST_07B_20` : Immuabilité absolue du registre source.
- `TEST_07B_21` : Pagination 12 lignes par page conforme au PDF officiel.
- `TEST_07B_22` : Cumul des jours par page et cumul des pages précédentes.
- `TEST_07B_23` : Validation humaine formelle et traçabilité audit.
- `TEST_07B_24` : Export CSV administratif avec disclaimers obligatoires.

**Résultat global :** 135 / 135 tests réussis (24 sur 07-B, 111 sur 01 à 07-BIS).
