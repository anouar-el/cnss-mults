import React, { useState } from 'react';
import {
  UserMinus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Info,
  ShieldAlert,
  Building,
  Edit3,
} from 'lucide-react';
import {
  SortieItem,
  ResultatRapprochement,
  SalarieReferentiel,
  SituationEmploye,
} from '../types/cnss';
import {
  ModifierStatutSalarieModal,
  SalariePourModificationStatut,
} from './ModifierStatutSalarieModal';

interface SortiesViewProps {
  sorties: SortieItem[];
  rapprochements: ResultatRapprochement[];
  onConfirmerSortie: (salarieId: string, nomSalarie: string) => void;
  onMaintenirActif: (salarieId: string, nomSalarie: string) => void;
  onRechercherCorrespondanceAlternative: (nomSalarie: string) => void;
  onArbitrerReactivationSorti: (
    idRapprochement: string,
    action: 'REACTIVATION_CONFIRMEE' | 'CONSERVE_SORTI'
  ) => void;
  onModifierStatutSalarie?: (
    salarieId: string,
    nouveauStatut: SituationEmploye,
    motif: string
  ) => Promise<void>;
}

export const SortiesView: React.FC<SortiesViewProps> = ({
  sorties,
  rapprochements,
  onConfirmerSortie,
  onMaintenirActif,
  onRechercherCorrespondanceAlternative,
  onArbitrerReactivationSorti,
  onModifierStatutSalarie,
}) => {
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<'TOUTES' | 'A_CONFIRMER' | 'CONFIRMEES' | 'MAINTENUES'>('TOUTES');
  const [salariePourStatutModal, setSalariePourStatutModal] = useState<SalariePourModificationStatut | null>(null);

  // Identifier les cas de salariés notés 'SORTI' en base mais ayant des jours en paie (Section 13 - Marouane Moukrim)
  const sortisRetravaillant = rapprochements.filter(
    r => r.salariePropose?.situation === 'SORTI' && (r.validationJours.joursDeclares ?? r.validationJours.joursImportes) > 0
  );

  const sortiesFiltrees = sorties.filter(s => {
    if (filtreStatut === 'A_CONFIRMER' && s.statutSortie !== 'A_CONFIRMER') return false;
    if (filtreStatut === 'CONFIRMEES' && s.statutSortie !== 'SORTIE_CONFIRMEE') return false;
    if (filtreStatut === 'MAINTENUES' && s.statutSortie !== 'MAINTENU_ACTIF') return false;

    if (recherche.trim()) {
      const q = recherche.toLowerCase();
      return (
        s.salarie.nomComplet.toLowerCase().includes(q) ||
        (s.salarie.cni && s.salarie.cni.toLowerCase().includes(q)) ||
        (s.salarie.immatriculationCnss && s.salarie.immatriculationCnss.includes(q))
      );
    }
    return true;
  });

  const totalAConfirmer = sorties.filter(s => s.statutSortie === 'A_CONFIRMER').length;
  const totalConfirmees = sorties.filter(s => s.statutSortie === 'SORTIE_CONFIRMEE').length;
  const totalMaintenus = sorties.filter(s => s.statutSortie === 'MAINTENU_ACTIF').length;

  return (
    <div className="space-y-5">
      {/* 1. EN-TÊTE & COMPTEURS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-rose-600" />
              <span>Gestion des Sorties & Inactifs</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Règle : Une absence de paie ne constitue jamais une sortie automatique. Le gestionnaire arbitre entre sortie définitive et maintien actif temporaire.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFiltreStatut('TOUTES')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filtreStatut === 'TOUTES' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toutes ({sorties.length})
            </button>
            <button
              onClick={() => setFiltreStatut('A_CONFIRMER')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filtreStatut === 'A_CONFIRMER' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              🔴 À Confirmer ({totalAConfirmer})
            </button>
            <button
              onClick={() => setFiltreStatut('CONFIRMEES')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filtreStatut === 'CONFIRMEES' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Confirmées ({totalConfirmees})
            </button>
            <button
              onClick={() => setFiltreStatut('MAINTENUES')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filtreStatut === 'MAINTENUES' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Maintenus Actifs ({totalMaintenus})
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher un salarié absent ou à 0 jour par nom, CNI ou numéro..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />
        </div>
      </div>

      {/* 2. ALERTE SPÉCIALE : SALARIÉS SORTIS QUI RETRAVAILLENT (Section 13 & 15) */}
      {sortisRetravaillant.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>⚠ Cas Particulier : Salariés notés "SORTI" en base mais présents avec des jours de paie ({sortisRetravaillant.length})</span>
          </div>
          <p className="text-xs text-amber-900">
            Exemple réel : <strong>MAROUANE MOUKRIM</strong> est noté « so » (Sorti) dans la base CNSS mais dispose de 18 jours de paie en Septembre.
          </p>

          <div className="divide-y divide-amber-200/60 bg-white/70 rounded-xl p-3 border border-amber-200">
            {sortisRetravaillant.map(rap => (
              <div key={rap.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <strong className="text-slate-900">{rap.salariePropose?.nomComplet}</strong>
                  <span className="text-slate-500 ml-2">
                    (CNI: {rap.salariePropose?.cni || '-'} &bull; CNSS: {rap.salariePropose?.immatriculationCnss || '-'})
                  </span>
                  <span className="ml-2 font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    {rap.validationJours.joursImportes} jours importés
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600">Décision :</span>
                  {onModifierStatutSalarie && (
                    <button
                      type="button"
                      onClick={() => {
                        setSalariePourStatutModal({
                          id: rap.salariePropose?.id || rap.salarieBaseId || rap.id,
                          nomComplet: rap.salariePropose?.nomComplet || rap.nomDeclareFinal || '',
                          cni: rap.salariePropose?.cni || rap.cniDeclareeFinale,
                          immatriculationCnss: rap.salariePropose?.immatriculationCnss || rap.cnssDeclareeFinale,
                          situation: rap.salariePropose?.situation || 'SORTI',
                          joursMois: rap.validationJours.joursDeclares ?? rap.validationJours.joursImportes,
                        });
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                      title="Modifier manuellement le statut de ce salarié sorti"
                    >
                      <Edit3 className="w-3 h-3" />
                      Modifier Statut
                    </button>
                  )}
                  <button
                    onClick={() => onArbitrerReactivationSorti(rap.id, 'REACTIVATION_CONFIRMEE')}
                    className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-all ${
                      rap.decisionSorti === 'REACTIVATION_CONFIRMEE'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    Confirmer Réactivation
                  </button>
                  <button
                    onClick={() => onArbitrerReactivationSorti(rap.id, 'CONSERVE_SORTI')}
                    className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                      rap.decisionSorti === 'CONSERVE_SORTI'
                        ? 'bg-slate-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Conserver Sorti
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TABLEAU DES SORTIES (Section 17) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Nom Salarié</th>
                <th className="py-3 px-3 font-mono">CNI</th>
                <th className="py-3 px-3 font-mono">N° CNSS</th>
                <th className="py-3 px-3">Situation Précédente</th>
                <th className="py-3 px-3 text-center">Derniers Jours</th>
                <th className="py-3 px-3">Motif Constaté</th>
                <th className="py-3 px-3 text-center">Statut Salarié</th>
                <th className="py-3 px-3">Statut Sortie</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortiesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    Aucun salarié sorti à signaler selon vos critères.
                  </td>
                </tr>
              ) : (
                sortiesFiltrees.map((s) => {
                  const estAConfirmer = s.statutSortie === 'A_CONFIRMER';
                  const estConfirme = s.statutSortie === 'SORTIE_CONFIRMEE';
                  const estMaintenu = s.statutSortie === 'MAINTENU_ACTIF';

                  return (
                    <tr
                      key={s.salarieId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        estConfirme ? 'bg-slate-50/50 opacity-70' : estAConfirmer ? 'bg-rose-50/15' : ''
                      }`}
                    >
                      {/* Nom */}
                      <td className="py-3.5 px-3.5 font-bold text-slate-900">
                        {s.salarie.nomComplet}
                      </td>

                      {/* CNI */}
                      <td className="py-3.5 px-3 font-mono text-slate-700">
                        {s.salarie.cni || '-'}
                      </td>

                      {/* CNSS */}
                      <td className="py-3.5 px-3 font-mono text-slate-700">
                        {s.salarie.immatriculationCnss || '-'}
                      </td>

                      {/* Situation précédente */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.situationPrecedente === 'SORTI' || s.situationPrecedente === 'so'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {s.situationPrecedente}
                        </span>
                      </td>

                      {/* Derniers jours */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        {s.derniersJours !== undefined ? `${s.derniersJours} j` : <span className="text-slate-400">Absent</span>}
                      </td>

                      {/* Motif constaté */}
                      <td className="py-3.5 px-3 text-slate-600">
                        {s.motif}
                      </td>

                      {/* Statut Salarié avec action Modifier (PROMPT 17) */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                            (s.salarie.situation || 'SORTI') === 'ACTIF'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : (s.salarie.situation || 'SORTI') === 'SORTI'
                              ? 'bg-slate-200 text-slate-800 border-slate-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}>
                            {s.salarie.situation || 'SORTI'}
                          </span>
                          {onModifierStatutSalarie && (
                            <button
                              type="button"
                              onClick={() => {
                                setSalariePourStatutModal({
                                  id: s.salarie.id,
                                  nomComplet: s.salarie.nomComplet,
                                  cni: s.salarie.cni,
                                  immatriculationCnss: s.salarie.immatriculationCnss,
                                  situation: s.salarie.situation || 'SORTI',
                                  joursMois: s.derniersJours,
                                });
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                              title="Modifier manuellement le statut de ce salarié"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              Modifier
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Statut sortie */}
                      <td className="py-3.5 px-3">
                        {estAConfirmer ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                            🔴 SORTIE À CONFIRMER
                          </span>
                        ) : estConfirme ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-700">
                            SORTIE CONFIRMÉE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                            🟢 MAINTENU ACTIF
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {estAConfirmer ? (
                            <>
                              <button
                                onClick={() => onConfirmerSortie(s.salarieId, s.salarie.nomComplet)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer shadow-2xs"
                              >
                                Confirmer Sortie
                              </button>
                              <button
                                onClick={() => onMaintenirActif(s.salarieId, s.salarie.nomComplet)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold cursor-pointer"
                              >
                                Maintenir Actif
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => onConfirmerSortie(s.salarieId, s.salarie.nomComplet)}
                              className="text-[10px] text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                            >
                              Modifier l'arbitrage
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE DE MODIFICATION DU STATUT SALARIÉ (PROMPT 17) */}
      <ModifierStatutSalarieModal
        isOpen={Boolean(salariePourStatutModal)}
        onClose={() => setSalariePourStatutModal(null)}
        salarie={salariePourStatutModal}
        onConfirmer={async (id, statut, motif) => {
          if (onModifierStatutSalarie) {
            await onModifierStatutSalarie(id, statut, motif);
          }
        }}
      />
    </div>
  );
};
