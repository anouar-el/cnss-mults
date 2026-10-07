import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  Info,
  Edit3,
} from 'lucide-react';
import {
  LigneRegistreCnss,
  BilanRegistreMensuel,
  EvenementAudit,
  SituationEmploye,
} from '../types/cnss';
import { cnssRegisterService } from '../services/cnssRegisterService';
import { DetailLigneRegistreModal } from './DetailLigneRegistreModal';
import {
  ModifierStatutSalarieModal,
  SalariePourModificationStatut,
} from './ModifierStatutSalarieModal';

interface RegistreCnssViewProps {
  lignesRegistre: LigneRegistreCnss[];
  statutPeriode: string;
  moisActif: string;
  journalAudit: EvenementAudit[];
  onValiderLigne: (ligneId: string) => void;
  onCorrigerJours: (ligneId: string, nouveauxJours: number, motif: string) => void;
  onDemanderReouverture: (ligneId: string, motif: string) => void;
  onValiderToutLeRegistre: () => void;
  onNaviguerVersRapprochement: () => void;
  onModifierStatutSalarie?: (
    salarieId: string,
    nouveauStatut: SituationEmploye,
    motif: string
  ) => Promise<void>;
}

export type FiltreRegistreType =
  | 'TOUS'
  | 'PRETS'
  | 'A_COMPLETER'
  | 'A_CORRIGER'
  | 'BLOQUES'
  | 'VALIDES'
  | 'AVEC_ANOMALIE'
  | 'AVEC_CORRECTION'
  | 'CNSS_MANQUANT'
  | 'CNI_MANQUANTE';

