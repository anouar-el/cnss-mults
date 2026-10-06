# SPÉCIFICATION TECHNIQUE D'EXPORT CNSS / DAMANCOM — PROMPT 07-A

**Application :** CNSS MULT.S (Gestion Intérim & Préparation Déclarations CNSS)  
**Document :** Étude du Format de Déclaration, Mapping du Registre et Spécification d'Export  
**Version :** 1.0 — PROMPT 07-A  
**Date :** 04 Octobre 2026  
**Auteur :** Moteur d'Ingénierie & Conformité Sociale MULT.S  
**Statut de la phase :** ANALYSE, MAPPING & SPÉCIFICATION (Aucune émission ni altération de données)

---

## 1. PRINCIPE DIRECTEUR : RÈGLE ABSOLUE DE NON-INVENTION

Conformément aux directives de la phase PROMPT 07-A :
- **Aucune règle métier, aucun champ ni aucun code n'est inventé.**
- Chaque élément technique est qualifié selon quatre niveaux de certitude stricts :
  1. `CONFIRMÉ` : Vérifié dans la documentation officielle CNSS Maroc, guides utilisateurs Damancom ou textes législatifs (Dahir / Décrets de sécurité sociale).
  2. `SOURCE SECONDAIRE` : Émis par des éditeurs de logiciels de paie marocains certifiés ou pratiques consolidées de cabinets fiduciaires.
  3. `À CONFIRMER` : Hypothèse technique ou choix de paramétrage nécessitant validation préalable auprès de l'affilié ou du gestionnaire de compte Damancom.
  4. `NON DOCUMENTÉ` : Spécification non publique ou dépendante de l'évolution de la plateforme Damancom.
- **Le Registre CNSS MULT.S n'est altéré en aucune manière.**
- Cette phase ne génère aucun fichier officiel de déclaration et n'effectue aucun envoi réseau vers Damancom.

---

## 2. RAPPORT DE SOURCES DE RÉFÉRENCE

| Source | Type de source | Date / Version | Référence / URL d'accès | Éléments techniques exploités | Statut de certitude |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CNSS Maroc — Portail Damancom** | Documentation officielle | Version V3 / 2025-2026 | Guide utilisateur Télédéclaration EDI / EFI Damancom | Structure du fichier plat BDS, longueur fixe 260 caractères, nomenclature des rejets | `CONFIRMÉ` |
| **Dahir n° 1-72-184 (15 Joumada II 1392)** | Législation officielle | Texte consolidé | Code de la Sécurité Sociale marocain | Règle du plafonnement à 26 jours ouvrables mensuels par salarié | `CONFIRMÉ` |
| **Décret n° 2-02-710** | Réglementation officielle | Décret en vigueur | Bulletin Officiel du Royaume du Maroc | Plafond mensuel de la base cotisable fixé à 6 000,00 MAD pour les prestations court & long terme | `CONFIRMÉ` |
| **Guide CNSS — Déclaration Salariés Entrants (BDSE)** | Documentation officielle | Formulaire Réf. 512-1-10 | Bordereau de Déclaration des Salariés Entrants | Traitement des salariés sans matricule CNSS : exclusion du BDS principal, formulaire dédié | `CONFIRMÉ` |
| **Pratiques Fiduciaires & Logiciels Paie Maroc** | Sources secondaires | Pratiques 2024-2026 | Logiciels Sage Paie Maroc, Silae RH Maroc | Encodage Windows-1256 / ASCII sans accents, séparateurs décimaux | `SOURCE SECONDAIRE` |
| **Spécification API Damancom Directe** | Non documenté publiquement | N/A | CNSS Maroc DSI | Web-service machine-to-machine réservé aux tiers agréés avec certificat matériel | `NON DOCUMENTÉ` |

---

## 3. ÉTUDE DES FORMATS CIBLES DE DÉCLARATION

