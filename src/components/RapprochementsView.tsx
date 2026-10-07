import React, { useState, useMemo } from 'react';
import {
  Check,
  X,
  Search,
  Filter,
  AlertTriangle,
  HelpCircle,
  UserCheck,
  UserPlus,
  Users,
  Building,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  RotateCcw,
  Eye,
  CheckCircle2,
  Lock,
  Edit3,
} from 'lucide-react';
import {
  ResultatRapprochement,
  SalarieReferentiel,
  AnomalieLigne,
  StatutLigneP5,
  SituationEmploye,
} from '../types/cnss';
import { determinerStatutLigneP5 } from '../services/matchingEngine';
import { ComparaisonFaceAFaceModal } from './ComparaisonFaceAFaceModal';
import { ValidationGlobaleModal } from './ValidationGlobaleModal';
import { ModifierAnomalieModal, DonneesModificationAnomalie } from './ModifierAnomalieModal';
import {
  ModifierStatutSalarieModal,
  SalariePourModificationStatut,
} from './ModifierStatutSalarieModal';
import { masquerCni, masquerCnss } from '../utils/maskSensitive';

interface RapprochementsViewProps {
  rapprochements: ResultatRapprochement[];
  baseSalaries: SalarieReferentiel[];
  anomalies: AnomalieLigne[];
  onValiderCorrespondance: (
    idRapprochement: string,
    memoriserAlias: boolean
  ) => void;
  onRefuserCorrespondance: (idRapprochement: string) => void;
  onConfirmerNouveau: (idRapprochement: string) => void;
  onChoisirCandidatAmbigu: (
    idRapprochement: string,
    salarieId: string,
    memoriserAlias: boolean
  ) => void;
  onRattacherManuellement: (
    idRapprochement: string,
    salarieId: string,
    memoriserAlias: boolean
  ) => void;
  onArbitrerSortiRetravaillant: (
    idRapprochement: string,
    action: 'REACTIVATION_CONFIRMEE' | 'CONSERVE_SORTI'
  ) => void;
  onReinitialiserLigne: (idRapprochement: string) => void;
  onCreerNouveauSalarieEtRattacher?: (
    idRapprochement: string,
    nom: string,
    cni?: string,
    cnss?: string
  ) => void;
  onValiderRapprochementGlobal?: () => void;
  onSauvegarderModificationsAnomalie?: (
    idRapprochement: string,
    donnees: DonneesModificationAnomalie
  ) => void;
  onModifierStatutSalarie?: (
    salarieId: string,
    nouveauStatut: SituationEmploye,
    motif: string
  ) => Promise<void>;
}

export type FiltreP5Type =
  | 'TOUS'
  | 'A_VALIDER'
  | 'AMBIGUS'
  | 'NON_IDENTIFIES'
  | 'NOUVEAUX'
  | 'SORTIS'
  | 'ANOMALIES'
  | 'VALIDES';