export const RegistreCnssView: React.FC<RegistreCnssViewProps> = ({
  lignesRegistre,
  statutPeriode,
  moisActif,
  journalAudit,
  onValiderLigne,
  onCorrigerJours,
  onDemanderReouverture,
  onValiderToutLeRegistre,
  onNaviguerVersRapprochement,
  onModifierStatutSalarie,
}) => {
  const [recherche, setRecherche] = useState('');
  const [filtreActif, setFiltreActif] = useState<FiltreRegistreType>('TOUS');
  const [ligneSelectionnee, setLigneSelectionnee] = useState<LigneRegistreCnss | null>(null);
  const [isValidationGlobaleModalOpen, setIsValidationGlobaleModalOpen] = useState(false);
  const [isExportNoticeOpen, setIsExportNoticeOpen] = useState(false);
  const [salariePourStatutModal, setSalariePourStatutModal] = useState<SalariePourModificationStatut | null>(null);

  // Bilan en temps réel
  const bilan = useMemo<BilanRegistreMensuel>(() => {
    return cnssRegisterService.verifierRegistreMensuel(lignesRegistre);
  }, [lignesRegistre]);

  // Filtrage et recherche
  const lignesFiltrees = useMemo(() => {
    return lignesRegistre.filter(ligne => {
      // Filtre textuel
      if (recherche.trim()) {
        const q = recherche.toLowerCase().trim();
        const matchNom =
          ligne.nomOfficiel.toLowerCase().includes(q) ||
          ligne.nomSource.toLowerCase().includes(q);
        const matchCni = ligne.cni && ligne.cni.toLowerCase().includes(q);
        const matchCnss = ligne.cnss && ligne.cnss.includes(q);
        if (!matchNom && !matchCni && !matchCnss) return false;
      }

      // Filtre par catégorie
      switch (filtreActif) {
        case 'PRETS':
          return ligne.statut === 'PRET';
        case 'A_COMPLETER':
          return ligne.statut === 'A_COMPLETER';
        case 'A_CORRIGER':
          return ligne.statut === 'A_CORRIGER';
        case 'BLOQUES':
          return ligne.statut === 'BLOQUE';
        case 'VALIDES':
          return ligne.statut === 'VALIDE';
        case 'AVEC_ANOMALIE':
          return ligne.anomalies.length > 0;
        case 'AVEC_CORRECTION':
          return ligne.corrections.length > 0;
        case 'CNSS_MANQUANT':
          return !ligne.cnss || ligne.cnss === 'MANQUANT';
        case 'CNI_MANQUANTE':
          return !ligne.cni || ligne.cni === 'MANQUANT';
        case 'TOUS':
        default:
          return true;
      }
    });
  }, [lignesRegistre, recherche, filtreActif]);

  // Export CSV de contrôle
  const handleExporterCsv = () => {
    const csvContent = cnssRegisterService.exporterControleCsv(lignesRegistre, moisActif);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registre_controle_cnss_${moisActif}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportNoticeOpen(true);
  };

  const estVerrouillePeriode = statutPeriode === 'CLOTURE';

  return (
    <div className="space-y-6">
      {/* 1. Résumé Mensuel & Compteurs Dynamiques (Section 14) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* TOTAL */}
        <div
          onClick={() => setFiltreActif('TOUS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtreActif === 'TOUS'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${filtreActif === 'TOUS' ? 'text-slate-300' : 'text-slate-500'}`}>
            Salariés du mois
          </span>
          <span className={`text-2xl font-black block mt-0.5 ${filtreActif === 'TOUS' ? 'text-white' : 'text-slate-900'}`}>
            {bilan.total}
          </span>
        </div>

        {/* PRÊTS */}
        <div
          onClick={() => setFiltreActif('PRETS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtreActif === 'PRETS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${filtreActif === 'PRETS' ? 'text-blue-100' : 'text-blue-600'}`}>
            Prêts
          </span>
          <span className={`text-2xl font-black block mt-0.5 ${filtreActif === 'PRETS' ? 'text-white' : 'text-blue-700'}`}>
            {bilan.prets}
          </span>
        </div>

        {/* VALIDÉS */}
        <div
          onClick={() => setFiltreActif('VALIDES')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtreActif === 'VALIDES'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${filtreActif === 'VALIDES' ? 'text-emerald-100' : 'text-emerald-600'}`}>
            Validés
          </span>
          <span className={`text-2xl font-black block mt-0.5 ${filtreActif === 'VALIDES' ? 'text-white' : 'text-emerald-700'}`}>
            {bilan.valides}
          </span>
        </div>

        {/* À COMPLÉTER */}
        <div
          onClick={() => setFiltreActif('A_COMPLETER')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtreActif === 'A_COMPLETER'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${filtreActif === 'A_COMPLETER' ? 'text-amber-100' : 'text-amber-600'}`}>
            À compléter
          </span>
          <span className={`text-2xl font-black block mt-0.5 ${filtreActif === 'A_COMPLETER' ? 'text-white' : 'text-amber-700'}`}>
            {bilan.aCompleter}
          </span>
        </div>

        {/* À CORRIGER */}
        <div
          onClick={() => setFiltreActif('A_CORRIGER')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtreActif === 'A_CORRIGER'
              ? 'bg-orange-600 text-white border-orange-600 shadow-md ring-2 ring-orange-500/20'
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
        >
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${filtreActif === 'A_CORRIGER' ? 'text-orange-100' : 'text-orange-600'}`}>
            À corriger
          </span>
          <span className={`text-2xl font-black block mt-0.5 ${filtreActif === 'A_CORRIGER' ? 'text-white' : 'text-orange-700'}`}>
            {bilan.aCorriger}
          </span>
        </div>

        {/* BLOQUÉS */}
        <div
          onClick={() => setFiltreActif('BLOQUES')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtreActif === 'BLOQUES'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${filtreActif === 'BLOQUES' ? 'text-rose-100' : 'text-rose-600'}`}>
            Bloqués
          </span>
          <span className={`text-2xl font-black block mt-0.5 ${filtreActif === 'BLOQUES' ? 'text-white' : 'text-rose-700'}`}>
            {bilan.bloques}
          </span>
        </div>

        {/* AVEC ANOMALIES */}
        <div
          onClick={() => setFiltreActif('AVEC_ANOMALIE')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtreActif === 'AVEC_ANOMALIE'
              ? 'bg-slate-800 text-white border-slate-800 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${filtreActif === 'AVEC_ANOMALIE' ? 'text-slate-300' : 'text-slate-500'}`}>
            Anomalies
          </span>
          <span className={`text-2xl font-black block mt-0.5 ${filtreActif === 'AVEC_ANOMALIE' ? 'text-white' : 'text-slate-800'}`}>
            {bilan.avecAnomalies}
          </span>
        </div>

        {/* AVEC CORRECTIONS */}
        <div
          onClick={() => setFiltreActif('AVEC_CORRECTION')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            filtreActif === 'AVEC_CORRECTION'
              ? 'bg-teal-700 text-white border-teal-700 shadow-md'
              : 'bg-white border-slate-200 hover:border-teal-300'
          }`}
        >
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${filtreActif === 'AVEC_CORRECTION' ? 'text-teal-100' : 'text-teal-600'}`}>
            Corrections
          </span>
          <span className={`text-2xl font-black block mt-0.5 ${filtreActif === 'AVEC_CORRECTION' ? 'text-white' : 'text-teal-800'}`}>
            {bilan.avecCorrections}
          </span>
        </div>
      </div>

      {/* 2. Barre d'outils, Recherche et Actions Principales */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Recherche */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, CNI ou numéro CNSS..."
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
            {recherche && (
              <button
                onClick={() => setRecherche('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Boutons d'actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExporterCsv}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exporter un CSV de contrôle interne pour audit humain"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              Export Contrôle CSV
            </button>

            {!estVerrouillePeriode && (
              <button
                onClick={() => setIsValidationGlobaleModalOpen(true)}
                disabled={!bilan.pret}
                className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  bilan.pret
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
                title={
                  bilan.pret
                    ? 'Valider le registre et sceller les données pour la déclaration'
                    : 'Impossible de valider : des blocages ou données manquantes subsistent'
                }
              >
                <CheckCircle2 className="w-4 h-4" />
                Valider le Registre ({bilan.prets + bilan.valides}/{bilan.total})
              </button>
            )}
          </div>
        </div>

        {/* Filtres secondaires à onglets rapides */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium text-slate-600">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtres :
          </span>
          {[
            { id: 'TOUS', label: `Tous (${lignesRegistre.length})` },
            { id: 'PRETS', label: `Prêts (${bilan.prets})` },
            { id: 'VALIDES', label: `Validés (${bilan.valides})` },
            { id: 'A_COMPLETER', label: `À compléter (${bilan.aCompleter})` },
            { id: 'A_CORRIGER', label: `À corriger (${bilan.aCorriger})` },
            { id: 'BLOQUES', label: `Bloqués (${bilan.bloques})` },
            { id: 'CNSS_MANQUANT', label: 'CNSS manquant' },
            { id: 'CNI_MANQUANTE', label: 'CNI manquante' },
            { id: 'AVEC_CORRECTION', label: `Corrigés (${bilan.avecCorrections})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFiltreActif(f.id as FiltreRegistreType)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filtreActif === f.id
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Tableau Principal du Registre CNSS (Section 10) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-4">Salarié Officiel & Source</th>
                <th className="py-3 px-3">CNI</th>
                <th className="py-3 px-3">CNSS</th>
                <th className="py-3 px-3 text-center">Jours Source</th>
                <th className="py-3 px-3 text-center">Jours Déclarés</th>
                <th className="py-3 px-3 text-right">Base Déclarée</th>
                <th className="py-3 px-3 text-right">Brut Déclaré</th>
                <th className="py-3 px-3 text-center">Situation</th>
                <th className="py-3 px-4 text-center">Statut Registre</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {lignesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Aucun salarié ne correspond aux critères sélectionnés.
                  </td>
                </tr>
              ) : (
                lignesFiltrees.map((ligne, idx) => (
                  <tr
                    key={ligne.id}
                    onClick={() => setLigneSelectionnee(ligne)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    {/* # */}
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Nom Officiel & Source */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                        {ligne.nomOfficiel}
                      </div>
                      {ligne.nomSource !== ligne.nomOfficiel && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Source : {ligne.nomSource}
                        </div>
                      )}
                    </td>

                    {/* CNI */}
                    <td className="py-3 px-3 font-mono text-xs">
                      {ligne.cni === 'MANQUANT' ? (
                        <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                          MANQUANT
                        </span>
                      ) : (
                        ligne.cni
                      )}
                    </td>

                    {/* CNSS */}
                    <td className="py-3 px-3 font-mono text-xs">
                      {ligne.cnss === 'MANQUANT' ? (
                        <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                          MANQUANT
                        </span>
                      ) : (
                        ligne.cnss
                      )}
                    </td>

                    {/* Jours Source */}
                    <td className="py-3 px-3 text-center text-slate-500 font-mono">
                      {ligne.joursImportes} j
                    </td>

                    {/* Jours Déclarés */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block font-mono font-bold px-2 py-0.5 rounded ${
                          ligne.joursDeclares !== ligne.joursImportes
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'text-slate-900'
                        }`}
                      >
                        {ligne.joursDeclares} j
                      </span>
                    </td>

                    {/* Base Déclarée */}
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {ligne.baseDeclaree.toLocaleString('fr-FR')} MAD
                    </td>

                    {/* Brut Déclaré */}
                    <td className="py-3 px-3 text-right font-mono text-slate-900 font-semibold">
                      {ligne.salaireBrutDeclare.toLocaleString('fr-FR')} MAD
                    </td>

                    {/* Situation */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            ligne.situation === 'ACTIF'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : ligne.situation === 'SORTI'
                              ? 'bg-slate-200 text-slate-800 border-slate-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {ligne.situation}
                        </span>
                        {onModifierStatutSalarie && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSalariePourStatutModal({
                                id: ligne.salarieId || ligne.id,
                                nomComplet: ligne.nomOfficiel,
                                cni: ligne.cni,
                                immatriculationCnss: ligne.cnss,
                                situation: ligne.situation as SituationEmploye,
                                joursMois: ligne.joursDeclares,
                              });
                            }}
                            className="text-[10px] text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                            title="Modifier le statut du salarié"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            Modifier
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Statut Registre */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          ligne.statut === 'VALIDE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ligne.statut === 'PRET'
                            ? 'bg-blue-100 text-blue-800'
                            : ligne.statut === 'A_COMPLETER'
                            ? 'bg-amber-100 text-amber-800'
                            : ligne.statut === 'A_CORRIGER'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {ligne.verrouille && <Lock className="w-2.5 h-2.5 shrink-0" />}
                        {ligne.statut}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setLigneSelectionnee(ligne);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Ouvrir le détail complet et la traçabilité"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modale de détail d'une ligne (Section 12) */}
      <DetailLigneRegistreModal
        isOpen={Boolean(ligneSelectionnee)}
        onClose={() => setLigneSelectionnee(null)}
        ligne={ligneSelectionnee}
        journalAudit={journalAudit}
        statutPeriode={statutPeriode}
        onValiderLigne={onValiderLigne}
        onCorrigerJours={onCorrigerJours}
        onDemanderReouverture={onDemanderReouverture}
      />

      {/* 5. Modale de confirmation de validation globale du registre (Section 16) */}
      {isValidationGlobaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Valider le Registre CNSS ({bilan.total} salariés)
              </h3>
              <p className="text-xs text-slate-500">
                Toutes les conditions sont remplies. Les données déclarées seront scellées et prêtes pour la préparation du fichier de déclaration.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Période :</span>
                <span className="font-bold text-slate-800">{moisActif}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Salariés conformes :</span>
                <span className="font-bold text-emerald-700">{bilan.prets + bilan.valides} / {bilan.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lignes avec corrections justifiées :</span>
                <span className="font-bold text-slate-800">{bilan.avecCorrections}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsValidationGlobaleModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onValiderToutLeRegistre();
                  setIsValidationGlobaleModalOpen(false);
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Confirmer la validation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Notification Export de contrôle (Section 22) */}
      {isExportNoticeOpen && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-4 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 space-y-2 animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5 text-teal-400">
              <CheckCircle2 className="w-4 h-4" />
              Export de Contrôle Généré
            </span>
            <button onClick={() => setIsExportNoticeOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300">
            Le fichier CSV de contrôle interne a été téléchargé. <strong>Note :</strong> Ce document est un outil d'inspection humaine et ne constitue pas encore le format officiel Damancom.
          </p>
        </div>
      )}

      {/* MODALE DE MODIFICATION DU STATUT SALARIÉ (PROMPT 17) */}
      <ModifierStatutSalarieModal
        isOpen={Boolean(salariePourStatutModal)}
        onClose={() => setSalariePourStatutModal(null)}
        salarie={salariePourStatutModal}
        periodeId={moisActif}
        onConfirmer={async (id, statut, motif) => {
          if (onModifierStatutSalarie) {
            await onModifierStatutSalarie(id, statut, motif);
          }
        }}
      />
    </div>
  );
};
