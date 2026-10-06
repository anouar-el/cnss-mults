import React, { useState, useMemo } from 'react';
import {
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Eye,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  RefreshCw,
  Hash,
  AlertCircle,
} from 'lucide-react';
import {
  FichierPreetabliCnss,
  RapprochementPreetabli,
  BilanAnalysePreetabli,
  ChampCandidat,
  StatutRapprochementPreetabli,
  DecisionHumainePreetabli,
} from '../types/cnssPreetabli';
import { LigneRegistreCnss, SalarieReferentiel } from '../types/cnss';
import { cnssPreetabliService } from '../services/cnssPreetabliService';
import { DetailLignePreetabliModal } from './DetailLignePreetabliModal';

interface PreetabliCnssViewProps {
  moisActif: string;
  fichierPreetabli: FichierPreetabliCnss | null;
  rapprochements: RapprochementPreetabli[];
  lignesRegistre: LigneRegistreCnss[];
  baseSalaries: SalarieReferentiel[];
  onOuvrirModalImport: () => void;
  onValiderDecision: (
    ligneId: string,
    action: 'VALIDER' | 'IGNORER' | 'ASSOCIER_SALARIE',
    salarieCibleId?: string,
    motif?: string
  ) => void;
  onNaviguerVersRegistre: () => void;
}

type FiltreVueType =
  | 'TOUS'
  | 'IDENTIQUES'
  | 'DIFFERENTS'
  | 'MANQUANTS'
  | 'AMBIGUS'
  | 'NON_IDENTIFIES';

