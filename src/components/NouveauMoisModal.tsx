import React, { useState } from 'react';
import { Calendar, Plus, X, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { persistenceService } from '../services/persistenceService';
import { PeriodeMensuelle } from '../types/cnss';

interface NouveauMoisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPeriodeCreee: (periode: PeriodeMensuelle) => void;
  periodesExistantes: PeriodeMensuelle[];
  totalSalariesBase: number;
  totalAliases: number;
}

export const NouveauMoisModal: React.FC<NouveauMoisModalProps> = ({
  isOpen,
  onClose,
  onPeriodeCreee,
  periodesExistantes,
  totalSalariesBase,
  totalAliases,
}) => {
  const [annee, setAnnee] = useState(2026);
  const [mois, setMois] = useState(10); // Octobre par défaut
  const [erreur, setErreur] = useState<string | null>(null);

  if (!isOpen) return null;

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const moisFormatted = String(mois).padStart(2, '0');
  const idMois = `${annee}-${moisFormatted}`;
  const libelleMois = `${moisNoms[mois - 1]} ${annee}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    // Vérifier si la période existe déjà
    const existante = periodesExistantes.find(p => p.idMois === idMois);
    if (existante) {
      setErreur(`La période ${libelleMois} (${idMois}) existe déjà. Vous pouvez directement la sélectionner dans le sélecteur de mois.`);
      return;
    }

    const { periode } = persistenceService.creerPeriode(idMois, libelleMois);
    onPeriodeCreee(periode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Créer une nouvelle période</h2>
              <p className="text-xs text-emerald-100">Traitement mensuel CNSS MULT.S</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {erreur && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{erreur}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
              Sélectionnez le mois à préparer
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Mois</span>
                <select
                  value={mois}
                  onChange={e => setMois(Number(e.target.value))}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  {moisNoms.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1} - {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Année</span>
                <select
                  value={annee}
                  onChange={e => setAnnee(Number(e.target.value))}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </div>
          </div>

          {/* Récapitulatif de création */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span>Période ciblée :</span>
              <span className="font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                {libelleMois} ({idMois})
              </span>
            </div>
            <div className="text-[11px] text-slate-600 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Base salariés référentielle conservée (<strong>{totalSalariesBase} salariés</strong>)</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Table des alias validés conservée (<strong>{totalAliases} alias</strong>)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Aucune donnée de paie précédente n'est dupliquée (départ vierge)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Créer la Période</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
