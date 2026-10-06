# SPÉCIFICATION TECHNIQUE & ARCHITECTURE DE SAUVEGARDE, RESTAURATION ET ARCHIVAGE (PROMPT 11)
## APPLICATION CNSS MULT.S — SARLAU MULT.S (N° AFFILIÉ : 6541835)

---

## 1. Contexte & Architecture

L'application **CNSS MULT.S** a été conçue pour fonctionner de manière autonome dans le navigateur web avec persistance locale (`localStorage` et fallbacks mémoire).
Afin d'éliminer la dépendance critique au stockage local du navigateur (risque de vidage de cache, changement de machine, incident matériel), le module **PROMPT 11** met en œuvre une infrastructure complète de sauvegarde, d'archivage, de contrôle d'intégrité cryptographique et de reprise après sinistre (**Disaster Recovery**).

### Principe Directeur
- Le **REGISTRE CNSS** demeure la source métier unique de vérité.
- La **SAUVEGARDE** est une copie exportable, autonome et scellée de l'état du système.
- L'**ARCHIVE** est une copie inaltérable d'une période clôturée ou validée.
- **ZÉRO TRANSMISSION CLOUD** : Aucune donnée ne quitte le poste de travail (zéro Google Drive, Dropbox, Damancom, email ou serveur distant). L'utilisateur conserve le contrôle physique total de ses fichiers `.mcnss`.

---

## 2. Format de Fichier Autonome (`.mcnss`)

Le format `.mcnss` (Mult.s CNSS Backup) est un conteneur JSON structuré, autonome et versionné :

```json
{
  "formatVersion": "1.0",
  "applicationVersion": "1.0.0",
  "backupId": "backup_2026-10-05_1696521600000_abc12",
  "backupType": "FULL",
  "targetPeriodId": null,
  "createdAt": "2026-10-05T12:00:00.000Z",
  "company": {
    "raisonSociale": "STE MULT.S",
    "numeroAffiliation": "6541835",
    "agence": "SIDI BELYOUT",
    "codeFormulaireOrdinaires": "F.212-2-58",
    "codeFormulaireEntrants": "F.212-2-59"
  },
  "periods": [ ... ],
  "employees": [ ... ],
  "aliases": [ ... ],
  "decisionsSorties": { ... },
  "lignesPaie": { ... },
  "rapprochements": { ... },
  "registers": { ... },
  "declarations": { ... },
  "payments": { ... },
  "dossiers": { ... },
  "audits": [ ... ],
  "configurations": { ... },
  "metadata": {
    "totalPeriodes": 1,
    "totalSalaries": 88,
    "totalAudits": 45,
    "totalDossiers": 1,
    "periodesCloturees": ["2026-09"],
    "exportePar": "Administrateur MULT.S",
    "sourceSysteme": "MULT.S CNSS - v1.0"
  },
  "integrity": {
    "contentHash": "e861e964a3715cd230714ec275ea4d5381a9fba869471bd38a49febe2198b34e",
    "algorithm": "SHA-256",
    "signatureVersion": "1.0"
  }
}
```

---

## 3. Empreinte Cryptographique Déterministe SHA-256

Pour garantir l'intégrité absolue sans générer de faux positifs :
1. **Canonicalisation Récursive :** Toutes les clés JSON du payload de données métier sont triées alphabétiquement de manière récursive via `canonicalizeJson()`.
2. **Découplage des Métadonnées Éphémères :** Les identifiants variables (`backupId`, `createdAt`) et les audits d'opération de sauvegarde (`BACKUP_CREATED`, `PRE_RESTORE_BACKUP_CREATED`) sont exclus de la charge utile soumise au hash.
3. **Calcul SHA-256 (FIPS 180-2) :** Une implémentation pure TypeScript produit l'empreinte hexadécimale de 64 caractères. Deux sauvegardes créées successivement sur les mêmes données métier produisent strictement le même `contentHash`.

---

## 4. Processus de Création

