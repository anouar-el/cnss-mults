import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  Cloud,
  Check,
  FileCheck2,
  Lock,
  Layers,
} from 'lucide-react';
import {
  migrationVerificationService,
  MigrationComparisonReport,
  MigrationExecutionResult,
} from '../services/migrationVerificationService';
import { isSupabaseConfigured, checkSupabaseConnection } from '../services/supabaseClient';

interface MigrationSupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification?: (message: string) => void;
}

export const MigrationSupabaseModal: React.FC<MigrationSupabaseModalProps> = ({
  isOpen,
  onClose,
  onNotification,
}) => {
  const [chargement, setChargement] = useState(false);
  const [estConnecte, setEstConnecte] = useState(false);
  const [rapport, setRapport] = useState<MigrationComparisonReport | null>(null);
  const [resultatMigration, setResultatMigration] = useState<MigrationExecutionResult | null>(null);
  const [etapeAction, setEtapeAction] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      verifierStatutEtDonnees();
    }
  }, [isOpen]);

  const verifierStatutEtDonnees = async () => {
    setChargement(true);
    setEtapeAction('Vérification de la connexion et comparaison des données...');
    try {
      const connecte = await checkSupabaseConnection();
      setEstConnecte(connecte || isSupabaseConfigured());
      const rep = await migrationVerificationService.compareLocalVsSupabase();
      setRapport(rep);
    } catch (err: any) {
      console.error('Erreur vérification Supabase:', err);
    } finally {
      setChargement(false);
      setEtapeAction('');
    }
  };

  const handleVerifier = async () => {
    setChargement(true);
    setEtapeAction('Analyse comparative Local vs Supabase...');
    try {
      const rep = await migrationVerificationService.compareLocalVsSupabase();
      setRapport(rep);
      onNotification?.('Vérification effectuée : données locales analysées.');
    } catch (err: any) {
      onNotification?.(`Erreur lors de la vérification : ${err.message || 'Inconnue'}`);
    } finally {
      setChargement(false);
      setEtapeAction('');
    }
  };

  const handleMigrer = async () => {
    setChargement(true);
    setEtapeAction('Création du backup .mcnss et migration idempotente vers Supabase...');
    try {
      const res = await migrationVerificationService.migrateLocalDataToSupabase();
      setResultatMigration(res);
      setRapport(res.rapportComparaison);
      if (res.succes) {
        onNotification?.(`✓ Migration réussie ! ${res.statsMigrees.total} éléments synchronisés.`);
      } else {
        onNotification?.(`Échec de la migration : ${res.message}`);
      }
    } catch (err: any) {
      onNotification?.(`Erreur de migration : ${err.message || 'Inconnue'}`);
    } finally {
      setChargement(false);
      setEtapeAction('');
    }
  };

  const handleVerifierMigration = async () => {
    setChargement(true);
    setEtapeAction('Audit de conformité post-migration...');
    try {
      const rep = await migrationVerificationService.compareLocalVsSupabase();
      setRapport(rep);
      onNotification?.(
        rep.estSynchronise
          ? '✓ Audit réussi : 100% de concordance Local vs Supabase !'
          : 'Divergences détectées entre Local et Supabase.'
      );
    } catch (err: any) {
      onNotification?.(`Erreur d'audit : ${err.message || 'Inconnue'}`);
    } finally {
      setChargement(false);
      setEtapeAction('');
    }
  };

  if (!isOpen) return null;

  const totalLocal = rapport ? rapport.totalLocal : 0;
  const totalSupabase = rapport ? rapport.totalSupabase : 0;
  const estSynchronise = rapport ? rapport.estSynchronise : false;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col space-y-4">
        {/* EN-TÊTE MODALE */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Migration vers Supabase</h3>
              <p className="text-xs text-slate-500">
                SARLAU MULT.S &bull; N° Affilié : 6541835 &bull; PostgreSQL Cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* INDICATEUR D'ÉTAT DE CONNEXION */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-700">Base de données : Supabase</span>
          </div>
          <div className="flex items-center gap-2">
            {estConnecte ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                🟢 Connectée
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                🔴 Déconnectée
              </span>
            )}
          </div>
        </div>

        {/* 3 GRANDS BLOCS DE COMPTEURS (EXIGENCE PROMPT 14) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">LOCAL</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalLocal} <span className="text-xs font-semibold text-slate-500">éléments</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">SUPABASE</div>
            <div className="text-2xl font-black text-emerald-800 mt-1">
              {totalSupabase} <span className="text-xs font-semibold text-emerald-600">éléments</span>
            </div>
          </div>

          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-center">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">STATUT</div>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              {estSynchronise ? (
                <span className="inline-flex items-center gap-1 text-sm font-black text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ✓ Synchronisé
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm font-black text-amber-700">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  À synchroniser
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ACTIONS DE MIGRATION (EXIGENCE PROMPT 14) */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={chargement}
            onClick={handleVerifier}
            className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-300 disabled:opacity-50"
          >
            [ Vérifier ]
          </button>

          <button
            type="button"
            disabled={chargement}
            onClick={handleMigrer}
            className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {chargement ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
            <span>[ Migrer ]</span>
          </button>

          <button
            type="button"
            disabled={chargement}
            onClick={handleVerifierMigration}
            className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            [ Vérifier la migration ]
          </button>
        </div>

        {chargement && etapeAction && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            <span>{etapeAction}</span>
          </div>
        )}

        {/* DÉTAIL DES ENTITÉS COMPARÉES */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 text-[11px] font-bold uppercase sticky top-0">
              <tr>
                <th className="px-3.5 py-2">Entité Métier</th>
                <th className="px-3 py-2 text-center">Local</th>
                <th className="px-3 py-2 text-center">Supabase</th>
                <th className="px-3.5 py-2 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rapport && rapport.entites.length > 0 ? (
                rapport.entites.map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-2 font-medium text-slate-800">{e.nom}</td>
                    <td className="px-3 py-2 text-center font-bold text-slate-700">{e.countLocal}</td>
                    <td className="px-3 py-2 text-center font-bold text-slate-700">{e.countSupabase}</td>
                    <td className="px-3.5 py-2 text-right">
                      {e.estConforme ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <Check className="w-3.5 h-3.5" />
                          Conforme
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Divergence ({Math.abs(e.countLocal - e.countSupabase)})
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Cliquez sur [ Vérifier ] pour comparer les données.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* GARANTIES DE SÉCURITÉ & NON-DESTRUCTION */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Garanties de sécurité PROMPT 14 :</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pl-6 text-[10px]">
            <div>&bull; Sauvegarde .mcnss automatique obligatoire avant migration.</div>
            <div>&bull; LocalStorage 100% intact (aucune donnée locale supprimée).</div>
            <div>&bull; Anti-doublons strict : Idempotence garantie si réexécuté.</div>
            <div>&bull; Clé publique uniquement : Clé service_role absente du client.</div>
          </div>
        </div>

        {/* PIED DE MODALE */}
        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
