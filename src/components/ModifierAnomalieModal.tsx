import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  CreditCard,
  User,
  Hash,
  Lock,
  Edit3,
  HelpCircle,
  Check,
  Building,
  UserCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  AnomalieLigne,
  ResultatRapprochement,
  SalarieReferentiel,
} from '../types/cnss';

export interface DonneesModificationAnomalie {
  joursDeclares?: number;
  justificationJours?: string;
  cni?: string;
  cnss?: string;
  nom?: string;
  salaireBrut?: number;
  leverAnomalie?: boolean;
  justificationLevee?: string;
  anomalieId?: string;
  salarieChoisiId?: string;
  memoriserAlias?: boolean;
  decisionSorti?: 'REACTIVATION_CONFIRMEE' | 'CONSERVE_SORTI';
}

interface ModifierAnomalieModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomalie: AnomalieLigne | null;
  rapprochement: ResultatRapprochement | null;
  baseSalaries: SalarieReferentiel[];
  onSauvegarderModifications: (
    idRapprochement: string,
    donnees: DonneesModificationAnomalie
  ) => void;
}

export const ModifierAnomalieModal: React.FC<ModifierAnomalieModalProps> = ({
  isOpen,
  onClose,
  anomalie,
  rapprochement,
  baseSalaries,
  onSauvegarderModifications,
}) => {
  const [joursDeclares, setJoursDeclares] = useState<number>(0);
  const [justificationJours, setJustificationJours] = useState<string>('');
  const [cni, setCni] = useState<string>('');
  const [cnss, setCnss] = useState<string>('');
  const [nom, setNom] = useState<string>('');
  const [leverAnomalie, setLeverAnomalie] = useState<boolean>(false);
  const [justificationLevee, setJustificationLevee] = useState<string>('');
  const [salarieSelectionneId, setSalarieSelectionneId] = useState<string>('');
  const [memoriserAlias, setMemoriserAlias] = useState<boolean>(true);
  const [decisionSorti, setDecisionSorti] = useState<'REACTIVATION_CONFIRMEE' | 'CONSERVE_SORTI' | undefined>(undefined);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (rapprochement) {
      const jInit = rapprochement.validationJours.joursDeclares !== undefined
        ? rapprochement.validationJours.joursDeclares
        : (rapprochement.validationJours.joursImportes >= 0 && rapprochement.validationJours.joursImportes <= 26
            ? rapprochement.validationJours.joursImportes
            : (rapprochement.validationJours.joursImportes > 26 ? 26 : 0));
      
      setJoursDeclares(jInit);
      setJustificationJours(rapprochement.validationJours.justification || '');
      setCni(rapprochement.cniDeclareeFinale || rapprochement.salariePropose?.cni || '');
      setCnss(rapprochement.cnssDeclareeFinale || rapprochement.salariePropose?.immatriculationCnss || '');
      setNom(rapprochement.nomDeclareFinal || rapprochement.salariePropose?.nomComplet || rapprochement.lignePaieId);
      setSalarieSelectionneId(rapprochement.salariePropose?.id || '');
      setDecisionSorti(rapprochement.decisionSorti);
      setLeverAnomalie(anomalie?.estResolue || false);
      setJustificationLevee(anomalie?.justificationResolution || '');
    }
  }, [rapprochement, anomalie, isOpen]);

  if (!isOpen || !rapprochement) return null;

  const rap = rapprochement;
  const ano = anomalie;

  // Candidats ambigus s'il y en a
  const candidatsDisponibles: Array<{ salarie: SalarieReferentiel; score: number; raison?: string }> = [];
  if (rap.candidats && rap.candidats.length > 0) {
    rap.candidats.forEach(c => candidatsDisponibles.push({ salarie: c.salarie, score: c.score, raison: c.raison }));
  } else if (rap.candidatsAmbigus && rap.candidatsAmbigus.length > 0) {
    rap.candidatsAmbigus.forEach(c => candidatsDisponibles.push(c));
  } else if (rap.salariePropose) {
    candidatsDisponibles.push({ salarie: rap.salariePropose, score: rap.score, raison: rap.explication });
  }

  const handlePlafonner26 = () => {
    setJoursDeclares(26);
    setJustificationJours('Plafonnement au maximum légal de 26 jours ouvrables CNSS');
  };

  const handleNeutraliser0 = () => {
    setJoursDeclares(0);
    setJustificationJours('Neutralisation de la régularisation négative pour la déclaration CNSS');
  };

  const handleValiderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSauvegarderModifications(rap.id, {
      joursDeclares,
      justificationJours: justificationJours || 'Ajusté par le gestionnaire',
      cni: cni.trim().toUpperCase(),
      cnss: cnss.trim(),
      nom: nom.trim(),
      leverAnomalie,
      justificationLevee: justificationLevee || 'Levée manuelle par le gestionnaire avec validation',
      anomalieId: ano?.id,
      salarieChoisiId: salarieSelectionneId,
      memoriserAlias,
      decisionSorti,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              ano?.gravite === 'BLOQUANTE'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Modification & Résolution d'Anomalie</h2>
                {ano && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    ano.gravite === 'BLOQUANTE'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {ano.gravite}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Ligne : <strong className="text-white">{rap.lignePaieId}</strong> &bull; Salarié : <strong className="text-white">{rap.nomDeclareFinal || rap.salariePropose?.nomComplet || rap.lignePaieId}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps du formulaire */}
        <form onSubmit={handleValiderSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* CARTE DE DIAGNOSTIC DE L'ANOMALIE */}
          {ano && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              ano.gravite === 'BLOQUANTE'
                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Code : <span className="font-mono">{ano.code}</span>
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/70 border border-current font-bold">
                  Valeur originale : {String(ano.valeurOriginale)}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">
                {ano.message}
              </p>
              {ano.valeurSuggeree !== undefined && (
                <div className="text-[11px] font-bold text-slate-600 pt-1 border-t border-slate-200/60">
                  Valeur réglementaire suggérée : <span className="text-emerald-700 font-black">{ano.valeurSuggeree}</span>
                </div>
              )}
            </div>
          )}

          {/* RÈGLE D'IMMUTABILITÉ */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>Règle de conformité CNSS :</strong> La valeur importée originale (<span className="font-mono font-bold">{rap.validationJours.joursImportes} j</span>) reste intacte et archivée. Seules les valeurs déclarées sont modifiées pour la transmission Damancom.
            </span>
          </div>

          {/* 1. SECTION MODIFICATION DES JOURS */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Jours à Déclarer (0 à 26 jours)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleNeutraliser0}
                  className="px-2.5 py-1 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg cursor-pointer"
                  title="Neutraliser à 0 jour ouvré"
                >
                  Neutraliser (0 j)
                </button>
                <button
                  type="button"
                  onClick={handlePlafonner26}
                  className="px-2.5 py-1 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg cursor-pointer"
                  title="Plafonner à 26 jours légaux"
                >
                  Plafonner (26 j)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  min="0"
                  max="26"
                  value={joursDeclares}
                  onChange={e => setJoursDeclares(Math.max(0, Math.min(26, Number(e.target.value))))}
                  className="w-full text-base font-bold font-mono px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Valeur importée : {rap.validationJours.joursImportes} j
                </span>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Justification de la correction des jours..."
                  value={justificationJours}
                  onChange={e => setJustificationJours(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Ex: Plafonnement légal, neutralisation négatif
                </span>
              </div>
            </div>
          </div>

          {/* 2. SECTION CAS AMBIGU (ARBITRAGE DES CANDIDATS CONCURRENTS) */}
          {(rap.estAmbigu || ano?.code === 'CORRESPONDANCE_AMBIGUE' || candidatsDisponibles.length > 1) && (
            <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span>Arbitrage des Candidats Ambigus (Sélectionnez le salarié officiel)</span>
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                  {candidatsDisponibles.length} candidats
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {candidatsDisponibles.map(c => {
                  const estChoisi = salarieSelectionneId === c.salarie.id;
                  return (
                    <div
                      key={c.salarie.id}
                      onClick={() => {
                        setSalarieSelectionneId(c.salarie.id);
                        setNom(c.salarie.nomComplet);
                        if (c.salarie.cni) setCni(c.salarie.cni);
                        if (c.salarie.immatriculationCnss) setCnss(c.salarie.immatriculationCnss);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        estChoisi
                          ? 'bg-amber-100 border-amber-500 shadow-2xs ring-2 ring-amber-400'
                          : 'bg-white border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{c.salarie.nomComplet}</span>
                        <span className="font-mono font-black text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded text-[10px]">
                          {c.score}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        CNI: {c.salarie.cni || '-'} &bull; CNSS: {c.salarie.immatriculationCnss || '-'}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className={`font-semibold ${c.salarie.situation === 'SORTI' ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {c.salarie.situation || 'ACTIF'}
                        </span>
                        <button
                          type="button"
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            estChoisi
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {estChoisi ? '✓ Sélectionné' : 'Choisir'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cb-alias-anomodal"
                  checked={memoriserAlias}
                  onChange={e => setMemoriserAlias(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                />
                <label htmlFor="cb-alias-anomodal" className="text-xs text-amber-900 font-semibold cursor-pointer">
                  Mémoriser cette correspondance comme alias pour les prochains mois
                </label>
              </div>
            </div>
          )}

          {/* 3. SECTION IDENTITÉ DÉCLARÉE (NOM, CNI, N° CNSS) */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-600" />
              <span>Identifiants Déclarés (CNI, CNSS & Nom)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nom déclaré</label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">CNI (ex: WA123456)</label>
                <input
                  type="text"
                  placeholder="WA123456"
                  value={cni}
                  onChange={e => setCni(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">N° CNSS (9 chiffres)</label>
                <input
                  type="text"
                  placeholder="101455267"
                  value={cnss}
                  onChange={e => setCnss(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* 4. SECTION SALARIÉ SORTI (RÉACTIVATION OU SORTIE) */}
          {(rap.salariePropose?.situation === 'SORTI' || ano?.code === 'SALARIE_SORTI_AVEC_JOURS') && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold text-purple-950 uppercase tracking-wider block">
                Arbitrage Salarié Sorti
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDecisionSorti('REACTIVATION_CONFIRMEE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    decisionSorti === 'REACTIVATION_CONFIRMEE'
                      ? 'bg-purple-700 text-white'
                      : 'bg-white border border-purple-300 text-purple-900 hover:bg-purple-100'
                  }`}
                >
                  ✓ Réactiver ce salarié pour ce mois
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionSorti('CONSERVE_SORTI')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    decisionSorti === 'CONSERVE_SORTI'
                      ? 'bg-rose-700 text-white'
                      : 'bg-white border border-rose-300 text-rose-900 hover:bg-rose-100'
                  }`}
                >
                  ✕ Maintenir sorti (Ne pas déclarer)
                </button>
              </div>
            </div>
          )}

          {/* 5. LEVÉE / VALIDATION MANUELLE DE L'ANOMALIE */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cb-lever-ano"
                checked={leverAnomalie}
                onChange={e => setLeverAnomalie(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300"
              />
              <label htmlFor="cb-lever-ano" className="text-xs font-bold text-emerald-950 cursor-pointer">
                Marquer cette anomalie comme résolue / levée par dérogation administrative
              </label>
            </div>

            {leverAnomalie && (
              <div>
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                  Motif / Justification obligatoire pour traçabilité d'audit :
                </label>
                <input
                  type="text"
                  required={leverAnomalie}
                  placeholder="Ex: Contrat vérifié, attestation CNSS fournie, dérogation exceptionnelle validée..."
                  value={justificationLevee}
                  onChange={e => setJustificationLevee(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Footer boutons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer les modifications & Valider</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
