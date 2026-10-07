import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  UserX,
  UserPlus,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Save,
  Check,
  Building,
  CreditCard,
  Calendar,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { SituationEmploye } from '../types/cnss';

export interface SalariePourModificationStatut {
  id: string;
  nomComplet: string;
  cni?: string;
  immatriculationCnss?: string;
  situation?: SituationEmploye;
  joursMois?: number;
}

interface ModifierStatutSalarieModalProps {
  isOpen: boolean;
  onClose: () => void;
  salarie: SalariePourModificationStatut | null;
  periodeId?: string;
  onConfirmer: (
    salarieId: string,
    nouveauStatut: SituationEmploye,
    motif: string
  ) => Promise<void>;
}

export const ModifierStatutSalarieModal: React.FC<ModifierStatutSalarieModalProps> = ({
  isOpen,
  onClose,
  salarie,
  periodeId = '2026-09',
  onConfirmer,
}) => {
  const [statutSelectionne, setStatutSelectionne] = useState<SituationEmploye>('ACTIF');
  const [motif, setMotif] = useState<string>('');
  const [enCours, setEnCours] = useState<boolean>(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (salarie) {
      const sit = salarie.situation || 'ACTIF';
      setStatutSelectionne(sit);
      setErreur(null);
      setEnCours(false);
      // Pré-remplir un motif cohérent par défaut
      if (sit === 'SORTI' && (salarie.joursMois || 0) > 0) {
        setMotif('Arbitrage humain : Salarié sorti avec jours de paie');
      } else {
        setMotif('');
      }
    }
  }, [salarie]);

  if (!isOpen || !salarie) return null;

  const ancienStatut = salarie.situation || 'ACTIF';
  const aDesJoursMaisSorti = ancienStatut === 'SORTI' && (salarie.joursMois || 0) > 0;
  const passageSortiVersActif = ancienStatut === 'SORTI' && (statutSelectionne === 'ACTIF' || statutSelectionne === 'A_VERIFIER');

  const statutsDisponibles: Array<{
    valeur: SituationEmploye;
    label: string;
    description: string;
    couleur: string;
    bgSelectionne: string;
    borderSelectionne: string;
    badgeCls: string;
    icone: any;
  }> = [
    {
      valeur: 'ACTIF',
      label: 'ACTIF',
      description: 'Salarié présent et en activité normale, déclaré aux bordereaux CNSS.',
      couleur: 'text-emerald-700',
      bgSelectionne: 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/30',
      borderSelectionne: 'border-emerald-300',
      badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icone: UserCheck,
    },
    {
      valeur: 'SORTI',
      label: 'SORTI',
      description: 'Salarié ayant quitté l’entreprise (démission, fin contrat). Suivi des sorties.',
      couleur: 'text-slate-700',
      bgSelectionne: 'bg-slate-100 border-slate-700 ring-2 ring-slate-700/20',
      borderSelectionne: 'border-slate-300',
      badgeCls: 'bg-slate-200 text-slate-800 border-slate-300',
      icone: UserX,
    },
    {
      valeur: 'ENTRANT',
      label: 'ENTRANT',
      description: 'Nouveau collaborateur entrant au cours de la période (nouvelle embauche).',
      couleur: 'text-blue-700',
      bgSelectionne: 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/30',
      borderSelectionne: 'border-blue-300',
      badgeCls: 'bg-blue-100 text-blue-800 border-blue-200',
      icone: UserPlus,
    },
    {
      valeur: 'A_VERIFIER',
      label: 'À_VÉRIFIER',
      description: 'Statut incertain en attente de vérification administrative ou contrat RH.',
      couleur: 'text-amber-700',
      bgSelectionne: 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/30',
      borderSelectionne: 'border-amber-300',
      badgeCls: 'bg-amber-100 text-amber-900 border-amber-300',
      icone: HelpCircle,
    },
  ];

  const handleValider = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    try {
      const motifFinal = motif.trim() ||
        (ancienStatut === 'SORTI' && statutSelectionne === 'ACTIF'
          ? 'Arbitrage humain : réactivation du salarié sorti'
          : `Modification manuelle du statut : ${ancienStatut} ➔ ${statutSelectionne}`);

      await onConfirmer(salarie.id, statutSelectionne, motifFinal);
      onClose();
    } catch (err: any) {
      console.error('[SUPABASE-SYNC] Erreur validation modal', err);
      setErreur(err.message || 'Échec de l’enregistrement du statut dans Supabase');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <UserCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Modifier le Statut du Salarié</h3>
              <p className="text-[11px] text-slate-300">
                Mise à jour en temps réel dans Supabase & traçabilité d'audit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={enCours}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps formulaire */}
        <form onSubmit={handleValider} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Fiche Salarié */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Salarié Référentiel
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Période {periodeId}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900">{salarie.nomComplet}</h4>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-mono">
                  <span>CNI: {salarie.cni || 'Non renseignée'}</span>
                  <span>&bull;</span>
                  <span>CNSS: {salarie.immatriculationCnss || 'Non renseigné'}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block mb-0.5">Statut actuel</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-black border ${
                  ancienStatut === 'ACTIF'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : ancienStatut === 'SORTI'
                    ? 'bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {ancienStatut}
                </span>
              </div>
            </div>

            {salarie.joursMois !== undefined && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Jours travaillés / déclarés ce mois :</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {salarie.joursMois} jours
                </span>
              </div>
            )}
          </div>

          {/* AVERTISSEMENT CAS PARTICULIER : SORTI AVEC JOURS > 0 */}
          {aDesJoursMaisSorti && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block text-[11px] font-bold">
                  Cas Particulier : Salarié noté SORTI avec {salarie.joursMois} jours de paie
                </strong>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Le statut n'est jamais réactivé automatiquement. La décision doit rester une démarche humaine explicite et sera consignée au journal d'audit comme arbitrage officiel.
                </p>
              </div>
            </div>
          )}

          {/* SÉLECTION DU NOUVEAU STATUT */}
          <div className="space-y-2">
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              Choisir le nouveau statut :
            </label>

            <div className="grid grid-cols-1 gap-2">
              {statutsDisponibles.map(opt => {
                const estChoisi = statutSelectionne === opt.valeur;
                const Icone = opt.icone;

                return (
                  <div
                    key={opt.valeur}
                    onClick={() => setStatutSelectionne(opt.valeur)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      estChoisi
                        ? opt.bgSelectionne
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${estChoisi ? 'bg-white shadow-2xs' : 'bg-slate-100'}`}>
                        <Icone className={`w-4 h-4 ${opt.couleur}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{opt.label}</span>
                          {estChoisi && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                              Sélectionné
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {opt.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        estChoisi ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}>
                        {estChoisi && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MOTIF / JUSTIFICATION */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              Motif de la décision / Justification {passageSortiVersActif && <span className="text-amber-600 font-bold">*</span>}
            </label>
            <textarea
              rows={2}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder={
                passageSortiVersActif
                  ? "Ex: Réactivation confirmée suite à reprise d'activité ou réembauche..."
                  : "Ex: Ajustement de situation RH, départ confirmé, fin de période d'essai..."
              }
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white resize-none"
            />
            <span className="text-[10px] text-slate-400 block">
              Cette justification sera stockée dans le journal d'audit (`audit_logs`) avec votre compte utilisateur.
            </span>
          </div>

          {/* MESSAGE PERSISTANCE SUPABASE */}
          <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px] text-indigo-950 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Source de vérité :</strong> Enregistrement garanti dans Supabase (table <code>employees</code>) avec synchronisation locale et persistance F5.
            </span>
          </div>

          {/* ERREUR EVENTUELLE */}
          {erreur && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {/* PIED DE MODALE / ACTIONS */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={enCours}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={enCours}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enCours ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Enregistrement dans Supabase...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Confirmer la modification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
