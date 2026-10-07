import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  ShieldCheck,
  Edit,
  X,
  Plus,
  Users,
} from 'lucide-react';
import {
  ResultatRapprochement,
  SalarieReferentiel,
  SituationEmploye,
} from '../types/cnss';
import { persistenceService } from '../services/persistenceService';
import {
  ModifierStatutSalarieModal,
  SalariePourModificationStatut,
} from './ModifierStatutSalarieModal';

interface NouveauxViewProps {
  rapprochements: ResultatRapprochement[];
  baseSalaries: SalarieReferentiel[];
  onAjouterNouveauALaBase: (
    idRapprochement: string,
    donnees: { nomComplet: string; cni?: string; cnss?: string }
  ) => void;
  onCompleterIdentifiantNouveau: (
    idRapprochement: string,
    cni?: string,
    cnss?: string
  ) => void;
  onNaviguerVersRapprochement: () => void;
  onModifierStatutSalarie?: (
    salarieId: string,
    nouveauStatut: SituationEmploye,
    motif: string
  ) => Promise<void>;
}

export const NouveauxView: React.FC<NouveauxViewProps> = ({
  rapprochements,
  baseSalaries,
  onAjouterNouveauALaBase,
  onCompleterIdentifiantNouveau,
  onNaviguerVersRapprochement,
  onModifierStatutSalarie,
}) => {
  const [recherche, setRecherche] = useState('');
  const [salariePourStatutModal, setSalariePourStatutModal] = useState<SalariePourModificationStatut | null>(null);
  const [modalEdition, setModalEdition] = useState<{
    rap: ResultatRapprochement;
    nom: string;
    cni: string;
    cnss: string;
  } | null>(null);

  // Filtrer les salariés qui sont soit confirmés nouveaux, soit non identifiés (< 80%) en attente
  const lignesNouveaux = rapprochements.filter(
    r => r.estMarqueNouveau || r.statut === 'NON_IDENTIFIE'
  );

  const lignesFiltrees = lignesNouveaux.filter(r => {
    if (!recherche.trim()) return true;
    const q = recherche.toLowerCase();
    const nom = (r.nomDeclareFinal || r.lignePaieId).toLowerCase();
    const cni = (r.cniDeclareeFinale || '').toLowerCase();
    const cnss = r.cnssDeclareeFinale || '';
    return nom.includes(q) || cni.includes(q) || cnss.includes(q);
  });

  const totalConfirmes = lignesNouveaux.filter(r => r.estMarqueNouveau).length;
  const totalEnAttente = lignesNouveaux.filter(r => !r.estMarqueNouveau && r.statut === 'NON_IDENTIFIE').length;

  const ouvrirEdition = (rap: ResultatRapprochement) => {
    setModalEdition({
      rap,
      nom: rap.nomDeclareFinal || rap.lignePaieId,
      cni: rap.cniDeclareeFinale || '',
      cnss: rap.cnssDeclareeFinale || '',
    });
  };

  const enregistrerNouveau = (rap: ResultatRapprochement, nom: string, cni: string, cnss: string) => {
    onAjouterNouveauALaBase(rap.id, {
      nomComplet: nom,
      cni: cni || undefined,
      cnss: cnss || undefined,
    });
    setModalEdition(null);
  };

  return (
    <div className="space-y-5">
      {/* 1. EN-TÊTE & COMPTEURS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <span>Gestion des Nouveaux Entrants</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Règle : Un salarié ne devient NOUVEAU que lorsque le gestionnaire le confirme explicitement. Une recherche anti-doublon est exécutée avant création de l'ID permanent.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-900 border border-blue-200">
              {totalConfirmes} Nouveaux Confirmés
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-200">
              {totalEnAttente} À Arbitrer
            </span>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher par nom, CNI ou numéro..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />
        </div>
      </div>

      {/* 2. TABLEAU DES NOUVEAUX (Section 16) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Nom du Salarié</th>
                <th className="py-3 px-3 text-center">Jours</th>
                <th className="py-3 px-3 font-mono">CNI</th>
                <th className="py-3 px-3 font-mono">N° CNSS</th>
                <th className="py-3 px-3 text-center">Score</th>
                <th className="py-3 px-3">Statut Workflow</th>
                <th className="py-3 px-3 text-center">Statut Salarié</th>
                <th className="py-3 px-3">Date Première Apparition</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lignesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Aucun nouvel entrant détecté selon les critères.
                  </td>
                </tr>
              ) : (
                lignesFiltrees.map((rap) => {
                  const estConfirme = rap.estMarqueNouveau;
                  const cni = rap.cniDeclareeFinale || 'CNI inconnue';
                  const cnss = rap.cnssDeclareeFinale || 'CNSS inconnue';
                  const dateApp = rap.dateDecision ? new Date(rap.dateDecision).toLocaleDateString('fr-FR') : 'Septembre 2026';

                  return (
                    <tr
                      key={rap.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        estConfirme ? 'bg-blue-50/20' : 'bg-amber-50/15'
                      }`}
                    >
                      {/* Nom */}
                      <td className="py-3.5 px-3.5 font-bold text-slate-900">
                        {rap.nomDeclareFinal || rap.lignePaieId}
                      </td>

                      {/* Jours */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                        {rap.validationJours.joursDeclares ?? rap.validationJours.joursImportes} j
                      </td>

                      {/* CNI */}
                      <td className="py-3.5 px-3 font-mono">
                        {rap.cniDeclareeFinale ? (
                          <span className="font-bold text-slate-900">{rap.cniDeclareeFinale}</span>
                        ) : (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold">
                            CNI inconnue
                          </span>
                        )}
                      </td>

                      {/* CNSS */}
                      <td className="py-3.5 px-3 font-mono">
                        {rap.cnssDeclareeFinale ? (
                          <span className="font-bold text-slate-900">{rap.cnssDeclareeFinale}</span>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
                            À immatriculer
                          </span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-600">
                        {rap.score > 0 ? `${rap.score}%` : '--'}
                      </td>

                      {/* Statut */}
                      <td className="py-3.5 px-3">
                        {estConfirme ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-900">
                            🟢 NOUVEAU CONFIRMÉ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900">
                            🟠 NON IDENTIFIÉ (À VÉRIFIER)
                          </span>
                        )}
                      </td>

                      {/* Statut Salarié avec action Modifier (PROMPT 17) */}
                      <td className="py-3.5 px-3 text-center">
                        {(() => {
                          const sal = rap.salariePropose || baseSalaries.find(s => s.id === rap.salarieBaseId);
                          const sit = sal?.situation || (estConfirme ? 'ACTIF' : 'A_VERIFIER');
                          return (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                sit === 'ACTIF'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : sit === 'SORTI'
                                  ? 'bg-slate-200 text-slate-800 border-slate-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}>
                                {sit}
                              </span>
                              {onModifierStatutSalarie && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSalariePourStatutModal({
                                      id: sal?.id || rap.salarieBaseId || rap.id,
                                      nomComplet: sal?.nomComplet || rap.nomDeclareFinal || rap.lignePaieId,
                                      cni: sal?.cni || rap.cniDeclareeFinale,
                                      immatriculationCnss: sal?.immatriculationCnss || rap.cnssDeclareeFinale,
                                      situation: sit,
                                      joursMois: rap.validationJours.joursDeclares ?? rap.validationJours.joursImportes,
                                    });
                                  }}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                                  title="Modifier manuellement le statut de ce salarié"
                                >
                                  Modifier
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Date première apparition */}
                      <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                        {dateApp}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!estConfirme ? (
                            <button
                              onClick={() => ouvrirEdition(rap)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold cursor-pointer shadow-2xs"
                            >
                              Marquer Nouveau
                            </button>
                          ) : (
                            <button
                              onClick={() => ouvrirEdition(rap)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold cursor-pointer"
                            >
                              Compléter / Modifier
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

      {/* 3. MODALE D'ÉDITION ET CRÉATION DE NOUVEAU SALARIÉ (Section 10) */}
      {modalEdition && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {modalEdition.rap.estMarqueNouveau ? 'Modifier le Salarié Entrant' : 'Confirmer comme Nouveau Salarié'}
                </h3>
              </div>
              <button
                onClick={() => setModalEdition(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom Complet Officiel :</label>
                <input
                  type="text"
                  value={modalEdition.nom}
                  onChange={(e) => setModalEdition({ ...modalEdition, nom: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-bold uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">CNI (Carte Nationale d'Identité) :</label>
                <input
                  type="text"
                  value={modalEdition.cni}
                  onChange={(e) => setModalEdition({ ...modalEdition, cni: e.target.value.toUpperCase() })}
                  placeholder="Ex: WA345678"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">N° Immatriculation CNSS (si déjà attribué) :</label>
                <input
                  type="text"
                  value={modalEdition.cnss}
                  onChange={(e) => setModalEdition({ ...modalEdition, cnss: e.target.value })}
                  placeholder="9 chiffres CNSS ou laisser vide"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              {/* Règle anti-doublon (Section 10) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px] block">Contrôle Anti-Doublon :</span>
                <span className="text-slate-500 text-[11px] mt-0.5 block">
                  Le système vérifie qu'aucun salarié avec le même nom normalisé ou la même CNI n'existe déjà dans la base permanente.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setModalEdition(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => enregistrerNouveau(modalEdition.rap, modalEdition.nom, modalEdition.cni, modalEdition.cnss)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                Ajouter à la Base (ID Permanent)
              </button>
            </div>
          </div>
        </div>
      )}

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