export const RapprochementsView: React.FC<RapprochementsViewProps> = ({
  rapprochements,
  baseSalaries,
  anomalies,
  onValiderCorrespondance,
  onRefuserCorrespondance,
  onConfirmerNouveau,
  onChoisirCandidatAmbigu,
  onRattacherManuellement,
  onArbitrerSortiRetravaillant,
  onReinitialiserLigne,
  onCreerNouveauSalarieEtRattacher,
  onValiderRapprochementGlobal,
  onSauvegarderModificationsAnomalie,
  onModifierStatutSalarie,
}) => {
  // Filtres rapides (Section 14)
  const [filtreActif, setFiltreActif] = useState<FiltreP5Type>('TOUS');
  const [rechercheTexte, setRechercheTexte] = useState('');

  // Modale de modification manuelle du statut salarié (PROMPT 17)
  const [salariePourStatutModal, setSalariePourStatutModal] = useState<SalariePourModificationStatut | null>(null);

  // Modale Face à Face (Section 6)
  const [ligneEnComparaison, setLigneEnComparaison] = useState<ResultatRapprochement | null>(null);

  // Modale de Modification / Correction d'Anomalie
  const [lignePourModification, setLignePourModification] = useState<ResultatRapprochement | null>(null);
  const [anomaliePourModification, setAnomaliePourModification] = useState<AnomalieLigne | null>(null);

  // Modale de Validation Globale (Section 15)
  const [isValidationGlobaleOpen, setIsValidationGlobaleOpen] = useState(false);

  // État local des cases à cocher "Mémoriser alias"
  const [aliasCheckMap, setAliasCheckMap] = useState<Record<string, boolean>>({});

  const toggleAliasCheck = (id: string, defaultVal = true) => {
    setAliasCheckMap(prev => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : !defaultVal,
    }));
  };

  const isAliasChecked = (id: string, defaultVal = true) => {
    return aliasCheckMap[id] !== undefined ? aliasCheckMap[id] : defaultVal;
  };

  // Map des anomalies par ligne de paie
  const anomaliesParLigne = useMemo(() => {
    const map = new Map<string, AnomalieLigne[]>();
    anomalies.forEach(a => {
      if (a.lignePaieId) {
        const exist = map.get(a.lignePaieId) || [];
        exist.push(a);
        map.set(a.lignePaieId, exist);
      }
    });
    return map;
  }, [anomalies]);

  // =========================================================================
  // COMPTEURS DU TABLEAU DE BORD (Section 13)
  // TOTAL LIGNES, IDENTIFIÉS, À VALIDER, AMBIGUS, NON IDENTIFIÉS, NOUVEAUX, SORTIS À ARBITRER, ANOMALIES BLOQUANTES
  // =========================================================================
  const totalLignes = rapprochements.length;

  const countIdentifies = useMemo(
    () => rapprochements.filter(r => determinerStatutLigneP5(r) === 'IDENTIFIE').length,
    [rapprochements]
  );

  const countAValider = useMemo(
    () => rapprochements.filter(r => determinerStatutLigneP5(r) === 'A_VALIDER').length,
    [rapprochements]
  );

  const countAmbigus = useMemo(
    () => rapprochements.filter(r => determinerStatutLigneP5(r) === 'AMBIGU').length,
    [rapprochements]
  );

  const countNonIdentifies = useMemo(
    () => rapprochements.filter(r => determinerStatutLigneP5(r) === 'NON_IDENTIFIE').length,
    [rapprochements]
  );

  const countNouveaux = useMemo(
    () => rapprochements.filter(r => determinerStatutLigneP5(r) === 'NOUVEAU_CONFIRME').length,
    [rapprochements]
  );

  const countSortisAArbitrer = useMemo(
    () => rapprochements.filter(r => determinerStatutLigneP5(r) === 'SORTI_A_ARBITRER').length,
    [rapprochements]
  );

  const countAnomaliesBloquantes = useMemo(
    () => anomalies.filter(a => a.gravite === 'BLOQUANTE' && !a.estResolue).length,
    [anomalies]
  );

  // Progression globale
  const lignesTraitees = countIdentifies + countNouveaux;
  const pourcentageProgression = totalLignes > 0 ? Math.round((lignesTraitees / totalLignes) * 100) : 0;

  // Filtrage des lignes (Section 14)
  const lignesFiltrees = useMemo(() => {
    return rapprochements.filter(r => {
      const statutP5 = determinerStatutLigneP5(r);
      const anos = anomaliesParLigne.get(r.lignePaieId) || [];
      const hasBloquante = anos.some(a => a.gravite === 'BLOQUANTE' && !a.estResolue);

      // Filtre catégorie
      if (filtreActif === 'A_VALIDER' && statutP5 !== 'A_VALIDER') return false;
      if (filtreActif === 'AMBIGUS' && statutP5 !== 'AMBIGU') return false;
      if (filtreActif === 'NON_IDENTIFIES' && statutP5 !== 'NON_IDENTIFIE') return false;
      if (filtreActif === 'NOUVEAUX' && statutP5 !== 'NOUVEAU_CONFIRME') return false;
      if (filtreActif === 'SORTIS' && statutP5 !== 'SORTI_A_ARBITRER') return false;
      if (filtreActif === 'VALIDES' && statutP5 !== 'IDENTIFIE') return false;
      if (filtreActif === 'ANOMALIES' && !hasBloquante && statutP5 !== 'ANOMALIE_BLOQUANTE') return false;

      // Filtre recherche textuelle : Nom, CNI, CNSS (Section 14)
      if (rechercheTexte.trim()) {
        const q = rechercheTexte.toLowerCase().trim();
        const nomImp = (r.nomDeclareFinal || r.lignePaieId || '').toLowerCase();
        const nomSugg = (r.salariePropose?.nomComplet || '').toLowerCase();
        const cni = (r.cniDeclareeFinale || r.salariePropose?.cni || '').toLowerCase();
        const cnss = (r.cnssDeclareeFinale || r.salariePropose?.immatriculationCnss || '').toLowerCase();
        const methode = (r.methode || r.statut || '').toLowerCase();

        return nomImp.includes(q) || nomSugg.includes(q) || cni.includes(q) || cnss.includes(q) || methode.includes(q);
      }

      return true;
    });
  }, [rapprochements, filtreActif, rechercheTexte, anomaliesParLigne]);

  return (
    <div className="space-y-5">
      {/* 1. TABLEAU DE BORD DU RAPPROCHEMENT (Section 13) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Tableau de Bord du Rapprochement</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Hiérarchie P1 &rarr; P6 &bull; Arbitrage Face à Face
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Traçabilité stricte : chaque ligne dispose d'une situation univoque avant validation globale de déclaration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Bouton de Validation Globale (Section 15) */}
            <button
              onClick={() => setIsValidationGlobaleOpen(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer ${
                countAnomaliesBloquantes === 0 && countAmbigus === 0 && countNonIdentifies === 0 && countSortisAArbitrer === 0 && countAValider === 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Valider le Rapprochement</span>
            </button>
          </div>
        </div>

        {/* COMPTEURS DYNAMIQUES DU TABLEAU DE BORD (Section 13) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-2">
          {/* Total Lignes */}
          <button
            onClick={() => setFiltreActif('TOUS')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              filtreActif === 'TOUS' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className={`text-[10px] uppercase font-bold ${filtreActif === 'TOUS' ? 'text-slate-300' : 'text-slate-500'}`}>Total Lignes</div>
            <div className="text-xl font-black mt-0.5">{totalLignes}</div>
          </button>

          {/* Identifiés */}
          <button
            onClick={() => setFiltreActif('VALIDES')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              filtreActif === 'VALIDES' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-emerald-50/60 hover:bg-emerald-100/60 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className={`text-[10px] uppercase font-bold flex items-center gap-1 ${filtreActif === 'VALIDES' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Identifiés
            </div>
            <div className="text-xl font-black mt-0.5">{countIdentifies}</div>
          </button>

          {/* À Valider */}
          <button
            onClick={() => setFiltreActif('A_VALIDER')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              filtreActif === 'A_VALIDER' ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-amber-50/60 hover:bg-amber-100/60 border-amber-200 text-amber-950'
            }`}
          >
            <div className={`text-[10px] uppercase font-bold flex items-center gap-1 ${filtreActif === 'A_VALIDER' ? 'text-amber-100' : 'text-amber-700'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              À Valider
            </div>
            <div className="text-xl font-black mt-0.5">{countAValider}</div>
          </button>

          {/* Ambigus */}
          <button
            onClick={() => setFiltreActif('AMBIGUS')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              filtreActif === 'AMBIGUS' ? 'bg-amber-700 text-white border-amber-700 shadow-xs' : 'bg-amber-100/60 hover:bg-amber-200/60 border-amber-300 text-amber-950'
            }`}
          >
            <div className={`text-[10px] uppercase font-bold flex items-center gap-1 ${filtreActif === 'AMBIGUS' ? 'text-amber-200' : 'text-amber-800'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              Ambigus
            </div>
            <div className="text-xl font-black mt-0.5">{countAmbigus}</div>
          </button>

          {/* Non Identifiés */}
          <button
            onClick={() => setFiltreActif('NON_IDENTIFIES')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              filtreActif === 'NON_IDENTIFIES' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-rose-50/60 hover:bg-rose-100/60 border-rose-200 text-rose-950'
            }`}
          >
            <div className={`text-[10px] uppercase font-bold flex items-center gap-1 ${filtreActif === 'NON_IDENTIFIES' ? 'text-rose-100' : 'text-rose-700'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Non Identifiés
            </div>
            <div className="text-xl font-black mt-0.5">{countNonIdentifies}</div>
          </button>

          {/* Nouveaux */}
          <button
            onClick={() => setFiltreActif('NOUVEAUX')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              filtreActif === 'NOUVEAUX' ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-blue-50/60 hover:bg-blue-100/60 border-blue-200 text-blue-950'
            }`}
          >
            <div className={`text-[10px] uppercase font-bold flex items-center gap-1 ${filtreActif === 'NOUVEAUX' ? 'text-blue-100' : 'text-blue-700'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Nouveaux
            </div>
            <div className="text-xl font-black mt-0.5">{countNouveaux}</div>
          </button>

          {/* Sortis à arbitrer */}
          <button
            onClick={() => setFiltreActif('SORTIS')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              filtreActif === 'SORTIS' ? 'bg-purple-600 text-white border-purple-600 shadow-xs' : 'bg-purple-50/60 hover:bg-purple-100/60 border-purple-200 text-purple-950'
            }`}
          >
            <div className={`text-[10px] uppercase font-bold flex items-center gap-1 ${filtreActif === 'SORTIS' ? 'text-purple-100' : 'text-purple-700'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Sortis Arbitrer
            </div>
            <div className="text-xl font-black mt-0.5">{countSortisAArbitrer}</div>
          </button>

          {/* Anomalies bloquantes */}
          <button
            onClick={() => setFiltreActif('ANOMALIES')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              filtreActif === 'ANOMALIES' ? 'bg-rose-700 text-white border-rose-700 shadow-xs' : 'bg-rose-100/60 hover:bg-rose-200/60 border-rose-300 text-rose-950'
            }`}
          >
            <div className={`text-[10px] uppercase font-bold flex items-center gap-1 ${filtreActif === 'ANOMALIES' ? 'text-rose-200' : 'text-rose-800'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              Anomalies
            </div>
            <div className="text-xl font-black mt-0.5">{countAnomaliesBloquantes}</div>
          </button>
        </div>
      </div>

      {/* 2. BARRE D'OUTILS ET RECHERCHE (Section 14) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Recherche par nom, CNI ou CNSS */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Rechercher par nom, CNI ou N° CNSS..."
            value={rechercheTexte}
            onChange={e => setRechercheTexte(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Boutons de filtres rapides */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filtres :
          </span>

          {(['TOUS', 'A_VALIDER', 'AMBIGUS', 'NON_IDENTIFIES', 'NOUVEAUX', 'SORTIS', 'ANOMALIES', 'VALIDES'] as FiltreP5Type[]).map(f => (
            <button
              key={f}
              onClick={() => setFiltreActif(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filtreActif === f
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'TOUS' ? 'Tous' : f === 'A_VALIDER' ? 'À valider' : f === 'AMBIGUS' ? 'Ambigus' : f === 'NON_IDENTIFIES' ? 'Non identifiés' : f === 'NOUVEAUX' ? 'Nouveaux' : f === 'SORTIS' ? 'Sortis' : f === 'ANOMALIES' ? 'Anomalies' : 'Validés'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. TABLEAU DE RAPPROCHEMENT (Section 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Nom Paie Importé</th>
                <th className="py-3 px-3 text-center">Jours</th>
                <th className="py-3 px-4">Salarié Proposé (Base)</th>
                <th className="py-3 px-3">CNI</th>
                <th className="py-3 px-3">N° CNSS</th>
                <th className="py-3 px-3 text-center">Score</th>
                <th className="py-3 px-3">Méthode</th>
                <th className="py-3 px-3 text-center">Statut</th>
                <th className="py-3 px-3 text-center">Statut Salarié</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lignesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    Aucune ligne de paie ne correspond aux filtres appliqués.
                  </td>
                </tr>
              ) : (
                lignesFiltrees.map(rap => {
                  const statutP5 = determinerStatutLigneP5(rap);
                  const salarie = rap.salariePropose;
                  const anos = anomaliesParLigne.get(rap.lignePaieId) || [];
                  const aBloquante = anos.some(a => a.gravite === 'BLOQUANTE' && !a.estResolue);

                  return (
                    <tr
                      key={rap.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        rap.estAmbigu
                          ? 'bg-amber-50/30'
                          : aBloquante
                          ? 'bg-rose-50/20'
                          : ''
                      }`}
                    >
                      {/* Nom Paie */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{rap.nomDeclareFinal || rap.lignePaieId}</span>
                          {aBloquante && (
                            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" title="Anomalie bloquante" />
                          )}
                        </div>
                      </td>

                      {/* Jours */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          rap.validationJours.joursImportes > 26 || rap.validationJours.joursImportes < 0
                            ? 'bg-rose-100 text-rose-800 font-black'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {rap.validationJours.joursDeclares ?? rap.validationJours.joursImportes} j
                        </span>
                      </td>

                      {/* Salarié Proposé */}
                      <td className="py-3 px-4">
                        {salarie ? (
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{salarie.nomComplet}</span>
                            {salarie.situation === 'SORTI' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                                SORTI
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Aucun profil fiable</span>
                        )}

                        {/* Raccourci de sélection pour cas ambigu */}
                        {(rap.estAmbigu || statutP5 === 'AMBIGU') && (
                          <div className="mt-1.5 p-1.5 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
                            <span className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Ambigus (Sélection rapide) :</span>
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {((rap.candidats && rap.candidats.length > 0)
                                ? rap.candidats
                                : (rap.candidatsAmbigus || []).map(c => ({ salarie: c.salarie, score: c.score }))
                              ).slice(0, 2).map(c => (
                                <button
                                  key={c.salarie.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onChoisirCandidatAmbigu(rap.id, c.salarie.id, isAliasChecked(rap.id));
                                  }}
                                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                                  title={`Attribuer à ${c.salarie.nomComplet} (${c.score}%)`}
                                >
                                  <span>✓</span>
                                  <span className="truncate max-w-[120px]">{c.salarie.nomComplet}</span>
                                  <span className="opacity-80">({c.score}%)</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* CNI (Masquée selon RGPD / CNDP) */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {masquerCni(rap.cniDeclareeFinale || salarie?.cni)}
                      </td>

                      {/* N° CNSS (Masqué selon RGPD / CNDP) */}
                      <td className="py-3 px-3 font-mono text-[11px] font-bold text-slate-800">
                        {masquerCnss(rap.cnssDeclareeFinale || salarie?.immatriculationCnss)}
                      </td>

                      {/* Score */}
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-full ${
                          rap.score === 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : rap.score >= 90
                            ? 'bg-blue-100 text-blue-800'
                            : rap.score >= 80
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rap.score}%
                        </span>
                      </td>

                      {/* Méthode */}
                      <td className="py-3 px-3 text-[11px] text-slate-600">
                        <span className="font-medium">
                          {rap.methode || rap.statut}
                        </span>
                      </td>

                      {/* Statut P5 */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          statutP5 === 'IDENTIFIE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : statutP5 === 'AMBIGU'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : statutP5 === 'SORTI_A_ARBITRER'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : statutP5 === 'NON_IDENTIFIE'
                            ? 'bg-rose-100 text-rose-900 border border-rose-200'
                            : statutP5 === 'NOUVEAU_CONFIRME'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {statutP5}
                        </span>
                      </td>

                      {/* Statut Salarié Référentiel avec action Modifier (PROMPT 17) */}
                      <td className="py-3 px-3 text-center">
                        {(() => {
                          const sal = salarie || baseSalaries.find(s => s.id === rap.salarieBaseId);
                          const sit = sal?.situation || 'ACTIF';
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSalariePourStatutModal({
                                      id: sal?.id || rap.salarieBaseId || rap.id,
                                      nomComplet: sal?.nomComplet || rap.nomDeclareFinal || rap.lignePaieId,
                                      cni: sal?.cni || rap.cniDeclareeFinale,
                                      immatriculationCnss: sal?.immatriculationCnss || rap.cnssDeclareeFinale,
                                      situation: sit,
                                      joursMois: rap.validationJours?.joursDeclares ?? rap.validationJours?.joursImportes,
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
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Bouton de comparaison face à face (Section 6) */}
                          <button
                            onClick={() => setLigneEnComparaison(rap)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Ouvrir la comparaison face à face et l'arbitrage"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Voir</span>
                          </button>

                          {/* Action rapide selon statut */}
                          {anos.length > 0 && (
                            <button
                              onClick={() => {
                                setLignePourModification(rap);
                                setAnomaliePourModification(anos[0] || null);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title={`${anos.length} anomalie(s) sur cette ligne. Cliquez pour modifier/corriger.`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Modifier</span>
                            </button>
                          )}

                          {statutP5 === 'A_VALIDER' && salarie && (
                            <button
                              onClick={() => onValiderCorrespondance(rap.id, isAliasChecked(rap.id))}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Valider</span>
                            </button>
                          )}

                          {statutP5 === 'AMBIGU' && (
                            <button
                              onClick={() => setLigneEnComparaison(rap)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title="Arbitrer l'ambiguïté face à face"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Arbitrer</span>
                            </button>
                          )}

                          {statutP5 === 'SORTI_A_ARBITRER' && (
                            <button
                              onClick={() => setLigneEnComparaison(rap)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              Arbitrer
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

      {/* MODALE DE MODIFICATION / CORRECTION D'ANOMALIE */}
      <ModifierAnomalieModal
        isOpen={Boolean(lignePourModification)}
        onClose={() => {
          setLignePourModification(null);
          setAnomaliePourModification(null);
        }}
        rapprochement={lignePourModification}
        anomalie={anomaliePourModification}
        baseSalaries={baseSalaries}
        onSauvegarderModifications={(id, donnees) => {
          if (onSauvegarderModificationsAnomalie) {
            onSauvegarderModificationsAnomalie(id, donnees);
          }
        }}
      />

      {/* MODALE DE COMPARAISON FACE À FACE (Section 6) */}
      <ComparaisonFaceAFaceModal
        isOpen={Boolean(ligneEnComparaison)}
        onClose={() => setLigneEnComparaison(null)}
        rapprochement={ligneEnComparaison}
        baseSalaries={baseSalaries}
        anomaliesLigne={ligneEnComparaison ? anomaliesParLigne.get(ligneEnComparaison.lignePaieId) || [] : []}
        onConfirmerSalarie={(id, alias) => onValiderCorrespondance(id, alias)}
        onChoisirCandidat={(id, salId, alias) => onChoisirCandidatAmbigu(id, salId, alias)}
        onRattacherManuellement={(id, salId, alias) => onRattacherManuellement(id, salId, alias)}
        onCreerNouveauSalarie={(id, nom, cni, cnss) => {
          if (onCreerNouveauSalarieEtRattacher) {
            onCreerNouveauSalarieEtRattacher(id, nom, cni, cnss);
          } else {
            onConfirmerNouveau(id);
          }
        }}
        onLaisserNonIdentifie={(id) => onRefuserCorrespondance(id)}
      />

      {/* MODALE DE VALIDATION GLOBALE (Section 15) */}
      <ValidationGlobaleModal
        isOpen={isValidationGlobaleOpen}
        onClose={() => setIsValidationGlobaleOpen(false)}
        rapprochements={rapprochements}
        anomalies={anomalies}
        onFiltrerCategorie={(cat) => {
          if (cat === 'AMBIGU') setFiltreActif('AMBIGUS');
          else if (cat === 'NON_IDENTIFIE') setFiltreActif('NON_IDENTIFIES');
          else if (cat === 'SORTIS') setFiltreActif('SORTIS');
          else if (cat === 'ANOMALIES') setFiltreActif('ANOMALIES');
        }}
        onConfirmerValidationGlobale={() => {
          if (onValiderRapprochementGlobal) {
            onValiderRapprochementGlobal();
          }
        }}
      />

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