- **Backup Complet :** Aggrège l'ensemble des périodes (historiques et actuelles), le référentiel des salariés, tous les alias mémorisés, les décisions de sorties, les registres, les déclarations et les dossiers mensuels.
- **Archive Période :** Cible une période précise (ex: Septembre 2026 clôturée). Crée un fichier autonome `MULTS_CNSS_ARCHIVE_2026-09.mcnss` qui conserve le statut inviolable `CLOTURE`.
- **Nommage Standardisé :**
  - Sauvegarde complète : `MULTS_CNSS_BACKUP_YYYY-MM-DD.mcnss`
  - Archive période : `MULTS_CNSS_ARCHIVE_YYYY-MM.mcnss`
  - Pré-restauration : `MULTS_PRE_RESTORE_YYYY-MM-DD.mcnss`

---

## 5. Validation de Sécurité & Détection d'Altération

Avant toute opération de lecture ou restauration, le fichier subit une validation rigoureuse en 5 étapes :
1. Contrôle de syntaxe JSON.
2. Vérification de la compatibilité de `formatVersion` (rejet immédiat si version différente de `1.0`).
3. Présence des structures obligatoires (périodes, salariés, entreprise, intégrité).
4. Reconstitution du payload et recalcul du hash SHA-256.
5. Comparaison stricte avec `integrity.contentHash`. Toute modification d'un seul octet déclenche l'erreur bloquante `HASH_INVALID`.

---

## 6. Restauration Atomique & Rollback

Le processus de restauration est 100% transactionnel et réversible :
```
[FICHIER .MCNSS]
       │
       ▼
[VALIDATION SHA-256] ── Échec ──> [REJET IMMÉDIAT (Aucune altération du stockage)]
       │
       ▼ Succès
[DÉTECTION CONFLITS] ── Conflit non approuvé ──> [ARRÊT & INFORMATION UTILISATEUR]
       │
       ▼ Accord explicite
[SNAPSHOT PRÉ-RESTAURATION (PRE_RESTORE)]
       │
       ▼
[APPLICATION EN MÉMOIRE & TEST INTÉGRITÉ]
       │
   ┌───┴────────────────┐
   │                    │
Succès                Erreur
   │                    │
   ▼                    ▼
[COMMIT PERSISTANCE] [ROLLBACK AUTOMATIQUE (Retour exact à l'état A)]
```

---

## 7. Gestion Stricte des Conflits de Périodes

Si le backup contient une période déjà présente dans l'application :
- Le système refuse la fusion silencieuse.
- L'utilisateur visualise les périodes en conflit, leur statut actuel et celui du backup.
- L'écrasement nécessite une case à cocher explicite : *"Autoriser le remplacement des périodes en conflit"*.

---

## 8. Préservation des Périodes Clôturées

Une période archivée ou sauvegardée avec le statut `CLOTURE` reste **strictement clôturée** après sa restauration.
Elle ne repasse **jamais** automatiquement en `BROUILLON`. Toutes les protections contre les modifications de salaires, de jours ou de validation restent actives.

---

## 9. Contrôle d'Intégrité Global (`verifyGlobalIntegrity()`)

Le service exécute à tout moment un audit complet des données stockées :
- Format des identifiants de période (`YYYY-MM`).
- Présence obligatoire d'un registre et d'un dossier pour chaque période clôturée.
- Unicité stricte des immatriculations CNSS et des numéros de CNI dans le référentiel salariés.
- Validité des alias et conformité des empreintes de dossiers.

---

## 10. Procédure Mensuelle Recommandée

1. Finalisation et contrôle tripartite du mois (PROMPT 09).
2. Clôture formelle de la période.
3. Exportation de l'archive mensuelle `MULTS_CNSS_ARCHIVE_YYYY-MM.mcnss`.
4. Exportation d'une sauvegarde complète `MULTS_CNSS_BACKUP_YYYY-MM-DD.mcnss`.
5. Stockage des fichiers sur un support d'archivage externe d'entreprise (clé USB sécurisée, serveur de fichiers d'entreprise hors navigateur).
