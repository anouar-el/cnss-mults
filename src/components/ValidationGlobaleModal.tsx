import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  ResultatRapprochement,
  AnomalieLigne,
} from '../types/cnss';
import { determinerStatutLigneP5 } from '../services/matchingEngine';

interface ValidationGlobaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rapprochements: ResultatRapprochement[];
  anomalies: AnomalieLigne[];
  onFiltrerCategorie: (categorie: string) => void;
  onConfirmerValidationGlobale: () => void;
}

export const ValidationGlobaleModal: React.FC<ValidationGlobaleModalProps> = ({
  isOpen,
  onClose,
  rapprochements,
  anomalies,
  onFiltrerCategorie,
  onConfirmerValidationGlobale,
}) => {
  if (!isOpen) return null;

  // Calcul strict des blocages selon la Section 15
  const lignesAmbigues = rapprochements.filter(r => determinerStatutLigneP5(r) === 'AMBIGU');
  const lignesNonIdentifiees = rapprochements.filter(r => determinerStatutLigneP5(r) === 'NON_IDENTIFIE');
  const lignesSortisAArbitrer = rapprochements.filter(r => determinerStatutLigneP5(r) === 'SORTI_A_ARBITRER');
  const anomaliesBloquantes = anomalies.filter(a => a.gravite === 'BLOQUANTE' && !a.estResolue);

  const totalElementsBloquants =
    lignesAmbigues.length +
    lignesNonIdentifiees.length +
    lignesSortisAArbitrer.length +
    anomaliesBloquantes.length;

  const estTotalementPret = totalElementsBloquants === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className={`p-5 flex items-center justify-between text-white ${
          estTotalementPret
            ? 'bg-gradient-to-r from-emerald-700 to-teal-800'
            : 'bg-gradient-to-r from-rose-800 to-slate-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              {estTotalementPret ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-rose-300" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold">Contrôle de Validation Globale</h2>
              <p className="text-xs opacity-90">
                {estTotalementPret ? 'Toutes les conditions sont remplies' : `${totalElementsBloquants} élément(s) bloquant(s) identifié(s)`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-4">
          {estTotalementPret ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Rapprochement 100% conforme et prêt pour déclaration
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Toutes les correspondances sont établies, les ambiguïtés sont arbitrées, et les anomalies de jours sont validées avec justification.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Validation impossible : {totalElementsBloquants} élément(s) nécessite(nt) une action</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs border border-slate-200 rounded-xl overflow-hidden">
                {lignesAmbigues.length > 0 && (
                  <div className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-amber-900 block">
                        {lignesAmbigues.length} Salarié(s) ambigu(s)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Scores trop proches &bull; Arbitrage obligatoire
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onFiltrerCategorie('AMBIGU');
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Traiter</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {lignesNonIdentifiees.length > 0 && (
                  <div className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-rose-900 block">
                        {lignesNonIdentifiees.length} Salarié(s) non identifié(s)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Score &lt; 80% &bull; Rattachement ou création
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onFiltrerCategorie('NON_IDENTIFIE');
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Traiter</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {lignesSortisAArbitrer.length > 0 && (
                  <div className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-purple-900 block">
                        {lignesSortisAArbitrer.length} Salarié(s) sorti(s) avec jours
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Réactivation ou maintien sorti
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onFiltrerCategorie('SORTIS');
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Traiter</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {anomaliesBloquantes.length > 0 && (
                  <div className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-rose-900 block">
                        {anomaliesBloquantes.length} Anomalie(s) bloquante(s) de jours
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Jours &gt; 26, négatifs ou invalides
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onFiltrerCategorie('ANOMALIES');
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Traiter</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>

          {estTotalementPret && (
            <button
              type="button"
              onClick={() => {
                onConfirmerValidationGlobale();
                onClose();
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Valider Définitivement le Rapprochement</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
