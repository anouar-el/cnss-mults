import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  UserCheck,
  Search,
  UserPlus,
  HelpCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  Building,
  CreditCard,
  Calendar,
  Check,
} from 'lucide-react';
import {
  ResultatRapprochement,
  SalarieReferentiel,
  AnomalieLigne,
} from '../types/cnss';
import { determinerStatutLigneP5 } from '../services/matchingEngine';

interface ComparaisonFaceAFaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  rapprochement: ResultatRapprochement | null;
  baseSalaries: SalarieReferentiel[];
  anomaliesLigne: AnomalieLigne[];
  onConfirmerSalarie: (idRapprochement: string, memoriserAlias: boolean) => void;
  onChoisirCandidat: (idRapprochement: string, salarieId: string, memoriserAlias: boolean) => void;
  onRattacherManuellement: (idRapprochement: string, salarieId: string, memoriserAlias: boolean) => void;
  onCreerNouveauSalarie: (idRapprochement: string, nom: string, cni?: string, cnss?: string) => void;
  onLaisserNonIdentifie: (idRapprochement: string) => void;
}

export const ComparaisonFaceAFaceModal: React.FC<ComparaisonFaceAFaceModalProps> = ({
  isOpen,
  onClose,
  rapprochement,
  baseSalaries,
  anomaliesLigne,
  onConfirmerSalarie,
  onChoisirCandidat,
  onRattacherManuellement,
  onCreerNouveauSalarie,
  onLaisserNonIdentifie,
}) => {
  const [memoriserAlias, setMemoriserAlias] = useState(true);
  const [modeSelectionCandidat, setModeSelectionCandidat] = useState(false);
  const [modeRechercheManuelle, setModeRechercheManuelle] = useState(false);
  const [modeCreationNouveau, setModeCreationNouveau] = useState(false);
  const [termeRecherche, setTermeRecherche] = useState('');

  // Formulaire nouveau salarié
  const [nomNouveau, setNomNouveau] = useState('');
  const [cniNouveau, setCniNouveau] = useState('');
  const [cnssNouveau, setCnssNouveau] = useState('');

  if (!isOpen || !rapprochement) return null;

  const rap = rapprochement;
  const salarie = rap.salariePropose;
  const statutP5 = determinerStatutLigneP5(rap);
  const candidats = (rap.candidats && rap.candidats.length > 0)
    ? rap.candidats
    : (rap.candidatsAmbigus || []).map(c => ({
        salarie: c.salarie,
        score: c.score,
        raison: c.raison,
      }));

  // Résultats de la recherche manuelle
  const resultatsRecherche = baseSalaries.filter(s => {
    if (!termeRecherche.trim()) return false;
    const q = termeRecherche.toLowerCase().trim();
    return (
      s.nomComplet.toLowerCase().includes(q) ||
      (s.cni && s.cni.toLowerCase().includes(q)) ||
      (s.immatriculationCnss && s.immatriculationCnss.includes(q))
    );
  }).slice(0, 8);

  const handleConfirmer = () => {
    onConfirmerSalarie(rap.id, memoriserAlias);
    onClose();
  };

  const handleCreerNouveauSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomNouveau.trim()) return;
    onCreerNouveauSalarie(rap.id, nomNouveau.trim().toUpperCase(), cniNouveau.trim(), cnssNouveau.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Comparaison Face à Face & Arbitrage</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  statutP5 === 'IDENTIFIE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : statutP5 === 'AMBIGU'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : statutP5 === 'SORTI_A_ARBITRER'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {statutP5}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ligne {rap.lignePaieId} &bull; Score algorithmique : <strong>{rap.score}%</strong> ({rap.methode || rap.statut})
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

        {/* Corps modale : comparaison face-à-face (Section 6) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Alerte & Sélection immédiate si ambigu */}
          {rap.estAmbigu && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <h3 className="text-sm font-black text-amber-950 uppercase tracking-tight">
                    Arbitrage d'Ambiguïté : Deux profils concurrents détectés
                  </h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  {candidats.length} Candidats crédibles
                </span>
              </div>
              <p className="text-xs text-amber-800">
                Le rapprochement automatique est suspendu pour éviter une inversion de salariés. <strong>Cliquez sur « Choisir ce salarié »</strong> pour attribuer définitivement la ligne au bon profil :
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {candidats.map(c => {
                  const estActuel = salarie?.id === c.salarie.id;
                  return (
                    <div
                      key={c.salarie.id}
                      className={`p-3.5 bg-white border-2 rounded-xl space-y-2 transition-all ${
                        estActuel
                          ? 'border-amber-500 ring-2 ring-amber-300 shadow-xs'
                          : 'border-slate-200 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{c.salarie.nomComplet}</span>
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          {c.score}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-mono space-y-0.5">
                        <div>CNI : <strong className="text-slate-800">{c.salarie.cni || '-'}</strong></div>
                        <div>CNSS : <strong className="text-slate-800">{c.salarie.immatriculationCnss || '-'}</strong></div>
                        <div>
                          Situation :{' '}
                          <span className={`font-semibold ${c.salarie.situation === 'SORTI' ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {c.salarie.situation || 'ACTIF'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onChoisirCandidat(rap.id, c.salarie.id, memoriserAlias);
                          onClose();
                        }}
                        className="w-full mt-2 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Choisir ce salarié & Valider</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grille Face à Face */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* COLONNE GAUCHE : DONNÉES IMPORTÉES DE LA PAIE */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  COLONNE GAUCHE &bull; Données Importées
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold">
                  Paie du mois
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Nom original brut</span>
                  <span className="text-base font-black text-slate-900 font-sans tracking-tight">
                    {rap.nomDeclareFinal || rap.lignePaieId}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">Jours importés</span>
                    <span className={`text-base font-black ${
                      rap.validationJours.joursImportes > 26 || rap.validationJours.joursImportes < 0
                        ? 'text-rose-600'
                        : 'text-slate-900'
                    }`}>
                      {rap.validationJours.joursImportes} j
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">Jours déclarés</span>
                    <span className="text-base font-black text-emerald-700">
                      {rap.validationJours.joursDeclares ?? rap.validationJours.joursImportes} j
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">Statut jours</span>
                    <span className={`text-[11px] font-bold block mt-1 ${
                      rap.validationJours.modifieManuellement ? 'text-amber-700' : 'text-slate-600'
                    }`}>
                      {rap.validationJours.modifieManuellement ? 'Corrigé' : 'Original'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">CNI importée</span>
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {rap.cniDeclareeFinale || '-'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">CNSS importée</span>
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {rap.cnssDeclareeFinale || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLONNE DROITE : DONNÉES RÉFÉRENTIELLES (BASE CNSS) */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  COLONNE DROITE &bull; Référentiel CNSS
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-bold border border-emerald-300">
                  Base officielle
                </span>
              </div>

              {salarie ? (
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-emerald-700 block uppercase font-bold">Nom officiel en base</span>
                    <span className="text-base font-black text-emerald-950 font-sans tracking-tight">
                      {salarie.nomComplet}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-slate-500 block font-semibold">N° CNSS officiel</span>
                      <span className="font-mono text-xs font-black text-emerald-800">
                        {salarie.immatriculationCnss || 'Non immatriculé'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-slate-500 block font-semibold">CNI officielle</span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {salarie.cni || 'Non renseignée'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-slate-500 block font-semibold">Situation actuelle</span>
                      <span className={`text-[11px] font-bold block mt-0.5 ${
                        salarie.situation === 'SORTI'
                          ? 'text-rose-600'
                          : salarie.situation === 'ACCIDENT_TRAVAIL'
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}>
                        {salarie.situation || 'ACTIF'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-slate-500 block font-semibold">Identifiant permanent</span>
                      <span className="font-mono text-[10px] text-slate-600 block truncate">
                        {salarie.id}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <UserPlus className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Aucun salarié référentiel associé</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Utilisez les options ci-dessous pour rechercher ou créer une fiche.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SÉLECTEUR DE CANDIDATS ALTERNATIFS (si ambigu ou choix alternatif) */}
          {modeSelectionCandidat && candidats.length > 0 && (
            <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Candidats potentiels classés par similarité :
                </h4>
                <button
                  onClick={() => setModeSelectionCandidat(false)}
                  className="text-xs text-amber-800 hover:underline font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {candidats.map((c, i) => (
                  <div
                    key={c.salarie.id}
                    className="p-3 bg-white border border-amber-200 rounded-xl flex items-center justify-between gap-3 hover:border-amber-400 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{c.salarie.nomComplet}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        CNI: {c.salarie.cni || '-'} &bull; CNSS: {c.salarie.immatriculationCnss || '-'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-xs">
                        {c.score}%
                      </span>
                      <button
                        onClick={() => {
                          onChoisirCandidat(rap.id, c.salarie.id, memoriserAlias);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Choisir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RECHERCHE MANUELLE DANS TOUT LE RÉFÉRENTIEL */}
          {modeRechercheManuelle && (
            <div className="p-4 bg-slate-100 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recherche manuelle dans le référentiel ({baseSalaries.length} salariés)
                </h4>
                <button
                  onClick={() => setModeRechercheManuelle(false)}
                  className="text-xs text-slate-600 hover:underline font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tapez un nom, CNI ou N° CNSS..."
                  value={termeRecherche}
                  onChange={e => setTermeRecherche(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {resultatsRecherche.length > 0 && (
                <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200 max-h-48 overflow-y-auto text-xs">
                  {resultatsRecherche.map(s => (
                    <div key={s.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900">{s.nomComplet}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          CNI: {s.cni || '-'} &bull; CNSS: {s.immatriculationCnss || '-'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onRattacherManuellement(rap.id, s.id, memoriserAlias);
                          onClose();
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Rattacher
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CRÉATION D'UN NOUVEAU SALARIÉ (Section 7) */}
          {modeCreationNouveau && (
            <form onSubmit={handleCreerNouveauSubmit} className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                  <span>Créer un nouveau salarié dans le référentiel</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setModeCreationNouveau(false)}
                  className="text-xs text-purple-800 hover:underline font-semibold cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nom complet officiel</label>
                  <input
                    type="text"
                    required
                    value={nomNouveau || (rap.nomDeclareFinal || rap.lignePaieId)}
                    onChange={e => setNomNouveau(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-purple-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">CNI (optionnelle)</label>
                  <input
                    type="text"
                    value={cniNouveau}
                    onChange={e => setCniNouveau(e.target.value)}
                    placeholder="Ex: WA334455"
                    className="w-full text-xs px-3 py-2 bg-white border border-purple-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">N° CNSS (optionnel)</label>
                  <input
                    type="text"
                    value={cnssNouveau}
                    onChange={e => setCnssNouveau(e.target.value)}
                    placeholder="Ex: 101455267"
                    className="w-full text-xs px-3 py-2 bg-white border border-purple-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Enregistrer et générer ID sal_ref_...</span>
                </button>
              </div>
            </form>
          )}

          {/* Option mémoriser alias (Section 8) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
            <input
              type="checkbox"
              id="cb-alias-modal"
              checked={memoriserAlias}
              onChange={e => setMemoriserAlias(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="cb-alias-modal" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
              Mémoriser cette correspondance comme alias réutilisable les mois suivants (Niveau 3)
            </label>
          </div>
        </div>

        {/* Footer actions (Section 6) */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onLaisserNonIdentifie(rap.id);
                onClose();
              }}
              className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Laisser non identifié
            </button>

            <button
              type="button"
              onClick={() => {
                setModeRechercheManuelle(!modeRechercheManuelle);
                setModeSelectionCandidat(false);
                setModeCreationNouveau(false);
              }}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Rechercher</span>
            </button>

            {candidats.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setModeSelectionCandidat(!modeSelectionCandidat);
                  setModeRechercheManuelle(false);
                  setModeCreationNouveau(false);
                }}
                className="px-3 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors cursor-pointer"
              >
                Choisir un autre ({candidats.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setModeCreationNouveau(!modeCreationNouveau);
                setModeSelectionCandidat(false);
                setModeRechercheManuelle(false);
              }}
              className="px-3 py-2 text-xs font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Créer Salarié</span>
            </button>
          </div>

          {salarie && (
            <button
              type="button"
              onClick={handleConfirmer}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirmer ce Salarié</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
