# GUIDE D'UTILISATION — SAUVEGARDE & RESTAURATION CNSS MULT.S
## GUIDE PRATIQUE POUR LES GESTIONNAIRES DE PAIE ET RESPONSABLES ADMINISTRATIFS

---

## ⚠️ Avertissement Fondamental
Le navigateur web n'est **pas** un coffre-fort permanent. Si vous videz l'historique ou les données de navigation, changez d'ordinateur ou rencontrez une panne matérielle, les données de l'application peuvent disparaître.

> **Règle d'or :** À la fin de chaque mois, après avoir validé et clôturé votre déclaration CNSS, vous devez **toujours** exporter et conserver un fichier de sauvegarde hors de votre navigateur (sur le réseau de l'entreprise ou un disque externe sécurisé).

---

## 1. Comment Créer un Backup Complet

Un backup complet enregistre **toutes les périodes**, tous vos salariés, tous les alias mémorisés et tous les dossiers officiels.

1. Rendez-vous dans l'onglet **BACKUP & ARCHIVAGE**.
2. Dans la boîte **Section 2 &bull; Sauvegarde Complète**, cliquez sur le bouton vert **[Créer un Backup Complet (.mcnss)]**.
3. Votre navigateur télécharge automatiquement un fichier nommé :
   `MULTS_CNSS_BACKUP_AAAA-MM-JJ.mcnss`
4. Déplacez ce fichier dans le dossier d'archives sécurisé de votre entreprise.

---

## 2. Comment Archiver un Mois Précis

Lorsque le mois (par exemple Septembre 2026) est terminé, vérifié et **clôturé** :

1. Dans l'onglet **BACKUP & ARCHIVAGE**, allez à la **Section 3 &bull; Archive Autonome d'une Période**.
2. Sélectionnez le mois souhaité dans la liste déroulante (ex: `Septembre 2026 🔒 (CLÔTURÉE)`).
3. Cliquez sur **[Archiver la Période Sélectionnée (.mcnss)]**.
4. Le fichier téléchargé s'intitule :
   `MULTS_CNSS_ARCHIVE_2026-09.mcnss`
5. Ce fichier contient le registre, les bordereaux et le dossier scellé de ce mois. Même si vous le restaurez plus tard, il restera verrouillé en lecture seule.

---

## 3. Comment Restaurer des Données (ou Reprendre Après un Incident)

Si vous devez réinstaller l'application sur un nouvel ordinateur ou réintégrer une sauvegarde :

1. Allez dans l'onglet **BACKUP & ARCHIVAGE**, **Section 4 &bull; Restauration Atomique**.
2. Cliquez sur **[Parcourir les fichiers .mcnss]** et choisissez votre fichier de sauvegarde.
3. **L'application vérifie immédiatement l'intégrité du fichier :**
   - Si le fichier a été modifié manuellement ou corrompu, il sera refusé.
   - Si le fichier est valide, un cadre d'**Aperçu** s'affiche en vous résumant la date, le nombre de salariés et de périodes.
4. Si certaines périodes existent déjà dans votre application :
   - Un avertissement de conflit apparaît.
   - Cochez la case *"Autoriser le remplacement des périodes en conflit"* si vous souhaitez appliquer la sauvegarde.
5. Cliquez sur **[Confirmer la Restauration Atomique]**.
6. Un instantané de sécurité préalable est créé automatiquement. En cas de problème pendant la lecture, vos données précédentes sont restaurées sans aucune perte.

---

## 4. Que Faire Après une Perte Totale des Données du Navigateur ?

Si vous ouvrez l'application et constatez qu'elle est vide (suite à un nettoyage de cache par exemple) :

1. Ne paniquez pas.
2. Allez directement dans l'onglet **BACKUP & ARCHIVAGE**.
3. Cliquez sur **[Parcourir les fichiers .mcnss]**.
4. Sélectionnez le dernier fichier `MULTS_CNSS_BACKUP_...mcnss` que vous aviez conservé.
5. Vérifiez l'aperçu puis cliquez sur **[Confirmer la Restauration Atomique]**.
6. En quelques secondes, l'ensemble de votre historique, vos salariés, vos alias et vos mois clôturés sont rétablis à l'identique.

---

## 5. Comment Vérifier la Santé de Vos Données

À tout moment, cliquez sur le bouton **[Vérifier l’Intégrité Globale]** en haut à droite de l'écran :
- L'application vérifie automatiquement que chaque période clôturée dispose bien de son dossier et de son registre.
- Elle contrôle qu'aucun doublon de numéro CNSS ou de CNI n'a été introduit.
- Elle confirme que toutes les empreintes cryptographiques sont intactes.

---

## 6. Récapitulatif de la Procédure Mensuelle

```
Fin du mois
    ↓
Rapprochement des salariés (Onglet Rapprochement)
    ↓
Vérification des bordereaux et du paiement (Onglets Bordereau & Paiement)
    ↓
Contrôle tripartite & Clôture formelle (Onglet Dossier Mensuel)
    ↓
Export de l'Archive du mois (.mcnss) (Onglet Backup & Archivage)
    ↓
Export de la Sauvegarde complète (.mcnss)
    ↓
Copie des fichiers sur le serveur ou le disque sécurisé de la société MULT.S SARLAU
```