export const PreetabliCnssView: React.FC<PreetabliCnssViewProps> = ({
  moisActif,
  fichierPreetabli,
  rapprochements,
  lignesRegistre,
  baseSalaries,
  onOuvrirModalImport,
  onValiderDecision,
  onNaviguerVersRegistre,
}) => {
  const [recherche, setRecherche] = useState('');
  const [filtreActif, setFiltreActif] = useState<FiltreVueType>('TOUS');
  const [ligneSelectionnee, setLigneSelectionnee] = useState<RapprochementPreetabli | null>(null);
  const [notificationExport, setNotificationExport] = useState<string | null>(null);

  // Analyse structurelle des champs candidats
  const champsCandidats = useMemo<ChampCandidat[]>(() => {
    if (!fichierPreetabli) return [];
    return cnssPreetabliService.identifierChampsCandidats(fichierPreetabli, baseSalaries);
  }, [fichierPreetabli, baseSalaries]);

  // Bilan statistique
  const bilan = useMemo<BilanAnalysePreetabli | null>(() => {
    if (!fichierPreetabli) return null;
    return cnssPreetabliService.calculerBilanAnalyse(fichierPreetabli, rapprochements, lignesRegistre);
  }, [fichierPreetabli, rapprochements, lignesRegistre]);

  // Filtrage du tableau
  const lignesFiltrees = useMemo(() => {
    return rapprochements.filter(r => {
      // Recherche textuelle
      if (recherche.trim()) {
        const q = recherche.toLowerCase().trim();
        const matchNom = r.preetabliNom && r.preetabliNom.toLowerCase().includes(q);
        const matchCni = r.preetabliCni && r.preetabliCni.toLowerCase().includes(q);
        const matchCnss = r.preetabliCnss && r.preetabliCnss.includes(q);
        const matchCand = r.candidats.some(c => c.nom.toLowerCase().includes(q));
        if (!matchNom && !matchCni && !matchCnss && !matchCand) return false;
      }

      // Filtre catégorie
      switch (filtreActif) {
        case 'IDENTIQUES':
          return (
            (r.statut === 'IDENTIFIE' || r.statut === 'VALIDÉ') &&
            r.differences.every(d => d.categorie === 'IDENTIQUE')
          );
        case 'DIFFERENTS':
          return r.differences.some(d => d.categorie === 'DIFFÉRENT');
        case 'MANQUANTS':
          return r.differences.some(d => d.categorie === 'MANQUANT_REGISTRE' || d.categorie === 'MANQUANT_PRÉÉTABLI');
        case 'AMBIGUS':
          return r.statut === 'AMBIGU';
        case 'NON_IDENTIFIES':
          return r.statut === 'NON_IDENTIFIE';
        case 'TOUS':
        default:
          return true;
      }
    });
  }, [rapprochements, recherche, filtreActif]);

  // Téléchargement du rapport d'analyse interne (Section 32)
  const telechargerRapport = (format: 'CSV' | 'JSON') => {
    if (!fichierPreetabli || !bilan) return;
    const contenu = cnssPreetabliService.genererRapportAnalyseInterne(
      fichierPreetabli,
      bilan,
      rapprochements,
      format
    );
    const mime = format === 'JSON' ? 'application/json' : 'text/csv;charset=utf-8;';
    const blob = new Blob([contenu], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ANALYSE_PREETABLI_${moisActif}_${fichierPreetabli.hash.slice(7, 15)}.${format.toLowerCase()}`;
    link.click();
    URL.revokeObjectURL(url);

    setNotificationExport(`Rapport d'analyse ${format} téléchargé avec succès (outil interne d'inspection).`);
    setTimeout(() => setNotificationExport(null), 5000);
  };

  // Salarié du registre associé pour la modale de détail
  const ligneRegistreSelectionnee = useMemo(() => {
    if (!ligneSelectionnee) return undefined;
    return lignesRegistre.find(l => l.id === ligneSelectionnee.registreLigneId || l.salarieId === ligneSelectionnee.salarieId);
  }, [ligneSelectionnee, lignesRegistre]);

  const ligneOriginaleSelectionnee = useMemo(() => {
    if (!ligneSelectionnee || !fichierPreetabli) return null;
    return fichierPreetabli.lignesOriginales.find(l => l.numeroLigne === ligneSelectionnee.numeroLignePreetabli) || null;
  }, [ligneSelectionnee, fichierPreetabli]);

  // Si aucun fichier préétabli n'est encore chargé
  if (!fichierPreetabli || !bilan) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-2xl mx-auto shadow-xs space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">
            Aucun Préétabli CNSS / BDS n'est encore chargé pour {moisActif}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Importez le fichier texte transmis par Damancom ou chargez la fixture de référence officielle pour lancer l'analyse structurelle et le rapprochement.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onOuvrirModalImport}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Importer un Préétabli CNSS</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER DE LA VUE PRÉÉTABLI (SECTION 30) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
                PROMPT 07-BIS &bull; PRÉÉTABLI CNSS
              </span>
              {fichierPreetabli.estFixtureTest ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  FIXTURE RÉFÉRENCE TEST (BDS Septembre)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  FICHIER RÉEL IMPORTÉ
                </span>
              )}
              <span className="text-xs text-slate-500 font-mono">
                Période {moisActif}
              </span>
            </div>

            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{fichierPreetabli.nomFichier}</span>
              <span className="text-xs font-mono font-normal text-slate-400">
                ({(fichierPreetabli.taille / 1024).toFixed(1)} Ko &bull; {fichierPreetabli.nombreLignes} lignes)
              </span>
            </h1>

            <p className="text-xs text-slate-500 font-mono">
              Empreinte d'intégrité : <strong className="text-slate-700">{fichierPreetabli.hash}</strong> &bull; Encodage : {fichierPreetabli.encodage}
            </p>
          </div>

          {/* ACTIONS SUR LE PRÉÉTABLI */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={onOuvrirModalImport}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Changer de fichier</span>
            </button>

            <button
              onClick={() => telechargerRapport('CSV')}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Rapport CSV</span>
            </button>

            <button
              onClick={() => telechargerRapport('JSON')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Rapport JSON</span>
            </button>
          </div>
        </div>

        {notificationExport && (
          <div className="p-3 bg-emerald-50 text-emerald-900 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notificationExport}</span>
          </div>
        )}
      </div>

      {/* SECTION 1 : ANALYSE TECHNIQUE (SECTION 7 & 30) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Longueur Dominante</span>
          <span className="text-2xl font-black text-slate-900">{fichierPreetabli.longueurDominante} car.</span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Min: {fichierPreetabli.longueurMin} &bull; Max: {fichierPreetabli.longueurMax}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Salariés Détectés</span>
          <span className="text-2xl font-black text-indigo-700">{bilan.totalPreetabliSalaries}</span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Lignes de type enregistrement SALARIE
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Lignes Suspectes / Vides</span>
          <span className="text-2xl font-black text-slate-900">
            {bilan.lignesSuspectes} / {bilan.lignesVides}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Doublons exacts de lignes : {bilan.doublonsExacts}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Employeur CNSS</span>
          <span className="text-sm font-black text-slate-900 block truncate mt-1">
            {fichierPreetabli.employeurDetecte?.nomEmployeur || 'MULT.S INTERIM'}
          </span>
          <span className="text-[11px] font-mono text-emerald-700 block">
            N° Affiliation : {fichierPreetabli.employeurDetecte?.numAffiliation || 'Non renseigné'}
          </span>
        </div>
      </div>

      {/* SECTION 2 : STRUCTURE & CHAMPS CANDIDATS (SECTION 8 & 30) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Structure Détectée et Segments Candidats
            </h2>
            <p className="text-xs text-slate-500">
              Chaque segment est identifié spatialement sur la base de la longueur fixe de {fichierPreetabli.longueurDominante} caractères.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-lg">
            {champsCandidats.length} champs candidats
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Nom Technique</th>
                <th className="py-2.5 px-2 text-center">Début</th>
                <th className="py-2.5 px-2 text-center">Fin</th>
                <th className="py-2.5 px-2 text-center">Longueur</th>
                <th className="py-2.5 px-3 text-center">Type</th>
                <th className="py-2.5 px-3">Exemple Détecté</th>
                <th className="py-2.5 px-3">Interprétation</th>
                <th className="py-2.5 px-3 text-center">Certitude</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {champsCandidats.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{c.nomTechniqueProvisoire}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-600">{c.positionDebut}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-600">{c.positionFin}</td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">{c.longueur} car.</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 font-mono">{c.type}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-900 bg-slate-50/50">{c.valeurExemple || '-'}</td>
                  <td className="py-2.5 px-3 text-slate-600">{c.interpretation}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      c.certitude === 'CONFIRMÉ'
                        ? 'bg-emerald-100 text-emerald-800'
                        : c.certitude === 'PROBABLE'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {c.certitude}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3 : STATISTIQUES DU RAPPROCHEMENT PRÉÉTABLI (SECTION 30) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Rapprochement avec le Registre Mensuel MULT.S
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Préétabli</span>
            <span className="text-xl font-black text-slate-900">{bilan.totalPreetabliSalaries}</span>
          </div>

          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Identifiés</span>
            <span className="text-xl font-black text-emerald-700">{bilan.totalIdentifies}</span>
          </div>

          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
            <span className="text-[10px] font-bold text-blue-700 uppercase block">À Valider</span>
            <span className="text-xl font-black text-blue-700">{bilan.totalAValider}</span>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Ambigus</span>
            <span className="text-xl font-black text-amber-800">{bilan.totalAmbigus}</span>
          </div>

          <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
            <span className="text-[10px] font-bold text-purple-800 uppercase block">Incohérents</span>
            <span className="text-xl font-black text-purple-800">{bilan.totalIncoherents}</span>
          </div>

          <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
            <span className="text-[10px] font-bold text-rose-800 uppercase block">Non Identifiés</span>
            <span className="text-xl font-black text-rose-800">{bilan.totalNonIdentifies}</span>
          </div>

          <div className="bg-teal-50 p-3 rounded-xl border border-teal-200">
            <span className="text-[10px] font-bold text-teal-800 uppercase block">Validés Gestion</span>
            <span className="text-xl font-black text-teal-800">{bilan.totalValides}</span>
          </div>
        </div>

        {/* ALERTE SALARIÉS MANQUANTS DU PRÉÉTABLI OU DU REGISTRE (SECTION 20 & 21) */}
        {(bilan.totalNouveauxAExaminer > 0 || bilan.totalPresentsPreetabliNonRegistre > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {bilan.totalNouveauxAExaminer > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>{bilan.totalNouveauxAExaminer} salarié(s) MULT.S absent(s) du préétabli</strong> (NOUVEAU_A_EXAMINER).
                  <div className="text-[11px] text-amber-700 mt-0.5">
                    Présents dans le registre mensuel mais non répertoriés sur le BDS reçu. Doivent faire l'objet d'une déclaration d'entrant (BDSE Réf. 512).
                  </div>
                </div>
              </div>
            )}

            {bilan.totalPresentsPreetabliNonRegistre > 0 && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <strong>{bilan.totalPresentsPreetabliNonRegistre} salarié(s) du préétabli absents du registre MULT.S</strong> (PRESENT_PREETABLI_NON_REGISTRE).
                  <div className="text-[11px] text-purple-700 mt-0.5">
                    Figurant sur le bordereau CNSS mais sans ligne de paie ce mois-ci. Nécessitent confirmation de sortie ou vérification.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4 : TABLEAU DES DIFFÉRENCES & FILTRES (SECTION 30) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par nom, CNI ou matricule CNSS..."
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          {/* BOUTONS DE FILTRES */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'TOUS', label: `Tous (${rapprochements.length})` },
                { id: 'IDENTIQUES', label: 'Identiques' },
                { id: 'DIFFERENTS', label: 'Différents' },
                { id: 'MANQUANTS', label: 'Manquants' },
                { id: 'AMBIGUS', label: `Ambigus (${bilan.totalAmbigus})` },
                { id: 'NON_IDENTIFIES', label: `Non Identifiés (${bilan.totalNonIdentifies})` },
              ] as const
            ).map(f => (
              <button
                key={f.id}
                onClick={() => setFiltreActif(f.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  filtreActif === f.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABLEAU PRINCIPAL DES LIGNES PRÉÉTABLI */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">Ligne</th>
                  <th className="py-3 px-3">CNSS Préétabli</th>
                  <th className="py-3 px-3">CNI Préétabli</th>
                  <th className="py-3 px-4">Nom Préétabli</th>
                  <th className="py-3 px-2 text-center">Jours</th>
                  <th className="py-3 px-4">Registre MULT.S (Candidat)</th>
                  <th className="py-3 px-3 text-center">Score</th>
                  <th className="py-3 px-3 text-center">Statut</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {lignesFiltrees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      Aucune ligne ne correspond aux filtres appliqués.
                    </td>
                  </tr>
                ) : (
                  lignesFiltrees.map(r => {
                    const diffJours = r.differences.find(d => d.champ === 'JOURS');
                    const candNom = r.candidats[0]?.nom;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => setLigneSelectionnee(r)}
                      >
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                          {r.numeroLignePreetabli}
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {r.preetabliCnss || (
                            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                              ABSENT
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-800">
                          {r.preetabliCni || '-'}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {r.preetabliNom || '(Nom non extrait)'}
                        </td>

                        <td className="py-3 px-2 text-center font-mono">
                          {r.preetabliJours !== undefined ? (
                            <span className={`px-1.5 py-0.5 rounded font-bold ${
                              diffJours && diffJours.categorie === 'DIFFÉRENT'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'text-slate-800'
                            }`}>
                              {r.preetabliJours} j
                            </span>
                          ) : '-'}
                        </td>

                        <td className="py-3 px-4">
                          {candNom ? (
                            <div>
                              <div className="font-bold text-slate-900">{candNom}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Méthode : {r.methode}
                              </div>
                            </div>
                          ) : (
                            <span className="text-rose-600 italic text-[11px]">
                              Non retrouvé dans MULT.S
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">
                          {r.score > 0 ? `${r.score}%` : '-'}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            r.statut === 'IDENTIFIE' || r.statut === 'VALIDÉ'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.statut === 'AMBIGU'
                              ? 'bg-amber-100 text-amber-900'
                              : r.statut === 'INCOHERENT'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.statut}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setLigneSelectionnee(r);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto text-xs font-bold ${
                              r.statut === 'AMBIGU'
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                            }`}
                            title={r.statut === 'AMBIGU' ? 'Arbitrer le cas ambigu' : 'Voir détail face-à-face'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {r.statut === 'AMBIGU' && <span>Arbitrer</span>}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODALE DE DÉTAIL FACE-À-FACE */}
      {ligneSelectionnee && (
        <DetailLignePreetabliModal
          isOpen={Boolean(ligneSelectionnee)}
          rapprochement={ligneSelectionnee}
          ligneOriginale={ligneOriginaleSelectionnee}
          champsCandidats={champsCandidats}
          ligneRegistreAssociee={ligneRegistreSelectionnee}
          baseSalaries={baseSalaries}
          onClose={() => setLigneSelectionnee(null)}
          onValiderDecision={onValiderDecision}
        />
      )}
    </div>
  );
};
