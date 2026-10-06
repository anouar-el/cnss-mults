/**
 * Vue Sauvegarde, Restauration, Archivage et Reprise Après Sinistre
 * APPLICATION CNSS MULT.S (PROMPT 11)
 *
 * Contient 6 sections clairement ordonnées :
 * 1. État du stockage local & Intégrité
 * 2. Sauvegarde complète (.mcnss)
 * 3. Archivage autonome d'une période clôturée
 * 4. Restauration atomique avec aperçu préalable et résolution de conflits
 * 5. Historique des sauvegardes et archives
 * 6. Contrôle d'intégrité global
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  Archive,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileCheck2,
  HardDrive,
  Clock,
  Database,
  Lock,
  FileText,
  RefreshCw,
  Search,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { backupService } from '../services/backupService';
import { persistenceService } from '../services/persistenceService';
import {
  MultsCnssBackup,
  ApercuBackup,
  GlobalIntegrityReport,
  ItemHistoriqueBackup,
  RestoreResult,
} from '../types/cnssBackup';
import { PeriodeMensuelle } from '../types/cnss';

interface BackupRestoreViewProps {
  periodes: PeriodeMensuelle[];
  moisActif: string;
  onDonneesRestaurees: () => void;
  afficherNotification: (msg: string) => void;
}

export function BackupRestoreView({
  periodes,
  moisActif,
  onDonneesRestaurees,
  afficherNotification,
}: BackupRestoreViewProps) {
  // États locaux
  const [periodeArchivageId, setPeriodeArchivageId] = useState<string>(
    periodes.find(p => p.statut === 'CLOTURE')?.id || moisActif || '2026-09'
  );
  const [dernierBackupCree, setDernierBackupCree] = useState<MultsCnssBackup | null>(null);
  const [derniereArchiveCree, setDerniereArchiveCree] = useState<MultsCnssBackup | null>(null);

  // État restauration
  const [fichierImporteContenu, setFichierImporteContenu] = useState<string | null>(null);
  const [nomFichierImporte, setNomFichierImporte] = useState<string>('');
  const [apercuRestauration, setApercuRestauration] = useState<ApercuBackup | null>(null);
  const [backupAImporter, setBackupAImporter] = useState<MultsCnssBackup | null>(null);
  const [erreurImport, setErreurImport] = useState<string | null>(null);
  const [ecraserConflits, setEcraserConflits] = useState<boolean>(false);
  const [enCoursRestauration, setEnCoursRestauration] = useState<boolean>(false);
  const [resultatRestauration, setResultatRestauration] = useState<RestoreResult | null>(null);

  // Contrôle d'intégrité
  const [rapportIntegrite, setRapportIntegrite] = useState<GlobalIntegrityReport>(() =>
    backupService.verifyGlobalIntegrity()
  );

  // Historique
  const [historique, setHistorique] = useState<ItemHistoriqueBackup[]>(() =>
    backupService.getHistoriqueBackups()
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const rafraichirHistorique = () => {
    setHistorique(backupService.getHistoriqueBackups());
  };

  const lancerControleIntegrite = () => {
    const rep = backupService.verifyGlobalIntegrity();
    setRapportIntegrite(rep);
    if (rep.valide) {
      afficherNotification('✓ Contrôle d’intégrité global réussi : aucune anomalie détectée.');
    } else {
      afficherNotification(`⚠ Contrôle d’intégrité : ${rep.anomalies.length} anomalie(s) détectée(s).`);
    }
  };

  // =========================================================================
  // ACTIONS SAUVEGARDE & ARCHIVAGE
  // =========================================================================

  const handleCreerBackupComplet = () => {
    try {
      const bk = backupService.createFullBackup('Administrateur MULT.S');
      setDernierBackupCree(bk);
      const serialise = backupService.serializeBackup(bk);
      const nomFichier = backupService.genererNomFichier('FULL');
      backupService.telechargerFichier(serialise, nomFichier);
      rafraichirHistorique();
      afficherNotification(`✓ Sauvegarde complète "${nomFichier}" créée et téléchargée (${(serialise.length / 1024).toFixed(1)} Ko).`);
    } catch (e: any) {
      afficherNotification(`❌ Erreur lors de la sauvegarde : ${e?.message || 'Erreur inconnue'}`);
    }
  };

  const handleArchiverPeriode = () => {
    if (!periodeArchivageId) {
      afficherNotification('Veuillez sélectionner une période à archiver.');
      return;
    }
    try {
      const targetP = periodes.find(p => p.id === periodeArchivageId);
      const arch = backupService.createPeriodArchive(periodeArchivageId, 'Administrateur MULT.S');
      setDerniereArchiveCree(arch);
      const serialise = backupService.serializeBackup(arch);
      const nomFichier = backupService.genererNomFichier('PERIOD_ARCHIVE', periodeArchivageId);
      backupService.telechargerFichier(serialise, nomFichier);
      rafraichirHistorique();
      afficherNotification(
        `✓ Archive officielle "${nomFichier}" générée (${targetP?.statut || 'Période'}) et téléchargée.`
      );
    } catch (e: any) {
      afficherNotification(`❌ Erreur lors de l’archivage : ${e?.message || 'Erreur inconnue'}`);
    }
  };

  // =========================================================================
  // ACTIONS RESTAURATION
  // =========================================================================

  const handleFichierSelectionne = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomFichierImporte(file.name);
    setErreurImport(null);
    setApercuRestauration(null);
    setBackupAImporter(null);
    setResultatRestauration(null);

    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setFichierImporteContenu(content);

      const parsed = backupService.parseBackup(content);
      if (!parsed.success || !parsed.backup) {
        setErreurImport(parsed.error || 'Fichier invalide ou corrompu.');
        return;
      }

      const val = backupService.validateBackup(parsed.backup);
      if (!val.valide) {
        setErreurImport(val.message);
        return;
      }

      const prev = backupService.previewBackup(parsed.backup);
      setApercuRestauration(prev);
      setBackupAImporter(parsed.backup);
      if (prev.conflitsPotentiels.length > 0) {
        setEcraserConflits(false);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmerRestauration = () => {
    if (!backupAImporter) return;

    setEnCoursRestauration(true);
    setErreurImport(null);

    setTimeout(() => {
      try {
        const res = backupService.restoreBackup(backupAImporter, {
          ecraserConflits,
          utilisateur: 'Administrateur MULT.S',
        });

        setResultatRestauration(res);

        if (res.succes) {
          afficherNotification('✓ Restauration terminée avec succès. Intégrité vérifiée.');
          onDonneesRestaurees();
          lancerControleIntegrite();
          rafraichirHistorique();
          setBackupAImporter(null);
          setApercuRestauration(null);
          setFichierImporteContenu(null);
          setNomFichierImporte('');
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          setErreurImport(res.message);
          afficherNotification(`⚠ Restauration non effectuée : ${res.message}`);
        }
      } catch (err: any) {
        setErreurImport(`Erreur inattendue : ${err?.message}`);
      } finally {
        setEnCoursRestauration(false);
      }
    }, 150);
  };

  const handleAnnulerImport = () => {
    setFichierImporteContenu(null);
    setNomFichierImporte('');
    setApercuRestauration(null);
    setBackupAImporter(null);
    setErreurImport(null);
    setResultatRestauration(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Statistiques instantanées de stockage
  const snapshot = backupService.captureCurrentStateSnapshot();
  const tailleEstimee = JSON.stringify(snapshot).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* En-tête */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" /> PROMPT 11 &bull; Sécurité & Reprise Après Sinistre
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Sauvegarde, Archivage & Continuité des Données
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Gestion autonome des sauvegardes (.mcnss), scellement cryptographique SHA-256 déterministe,
            archivage des périodes clôturées et restauration atomique avec protection anti-sinistre.
          </p>
        </div>

        <button
          onClick={lancerControleIntegrite}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-slate-700 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          Vérifier l’Intégrité Globale
        </button>
      </div>

      {/* SECTION 1 : ÉTAT DU STOCKAGE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
              Section 1 &bull; État Actuel du Stockage & Intégrité
            </h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
              rapportIntegrite.valide
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {rapportIntegrite.valide ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            {rapportIntegrite.statut}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Périodes</span>
            <p className="text-xl font-black text-slate-800 mt-1">{snapshot.nombrePeriodes}</p>
            <span className="text-[10px] text-slate-400">
              {periodes.filter(p => p.statut === 'CLOTURE').length} clôturée(s)
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Salariés Base</span>
            <p className="text-xl font-black text-slate-800 mt-1">{snapshot.nombreSalaries}</p>
            <span className="text-[10px] text-slate-400">Référentiel actif</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Alias Validés</span>
            <p className="text-xl font-black text-slate-800 mt-1">{snapshot.nombreAliases}</p>
            <span className="text-[10px] text-slate-400">Rapprochements</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Dossiers CNSS</span>
            <p className="text-xl font-black text-slate-800 mt-1">{snapshot.nombreDossiers}</p>
            <span className="text-[10px] text-slate-400">Mensuels officiels</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Audits Métier</span>
            <p className="text-xl font-black text-slate-800 mt-1">{snapshot.nombreAudits}</p>
            <span className="text-[10px] text-slate-400">Événements tracés</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Empreinte SHA-256</span>
            <p className="text-xs font-mono font-bold text-slate-700 truncate mt-1.5" title={snapshot.contentHash}>
              {snapshot.contentHash.substring(0, 12)}...
            </p>
            <span className="text-[10px] text-emerald-600 font-bold">Déterministe</span>
          </div>
        </div>

        {rapportIntegrite.anomalies.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Anomalies de stockage détectées :
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-rose-700">
              {rapportIntegrite.anomalies.map((ano, idx) => (
                <li key={idx}>{ano}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* GRILLE SECTIONS 2 & 3 : BACKUP COMPLET & ARCHIVE PÉRIODE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION 2 : BACKUP COMPLET */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <Database className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
                Section 2 &bull; Sauvegarde Complète (Toutes Périodes)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Exporte l'intégralité des périodes, salariés, alias, registres, bordereaux déclaratifs et de paiement,
              dossiers mensuels scellés, historique d'audits et configurations au format autonome <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-emerald-700">.mcnss</code>.
            </p>

            {dernierBackupCree && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1 mb-4">
                <div className="flex items-center justify-between font-bold">
                  <span>Dernier Backup Généré :</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 text-[10px]">VALIDE</span>
                </div>
                <div className="font-mono text-[11px] truncate">
                  ID : {dernierBackupCree.backupId}
                </div>
                <div>Périodes incluses : {dernierBackupCree.periods.length} ({dernierBackupCree.metadata.periodesCloturees.length} clôturée(s))</div>
                <div className="font-mono text-[10px] text-emerald-700 truncate">
                  SHA-256 : {dernierBackupCree.integrity.contentHash}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleCreerBackupComplet}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Créer un Backup Complet (.mcnss)
          </button>
        </div>

        {/* SECTION 3 : ARCHIVE PÉRIODE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <Archive className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
                Section 3 &bull; Archive Autonome d'une Période
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Génère une archive scellée d'une période validée ou clôturée. L'archive conserve le statut
              strict de clôture et l'ensemble des pièces déclaratives associées.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sélectionner la période à archiver :
              </label>
              <select
                value={periodeArchivageId}
                onChange={e => setPeriodeArchivageId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {periodes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.libelle} {p.statut === 'CLOTURE' ? '🔒 (CLÔTURÉE)' : `(${p.statut})`}
                  </option>
                ))}
              </select>
            </div>

            {derniereArchiveCree && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 space-y-1 mb-4">
                <div className="flex items-center justify-between font-bold">
                  <span>Archive Période {derniereArchiveCree.targetPeriodId} :</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-200 text-indigo-800 text-[10px]">GÉNÉRÉE</span>
                </div>
                <div className="font-mono text-[10px] text-indigo-700 truncate">
                  SHA-256 : {derniereArchiveCree.integrity.contentHash}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleArchiverPeriode}
            className="w-full py-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            Archiver la Période Sélectionnée (.mcnss)
          </button>
        </div>
      </div>

      {/* SECTION 4 : RESTAURATION & APERÇU PRÉALABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
              Section 4 &bull; Restauration Atomique & Reprise Après Sinistre
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Pré-backup automatique &bull; Rollback en cas d'erreur
          </span>
        </div>

        {/* Sélection du fichier */}
        {!apercuRestauration && (
          <div className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-2xl p-8 text-center transition-colors bg-slate-50">
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700 mb-1">
              Sélectionner un fichier de sauvegarde ou d'archive MULT.S (.mcnss)
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Le fichier sera d'abord validé (format, syntaxe et vérification de l'empreinte SHA-256) avant tout aperçu.
            </p>

            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Parcourir les fichiers .mcnss
              <input
                ref={fileInputRef}
                type="file"
                accept=".mcnss,.json"
                className="hidden"
                onChange={handleFichierSelectionne}
              />
            </label>

            {erreurImport && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left max-w-lg mx-auto">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-0.5">
                  <XCircle className="w-4 h-4 text-rose-600" /> Restauration Refusée :
                </div>
                {erreurImport}
              </div>
            )}
          </div>
        )}

        {/* Aperçu avant restauration */}
        {apercuRestauration && (
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200">
              <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                <FileCheck2 className="w-5 h-5 text-amber-600" />
                Aperçu de la Sauvegarde &bull; Fichier : {nomFichierImporte}
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Empreinte SHA-256 Validée
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-3 rounded-xl border border-amber-200/80">
                <span className="text-slate-400 block font-medium">Type & Version</span>
                <span className="font-bold text-slate-800">
                  {apercuRestauration.backupType} (Format {apercuRestauration.formatVersion})
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-200/80">
                <span className="text-slate-400 block font-medium">Date de création</span>
                <span className="font-bold text-slate-800">
                  {new Date(apercuRestauration.createdAt).toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-200/80">
                <span className="text-slate-400 block font-medium">Périodes ({apercuRestauration.totalPeriodes})</span>
                <span className="font-bold text-slate-800">
                  {apercuRestauration.periodes.join(', ') || 'Aucune'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-200/80">
                <span className="text-slate-400 block font-medium">Salariés & Dossiers</span>
                <span className="font-bold text-slate-800">
                  {apercuRestauration.totalSalaries} sal. / {apercuRestauration.totalDossiers} dos.
                </span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 text-xs">
              <span className="text-slate-400 block font-medium mb-1">Empreinte SHA-256 du Contenu</span>
              <span className="font-mono text-slate-700 break-all select-all font-bold">
                {apercuRestauration.contentHash}
              </span>
            </div>

            {/* Avertissement conflits de périodes */}
            {apercuRestauration.conflitsPotentiels.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Conflit de Période Détecté :
                </div>
                <p>
                  Les périodes suivantes existent déjà dans l'application :{' '}
                  <span className="font-bold">{apercuRestauration.conflitsPotentiels.join(', ')}</span>.
                  Conformément aux règles de sécurité, aucune fusion silencieuse n'est permise.
                </p>

                <label className="flex items-center gap-2 pt-1 font-bold cursor-pointer text-slate-900">
                  <input
                    type="checkbox"
                    checked={ecraserConflits}
                    onChange={e => setEcraserConflits(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span>
                    Autoriser le remplacement des périodes en conflit par les données du backup
                  </span>
                </label>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleAnnulerImport}
                disabled={enCoursRestauration}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmerRestauration}
                disabled={
                  enCoursRestauration ||
                  (apercuRestauration.conflitsPotentiels.length > 0 && !ecraserConflits)
                }
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-2 ${
                  apercuRestauration.conflitsPotentiels.length > 0 && !ecraserConflits
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 cursor-pointer'
                }`}
              >
                {enCoursRestauration ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Confirmer la Restauration Atomique
              </button>
            </div>
          </div>
        )}

        {/* Message de succès ou rollback après restauration */}
        {resultatRestauration && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
              resultatRestauration.succes
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {resultatRestauration.succes ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{resultatRestauration.message}</p>
              {resultatRestauration.preRestoreBackupId && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Pré-backup de sécurité enregistré sous :{' '}
                  <code className="font-mono">{resultatRestauration.preRestoreBackupId}</code>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5 : HISTORIQUE DES SAUVEGARDES & ARCHIVES */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
              Section 5 &bull; Historique des Opérations de Sauvegarde
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-bold">
            {historique.length} élément(s) archivé(s)
          </span>
        </div>

        {historique.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">
            Aucun historique de sauvegarde enregistré pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Taille</th>
                  <th className="py-2.5 px-3">Empreinte SHA-256</th>
                  <th className="py-2.5 px-3 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historique.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                      {new Date(item.dateCreation).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.type === 'FULL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.type === 'PERIOD_ARCHIVE'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{item.description}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {(item.tailleOctets / 1024).toFixed(1)} Ko
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {item.contentHash.substring(0, 16)}...
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {item.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 6 : CONTRÔLE D'INTÉGRITÉ GLOBAL DÉTAILLÉ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">
              Section 6 &bull; Rapport Exhaustif de Contrôle d'Intégrité
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Dernière analyse : {new Date(rapportIntegrite.dateControle).toLocaleTimeString('fr-FR')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-slate-500 font-medium mb-1">Périodes Valides</div>
            <div className="text-lg font-black text-slate-800">
              {rapportIntegrite.details.periodesValides} / {rapportIntegrite.details.totalPeriodes}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">Format &bull; Verrouillage</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-slate-500 font-medium mb-1">Dossiers Inviolables</div>
            <div className="text-lg font-black text-slate-800">
              {rapportIntegrite.details.dossiersInviolables} / {rapportIntegrite.details.totalDossiers}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">Hashes SHA-256 conformes</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-slate-500 font-medium mb-1">Salariés & Anti-Doublons</div>
            <div className="text-lg font-black text-slate-800">
              {rapportIntegrite.details.totalSalaries}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">CNSS & CNI Uniques</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-slate-500 font-medium mb-1">Références Croisées</div>
            <div className="text-lg font-black text-emerald-700">
              {rapportIntegrite.details.referencesCroiseesValides ? 'CONFORMES' : 'ANOMALIES'}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Paie &bull; Registre &bull; Dossiers</span>
          </div>
        </div>
      </div>
    </div>
  );
}
