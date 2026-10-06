import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  FileCheck2,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  BilanControlePret,
  StatutPeriode,
  ResultatRapprochement,
  SortieItem,
  AnomalieLigne,
} from '../types/cnss';

interface ClotureModalProps {
  isOpen: boolean;
  onClose: () => void;
  moisActif: string;
  statutPeriode: StatutPeriode;
  bilanPret: BilanControlePret;
  rapprochements: ResultatRapprochement[];
  sorties: SortieItem[];
  anomalies: AnomalieLigne[];
  onCloturerMois: (justification: string) => void;
  onReouvrirMois: (justification: string) => void;
  onNaviguerVersAnomalies: () => void;
}

export const ClotureModal: React.FC<ClotureModalProps> = ({
  isOpen,
  onClose,
  moisActif,
  statutPeriode,
  bilanPret,
  rapprochements,
  sorties,
  anomalies,
  onCloturerMois,
  onReouvrirMois,
  onNaviguerVersAnomalies,
}) => {
  const [justification, setJustification] = useState('');
  const [modeReouverture, setModeReouverture] = useState(false);

  if (!isOpen) return null;

  const estCloture = statutPeriode === 'CLOTURE';

  // Statistiques de synthèse
  const salariesDeclares = rapprochements.filter(r => (r.validationJours.joursDeclares ?? r.validationJours.joursImportes) > 0).length;
  const nouveauxConfirmes = rapprochements.filter(r => r.estMarqueNouveau).length;
  const sortiesConfirmees = sorties.filter(s => s.statutSortie === 'SORTIE_CONFIRMEE').length;
  const anomaliesResolues = anomalies.filter(a => a.estResolue).length;
  const anomaliesRestantes = anomalies.filter(a => !a.estResolue).length;
  const totalJoursImportes = rapprochements.reduce((acc, r) => acc + r.validationJours.joursImportes, 0);
  const totalJoursDeclares = rapprochements.reduce((acc, r) => acc + (r.validationJours.joursDeclares ?? (r.validationJours.joursImportes > 0 ? r.validationJours.joursImportes : 0)), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
        {/* En-tête */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {estCloture ? (
              <Lock className="w-5 h-5 text-rose-600" />
            ) : (
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
            )}
            <h3 className="font-bold text-slate-900 text-sm">
              Contrôle Global & Clôture Mensuelle ({moisActif})
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. VERDICT D'ÉLIGIBILITÉ (Section 18) */}
        {!estCloture && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            bilanPret.estPret
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}>
            {bilanPret.estPret ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className="font-bold text-sm">
                Statut : {bilanPret.estPret ? 'PRÊT POUR DÉCLARATION CNSS' : 'NON PRÊT (DÉCLARATION BLOQUÉE)'}
              </h4>
              <p className="text-xs mt-1">
                {bilanPret.estPret
                  ? 'Toutes les vérifications obligatoires sont validées : aucun jour négatif, aucun dépassement de 26 jours non résolu, aucune anomalie bloquante résiduelle.'
                  : `${bilanPret.totalBloquantes} blocage(s) critique(s) doivent être résolus avant de pouvoir clôturer la déclaration.`}
              </p>

              {/* Liste des blocages */}
              {!bilanPret.estPret && (
                <div className="mt-3 space-y-1 bg-white/80 p-3 rounded-lg border border-rose-200 text-xs text-rose-900">
                  <span className="font-bold block mb-1">Motifs de blocage constatés :</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {bilanPret.blocages.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      onClose();
                      onNaviguerVersAnomalies();
                    }}
                    className="mt-2 text-xs font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer block"
                  >
                    Aller dans l'écran « Contrôles & Anomalies » pour traiter ces blocages &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. RÉSUMÉ DE SYNTHÈSE (Section 20) */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Bilan Consolidé de la Période
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Salariés à Déclarer</span>
              <strong className="text-base text-slate-900 mt-0.5 block">{salariesDeclares}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Nouveaux Entrants</span>
              <strong className="text-base text-blue-700 mt-0.5 block">{nouveauxConfirmes}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Sorties Confirmées</span>
              <strong className="text-base text-slate-700 mt-0.5 block">{sortiesConfirmees}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Anomalies Résolues</span>
              <strong className="text-base text-emerald-700 mt-0.5 block">{anomaliesResolues} / {anomalies.length}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Jours Importés (Original)</span>
              <strong className="text-base text-slate-900 mt-0.5 block">{totalJoursImportes} j</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Jours Déclarés (Final)</span>
              <strong className="text-base text-emerald-700 mt-0.5 block">{totalJoursDeclares} j</strong>
            </div>
          </div>
        </div>

        {/* 3. ACTIONS DE CLÔTURE OU RÉOUVERTURE (Section 20) */}
        <div className="pt-2 border-t border-slate-200 text-xs space-y-3">
          {estCloture ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <Lock className="w-4 h-4 text-rose-600" />
                <span>Ce mois est actuellement CLÔTURÉ et verrouillé contre toute modification accidentelle.</span>
              </div>

              {!modeReouverture ? (
                <button
                  onClick={() => setModeReouverture(true)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold cursor-pointer"
                >
                  Demander la réouverture du mois
                </button>
              ) : (
                <div className="space-y-2 pt-2 border-t border-rose-200">
                  <label htmlFor="input-motif-reouverture" className="font-bold block">Motif de réouverture (obligatoire) :</label>
                  <input
                    id="input-motif-reouverture"
                    type="text"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Ex: Rectification pointage mission intérim suite à réclamation client..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setModeReouverture(false)}
                      className="px-3 py-1 bg-slate-100 rounded"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        onReouvrirMois(justification || 'Réouverture autorisée par le gestionnaire');
                        onClose();
                      }}
                      className="px-3 py-1 bg-rose-600 text-white font-bold rounded cursor-pointer"
                    >
                      Confirmer la réouverture
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="input-justification-cloture" className="font-bold text-slate-700 block mb-1">
                  Justification ou note de clôture (pour journal d'audit) :
                </label>
                <input
                  id="input-justification-cloture"
                  type="text"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Ex: Déclaration Septembre 2026 contrôlée et prête pour télétransmission Damancom"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    onCloturerMois(justification || 'Clôture de la période par le gestionnaire');
                    onClose();
                  }}
                  disabled={!bilanPret.estPret}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>CLÔTURER LE MOIS (VERROUILLER)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