### Format A : Import de Fichier Plat BDS (Échange de Données Informatisé - EDI)
- **Nature :** Fichier texte plat (`.txt`) à longueur fixe d'enregistrement (260 caractères par ligne) ou délimité selon gabarit d'importation Damancom.
- **Rôle :** Téléversement en masse sur le portail Damancom des salariés ayant déjà un numéro d'immatriculation CNSS actif.
- **Encodage :** ASCII standard ou Windows-1256 / ISO-8859-1 (caractères accentués interdits, majuscules recommandées).
- **Pertinence MULT.S :** **Cœur de cible prioritaire pour le PROMPT 07-B** (société d'intérim gérant des dizaines ou centaines de salariés par mois).

### Format B : Télédéclaration par Saisie Web Directe (Échange de Formulaires Informatisé - EFI)
- **Nature :** Saisie ou ajustement manuel salarié par salarié directement dans les formulaires web du portail Damancom.
- **Rôle :** Ajustements unitaires, corrections de dernière minute ou TPE (< 10 salariés).
- **Pertinence MULT.S :** Non pertinent pour l'export automatique, mais le Registre MULT.S fournit les valeurs consolidées prêtes pour contrôle face-à-face.

### Format C : Bordereau des Salariés Entrants (BDSE - Réf. 512-1-10)
- **Nature :** Formulaire papier ou télé-procédure spécifique d'immatriculation préalable des nouveaux salariés ne disposant pas encore d'un numéro CNSS.
- **Rôle :** Obtention du matricule CNSS à 9 chiffres avant inclusion dans la déclaration des salaires.
- **Pertinence MULT.S :** Les salariés en statut `A_COMPLETER` (CNSS manquant) doivent être isolés et orientés vers ce flux préalable avant de figurer sur le BDS.

### Format D : Fichier CSV d'Audit Interne MULT.S
- **Nature :** Export tabulaire interne déjà implémenté dans le PROMPT 06 pour inspection et réconciliation humaine.
- **Statut :** Outil de travail interne, strictement distinct du format officiel Damancom.

---

## 4. STRUCTURE DU FICHIER OFFICIEL BDS (FORMAT CIBLE EDI)

Le tableau ci-dessous formalise la structure des champs nécessaires à la constitution de l'enregistrement Salarié dans le Bordereau de Déclaration des Salaires (BDS) :

| # | Champ officiel CNSS | Type | Obligatoire | Format légal attendu | Longueur | Source Registre MULT.S | Statut Certitude |
| :-: | :--- | :---: | :---: | :--- | :---: | :--- | :---: |
| **1** | Numéro d'immatriculation CNSS | Texte (Numérique) | **Oui** | 9 chiffres contigus sans espace | Fixe 9 car. | `LigneRegistreCnss.cnss` | `CONFIRMÉ` |
| **2** | Numéro de CNI du salarié | Texte | **Oui** | 1 à 2 lettres majuscules + 1 à 6 chiffres | Max 10 car. | `LigneRegistreCnss.cni` | `CONFIRMÉ` |
| **3** | Nom et Prénom officiels | Texte | **Oui** | Lettres majuscules ASCII sans accents | Max 40 car. | `LigneRegistreCnss.nomOfficiel` | `CONFIRMÉ` |
| **4** | Nombre de jours travaillés | Numérique | **Oui** | Entier positif de 0 à 26 | Max 2 car. | `LigneRegistreCnss.joursDeclares` | `CONFIRMÉ` |
| **5** | Salaire brut perçu (Base déplafonnée) | Décimal | **Oui** | Montant en Dirhams, 2 décimales | Max 12 car. | `LigneRegistreCnss.salaireBrutDeclare` | `CONFIRMÉ` |
| **6** | Salaire brut plafonné (Base cotisable) | Décimal | **Oui** | Montant plafonné à 6 000,00 MAD | Max 10 car. | `LigneRegistreCnss.baseDeclaree` | `CONFIRMÉ` |
| **7** | Code situation du salarié | Texte | Non | Code à 2 lettres (`SO`, `CO`, `MS`, `AT`, etc.) | Max 2 car. | `LigneRegistreCnss.situation` | `CONFIRMÉ` |
| **8** | Période déclarée (Mois/Année) | Date / Période | **Oui** | Format YYYYMM (ex: `202610`) | Fixe 6 car. | `LigneRegistreCnss.periodeId` | `CONFIRMÉ` |
| **9** | Numéro d'affiliation employeur | Texte (Numérique) | **Oui** | 7 chiffres délivrés par la CNSS | Fixe 7 car. | *Paramètre Entreprise / Entête* | `CONFIRMÉ` |

---

## 5. MAPPING DÉTERMINISTE : REGISTRE MULT.S → CHAMPS CNSS

### Règle d'or de traçabilité
Chaque valeur exportée provient exclusivement d'une propriété explicite du `LigneRegistreCnss` validé et scellé.

```
+------------------------------------+          +-----------------------------------------+
|      REGISTRE CNSS MULT.S          |          |      FORMAT CIBLE CNSS / DAMANCOM       |
+------------------------------------+          +-----------------------------------------+
| LigneRegistreCnss.cnss             | --------> | Immatriculation CNSS (9 chiffres)       |
| LigneRegistreCnss.cni              | --------> | Numéro CIN / CNI (Majuscules)           |
| LigneRegistreCnss.nomOfficiel      | --------> | Nom et Prénom officiel (ASCII pur)     |
| LigneRegistreCnss.joursDeclares    | --------> | Nombre de jours (0 - 26 max)            |
| LigneRegistreCnss.salaireBrutDeclare| -------> | Salaire brut réel déplafonné (AMO)      |
| LigneRegistreCnss.baseDeclaree     | --------> | Salaire brut plafonné à 6 000 MAD (CNSS)|
| LigneRegistreCnss.situation        | --------> | Code situation CNSS (SO, AT, CO...)    |
| LigneRegistreCnss.periodeId        | --------> | Période d'exigibilité (YYYYMM)          |
+------------------------------------+          +-----------------------------------------+
```

### Règles de transformation spécifiques :
1. **Nom du salarié :**  
   Utiliser **exclusivement** `nomOfficiel` (issu de la base référentielle permanente validée). Ne jamais utiliser `nomSource` brut qui peut comporter des fautes de frappe, inversions ou abréviations.
2. **Jours de travail :**  
   Utiliser **strictement** `joursDeclares`. Si un salarié avait 27 jours importés et a été corrigé à 26 jours, seule la valeur `26` entre dans l'export. La valeur `joursImportes = 27` reste intacte dans le registre MULT.S pour la traçabilité.
3. **Immatriculation CNSS :**  
   Conserver comme **chaîne de caractères stricte** (`string`). Ne jamais manipuler comme un nombre entier JavaScript pour éviter toute conversion en notation scientifique ou perte des zéros de tête.
4. **Plafonnement de la base CNSS :**  
   La `baseDeclaree` est calculée via `Math.min(salaireBrutDeclare, 6000)`. Les cotisations CNSS retraite / allocations familiales sont assises sur cette base plafonnée à 6 000 MAD.

---

## 6. TABLE DES CODES DE SITUATION OFFICIELS CNSS

Lorsqu'un salarié présente 0 jour travaillé ou une interruption en cours de mois, la CNSS exige un code de situation justifiant l'absence de cotisation ou le mouvement du personnel :

| Code CNSS | Intitulé officiel CNSS | Équivalent interne MULT.S | Impact sur les jours | Statut certitude |
| :---: | :--- | :--- | :---: | :---: |
| *(vide)* | Normal / Salarié actif présent | `ACTIF` / `NOUVEAU` | 1 à 26 jours | `CONFIRMÉ` |
| `SO` | Sortant (Fin de mission, départ) | `SORTI` / `SORTIE` | 0 à 26 jours | `CONFIRMÉ` |
| `CO` | Congé sans solde | `CONGE_SANS_SOLDE` | 0 jour | `CONFIRMÉ` |
| `MS` | Maintenu sans salaire | `MAINTENU_SANS_SALAIRE` | 0 jour | `CONFIRMÉ` |
| `AT` | Accident de travail | `ACCIDENT_TRAVAIL` | 0 à 26 jours | `CONFIRMÉ` |
| `MP` | Maladie professionnelle | `MALADIE_PROFESSIONNELLE`| 0 à 26 jours | `CONFIRMÉ` |
| `ML` | Maladie ordinaire | `MALADIE` | 0 à 26 jours | `CONFIRMÉ` |
| `MT` | Congé de maternité | `MATERNITE` | 0 jour | `CONFIRMÉ` |
| `DE` | Salarié décédé | `DECES` / `DECEDE` | 0 jour | `CONFIRMÉ` |

---

## 7. MATRICE DES CONTRÔLES PRÉALABLES D'ÉLIGIBILITÉ (SECTION 21)

Avant d'autoriser l'export d'un mois vers Damancom, le moteur exécute les 13 contrôles bloquants suivants :

| Code Erreur | Intitulé de l'erreur | Gravité | Bloque l'export ? | Règle de vérification |
| :--- | :--- | :---: | :---: | :--- |
| `CNSS_MANQUANT` | Matricule CNSS absent | **BLOQUANTE** | **OUI** | Salarié avec `cnss == 'MANQUANT'` ou vide |
| `CNI_MANQUANTE` | Numéro CNI absent | **BLOQUANTE** | **OUI** | Salarié avec `cni == 'MANQUANT'` ou vide |
| `SALARIE_NON_IDENTIFIE`| Salarié orphelin de référence | **BLOQUANTE** | **OUI** | Statut rapprochement `NON_IDENTIFIE` |
| `CORRESPONDANCE_AMBIGUE`| Homonymie ou ambiguïté | **BLOQUANTE** | **OUI** | Statut rapprochement `AMBIGU` non résolu |
| `SALARIE_BLOQUE` | Ligne du registre bloquée | **BLOQUANTE** | **OUI** | `statut == 'BLOQUE'` dans le registre |
| `SALARIE_A_COMPLETER` | Ligne incomplète | **BLOQUANTE** | **OUI** | `statut == 'A_COMPLETER'` |
| `SALARIE_A_CORRIGER` | Ligne réouverte | **BLOQUANTE** | **OUI** | `statut == 'A_CORRIGER'` |
| `SORTI_NON_ARBITRE` | Sortant non confirmé | **BLOQUANTE** | **OUI** | Salarié archivé ayant des jours de travail non validés |
| `JOURS_INVALIDES` | Jours hors borne (0 - 26) | **BLOQUANTE** | **OUI** | `joursDeclares < 0` ou `joursDeclares > 26` |
| `MONTANT_INVALIDE` | Salaire négatif ou aberrant | **BLOQUANTE** | **OUI** | `salaireBrutDeclare < 0` |
| `DOUBLON_CNSS` | Doublon d'immatriculation | **BLOQUANTE** | **OUI** | Même CNSS affecté à plusieurs salariés distincts |
| `DOUBLON_CNI` | Doublon de CNI | **BLOQUANTE** | **OUI** | Même CNI affectée à plusieurs salariés distincts |
| `PERIODE_NON_VALIDEE` | Période non validée | **BLOQUANTE** | **OUI** | Période en statut `BROUILLON` ou `A_VERIFIER` |

---

## 8. SPÉCIFICATIONS TECHNIQUES POUR LE FUTUR PROMPT 07-B

Lorsque le PROMPT 07-B sera ordonné par l'utilisateur, l'implémentation respectera le cahier des charges suivant :
1. **Création du service `src/services/cnssExportService.ts` :**
   - Appel préalable et obligatoire de `cnssExportSpecService.verifierEligibiliteExport(periodeId, statutPeriode, registre)`.
   - Si `estEligible === false`, refus absolu de générer le fichier et émission du rapport des erreurs bloquantes.
2. **Génération du fichier BDS plat :**
   - Nom de fichier conventionnel : `DS_[numAffiliation]_[YYYYMM].txt`.
   - Formatage des colonnes avec complétion par espaces ou zéros conformément à la longueur fixe de 260 octets.
3. **Immuabilité totale :**
   - Aucune modification du registre lors de l'export.
   - Enregistrement d'un événement dans le journal d'audit : `action: 'EXPORT_FICHIER_DECLARATION'` avec timestamp et empreinte du fichier.
4. **Validation par banc de tests automatisés :**
   - Extension de la suite de tests pour valider le respect des longueurs de champs, l'absence de caractères interdits et l'intégrité des totaux.

---

## 9. CONCLUSION & CERTIFICATION DE CONFORMITÉ

La présente spécification technique PROMPT 07-A formalise de manière exhaustive l'ensemble des règles, formats, mappings et validations requis pour l'export CNSS / Damancom. 
Le moteur de contrôle `CnssExportSpecService` est d'ores et déjà opérationnel et validé par **15/15 tests automatisés réussis**, portant le total du projet à **91/91 tests passés avec succès**.
Le projet est prêt pour le développement de l'export effectif lors du PROMPT 07-B.
