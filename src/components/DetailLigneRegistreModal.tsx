import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Clock,
  User,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Unlock,
  Edit,
  History,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { LigneRegistreCnss, EvenementAudit } from '../types/cnss';

interface DetailLigneRegistreModalProps {
  isOpen: boolean;
  onClose: () => void;
  ligne: LigneRegistreCnss | null;
  journalAudit: EvenementAudit[];
  statutPeriode: string;
  onValiderLigne: (ligneId: string) => void;
  onCorrigerJours: (ligneId: string, nouveauxJours: number, motif: string) => void;
  onDemanderReouverture: (ligneId: string, motif: string) => void;
}

export const DetailLigneRegistreModal: React.FC<DetailLigneRegistreModalProps> = ({
  isOpen,
  onClose,
  ligne,
  journalAudit,
  statutPeriode,
  onValiderLigne,
  onCorrigerJours,
  onDemanderReouverture,
}) => {
  const [modeCorrectionJours, setModeCorrectionJours] = useState(false);
  const [joursSaisis, setJoursSaisis] = useState<number>(ligne?.joursDeclares ?? 26);
  const [motifCorrection, setMotifCorrection] = useState('');
  const [erreurCorrection, setErreurCorrection] = useState<string | null>(null);

  const [modeReouverture, setModeReouverture] = useState(false);
  const [motifReouverture, setMotifReouverture] = useState('');
  const [erreurReouverture, setErreurReouverture] = useState<string | null>(null);

  if (!isOpen || !ligne) return null;

  const estVerrouillePeriode = statutPeriode === 'CLOTURE';
  const auditsLigne = journalAudit.filter(
    a => a.salarie === ligne.nomOfficiel || (ligne.salarieId && a.salarie?.includes(ligne.salarieId))
  );

  const handleValiderCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motifCorrection.trim()) {
      setErreurCorrection('La justification est obligatoire.');
      return;
    }
    if (isNaN(joursSaisis) || joursSaisis < 0 || joursSaisis > 26) {
      setErreurCorrection('Les jours déclarés doivent être compris entre 0 et 26.');
      return;
    }
    onCorrigerJours(ligne.id, joursSaisis, motifCorrection.trim());
    setModeCorrectionJours(false);
    setMotifCorrection('');
    setErreurCorrection(null);
  };

  const handleValiderReouverture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motifReouverture.trim()) {
      setErreurReouverture('Le motif de réouverture est obligatoire.');
      return;
    }
    onDemanderReouverture(ligne.id, motifReouverture.trim());
    setModeReouverture(false);
    setMotifReouverture('');
    setErreurReouverture(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{ligne.nomOfficiel}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ligne.statut === 'VALIDE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : ligne.statut === 'PRET'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : ligne.statut === 'A_COMPLETER'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : ligne.statut === 'A_CORRIGER'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {ligne.statut}
                </span>
                {ligne.verrouille && (
                  <span className="flex items-center gap-1 text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3 text-amber-400" /> Verrouillé
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Ligne {ligne.numeroLigneSource} &bull; Réf: {ligne.salarieId || 'Non matriculé'} &bull; Source : {ligne.sourceFileId || 'calcul_salaire'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Motifs de blocage si présents */}
          {ligne.motifsBlocage.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Points d'attention / Blocages :</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                {ligne.motifsBlocage.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 1 : Identification */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              1. Identification Référentielle
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] text-slate-500 block">Nom Officiel</span>
                <span className="font-semibold text-slate-900">{ligne.nomOfficiel}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Nom Source (Fichier)</span>
                <span className="font-mono text-xs text-slate-700">{ligne.nomSource}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">N° CNI</span>
                <span className={`font-mono text-xs font-bold ${ligne.cni === 'MANQUANT' ? 'text-amber-600' : 'text-slate-800'}`}>
                  {ligne.cni}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">N° CNSS</span>
                <span className={`font-mono text-xs font-bold ${ligne.cnss === 'MANQUANT' ? 'text-amber-600' : 'text-slate-800'}`}>
                  {ligne.cnss}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2 : Comparaison Source vs Déclaration */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              2. Données Paie Source vs Déclaration CNSS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Colonne Source (Immuable) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Données Sources (Immuables)</span>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">Source</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Jours travaillés importés :</span>
                  <span className="font-bold text-slate-900">{ligne.joursImportes} j</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Salaire de base importé :</span>
                  <span className="font-mono text-slate-700">{ligne.baseImportee.toLocaleString('fr-FR')} MAD</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Salaire brut importé :</span>
                  <span className="font-mono text-slate-700">{ligne.salaireBrutImporte.toLocaleString('fr-FR')} MAD</span>
                </div>
              </div>

              {/* Colonne Déclarée */}
              <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                  <span className="text-xs font-bold text-teal-900">Données Destinées à la Déclaration</span>
                  <span className="text-[10px] bg-teal-200 text-teal-800 px-2 py-0.5 rounded font-mono">Déclaration</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-teal-900 font-medium">Jours déclarés validés :</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-teal-900 text-sm">{ligne.joursDeclares} j</span>
                    {ligne.joursDeclares !== ligne.joursImportes && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                        Corrigé
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-teal-900 font-medium">Base déclarée :</span>
                  <span className="font-mono text-teal-950 font-bold">{ligne.baseDeclaree.toLocaleString('fr-FR')} MAD</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-teal-900 font-medium">Brut déclaré :</span>
                  <span className="font-mono text-teal-950 font-bold">{ligne.salaireBrutDeclare.toLocaleString('fr-FR')} MAD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formulaire de correction de jours */}
          {modeCorrectionJours && (
            <form onSubmit={handleValiderCorrection} className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Edit className="w-3.5 h-3.5 text-amber-700" />
                  Corriger les jours déclarés (Source {ligne.joursImportes} j reste intacte)
                </span>
                <button
                  type="button"
                  onClick={() => setModeCorrectionJours(false)}
                  className="text-amber-800 text-xs hover:underline cursor-pointer"
                >
                  Annuler
                </button>
              </div>

              {erreurCorrection && (
                <p className="text-xs text-rose-600 font-medium">{erreurCorrection}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nouveaux jours déclarés (0-26)</label>
                  <input
                    type="number"
                    min={0}
                    max={26}
                    value={joursSaisis}
                    onChange={e => setJoursSaisis(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Justification obligatoire <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Plafonnement légal 26 jours validé..."
                    value={motifCorrection}
                    onChange={e => setMotifCorrection(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  Enregistrer la correction
                </button>
              </div>
            </form>
          )}

          {/* Formulaire de demande de réouverture */}
          {modeReouverture && (
            <form onSubmit={handleValiderReouverture} className="p-4 bg-orange-50 border border-orange-300 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                  <Unlock className="w-3.5 h-3.5 text-orange-700" />
                  Demande de réouverture de ligne verrouillée
                </span>
                <button
                  type="button"
                  onClick={() => setModeReouverture(false)}
                  className="text-orange-800 text-xs hover:underline cursor-pointer"
                >
                  Annuler
                </button>
              </div>

              {erreurReouverture && (
                <p className="text-xs text-rose-600 font-medium">{erreurReouverture}</p>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Motif obligatoire de la réouverture <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Régularisation suite à réclamation salarié..."
                  value={motifReouverture}
                  onChange={e => setMotifReouverture(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  Confirmer la réouverture
                </button>
              </div>
            </form>
          )}

          {/* Section 3 : Historique des corrections */}
          {ligne.corrections.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                3. Corrections & Décisions Appliquées ({ligne.corrections.length})
              </h3>
              <div className="space-y-2">
                {ligne.corrections.map((cor, i) => (
                  <div key={i} className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-900">Champ: {cor.champ}</span>
                        <span className="text-slate-500">{cor.ancienneValeur} &rarr; <span className="font-bold text-slate-900">{cor.nouvelleValeur}</span></span>
                      </div>
                      <p className="text-slate-600 mt-1 italic">« {cor.motif} »</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Auteur : {cor.auteur}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(cor.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4 : Audit Trail */}
          {auditsLigne.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                4. Journal d'Audit ({auditsLigne.length} événements)
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {auditsLigne.map((a, i) => (
                  <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800">{a.action}</span>
                      <span className="text-slate-500 ml-2">{a.justification}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {new Date(a.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pied d'actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {!ligne.verrouille && !estVerrouillePeriode && (
              <button
                type="button"
                onClick={() => setModeCorrectionJours(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-amber-600" />
                Modifier les jours
              </button>
            )}

            {ligne.verrouille && !estVerrouillePeriode && (
              <button
                type="button"
                onClick={() => setModeReouverture(true)}
                className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5 text-orange-600" />
                Demander réouverture
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Fermer
            </button>

            {ligne.statut === 'PRET' && !estVerrouillePeriode && (
              <button
                type="button"
                onClick={() => {
                  onValiderLigne(ligne.id);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Valider la ligne
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
