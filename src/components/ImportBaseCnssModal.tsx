import React, { useState, useRef } from 'react';
import {
  Database,
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Edit,
  Sparkles,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { excelService } from '../services/excelService';
import { persistenceService } from '../services/persistenceService';
import {
  SalarieReferentiel,
  ResultatImportBaseCnss,
  SituationEmploye,
} from '../types/cnss';
import { RAW_BASE_CNSS_SEPTEMBRE } from '../data/septembreRealData';

interface ImportBaseCnssModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseSalariesActuelle: SalarieReferentiel[];
  onBaseMiseAJour: (nouvelleBase: SalarieReferentiel[]) => void;
}

export const ImportBaseCnssModal: React.FC<ImportBaseCnssModalProps> = ({
  isOpen,
  onClose,
  baseSalariesActuelle,
  onBaseMiseAJour,
}) => {
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [resultatDiff, setResultatDiff] = useState<ResultatImportBaseCnss | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [estEnDrag, setEstEnDrag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const analyserTableauBrut = (lignesBrutes: any[][], nom: string) => {
    try {
      const diff = excelService.analyserBaseCnss(lignesBrutes, baseSalariesActuelle);
      setNomFichier(nom);
      setResultatDiff(diff);
      setErreur(null);
    } catch (err: any) {
      setErreur(`Erreur lors de l'analyse : ${err.message}`);
    }
  };

  const traiterFichier = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const lignesRaw: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });
        analyserTableauBrut(lignesRaw, file.name);
      } catch (err: any) {
        setErreur(`Format de fichier illisible : ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const chargerDemoBaseSeptembre = () => {
    // Génération du tableau brut à partir des données réelles de base_cnss_septembre.csv
    const header = ['N° immatriculé', 'Nom et prénom', 'Nbre Jours', 'Salaire', 'CNI', 'Situation'];
    const rows = RAW_BASE_CNSS_SEPTEMBRE.map(r => [
      r.cnss,
      r.nom,
      26,
      3190,
      r.cni,
      r.situation,
    ]);
    analyserTableauBrut([header, ...rows], 'base_cnss_septembre.csv');
  };

  const handleConfirmerMiseAJour = () => {
    if (!resultatDiff) return;

    const baseCopie = [...baseSalariesActuelle];

    // 1. Appliquer les modifications identifiées
    resultatDiff.modificationsDetectees.forEach(mod => {
      const sal = baseCopie.find(s => s.id === mod.salarieId);
      if (sal) {
        if (mod.champ === 'CNI') sal.cni = mod.nouvelleValeur;
        if (mod.champ === 'CNSS') sal.immatriculationCnss = mod.nouvelleValeur;
        if (mod.champ === 'SITUATION') {
          sal.situation = mod.nouvelleValeur as SituationEmploye;
          sal.actif = mod.nouvelleValeur === 'ACTIF';
        }
      }
    });

    // 2. Ajouter les nouveaux salariés
    resultatDiff.nouveauxSalaries.forEach(nouveau => {
      const res = persistenceService.creerNouveauSalarieReferentiel({
        nomComplet: nouveau.nomComplet,
        cni: nouveau.cni,
        immatriculationCnss: nouveau.cnss,
        situation: nouveau.situation,
        situationOriginale: nouveau.situationOriginale,
      });
      if (res.estNouveau) {
        baseCopie.push(res.salarie);
      }
    });

    persistenceService.saveSalaries(baseCopie);
    onBaseMiseAJour(baseCopie);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Importer / Mettre à jour la Base CNSS</h2>
              <p className="text-xs text-teal-200">
                Comparaison intelligente sans écrasement silencieux (Section 9, 10, 11 & 12)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {erreur && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {!resultatDiff && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setEstEnDrag(true); }}
                onDragLeave={() => setEstEnDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setEstEnDrag(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    traiterFichier(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  estEnDrag
                    ? 'border-teal-500 bg-teal-50/50'
                    : 'border-slate-300 hover:border-teal-400 bg-slate-50/50 hover:bg-teal-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      traiterFichier(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                  <Database className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Sélectionnez ou déposez le fichier de référence Base CNSS
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Détection des colonnes : N° immatriculé, Nom et prénom, CNI, Situation &bull; Normalisation stricte de l'immatriculation en texte (sans .0)
                </p>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={chargerDemoBaseSeptembre}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Charger le fichier réel : base_cnss_septembre.csv (77 salariés)</span>
                </button>
              </div>
            </div>
          )}

          {/* RÉSUMÉ D'ANALYSE AVANT VALIDATION (Section 11) */}
          {resultatDiff && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Fichier analysé : {nomFichier}</h3>
                  <p className="text-xs text-slate-500">
                    Base actuelle : {baseSalariesActuelle.length} salariés dans le référentiel
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResultatDiff(null)}
                  className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Changer de fichier
                </button>
              </div>

              {/* Cartes d'indicateurs (Section 11) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Lignes Importées</span>
                  <span className="text-xl font-black text-blue-900">{resultatDiff.lignesImportees}</span>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Salariés Existants</span>
                  <span className="text-xl font-black text-emerald-900">{resultatDiff.salariesExistants}</span>
                </div>

                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-700 block">Nouveaux à Ajouter</span>
                  <span className="text-xl font-black text-purple-900">{resultatDiff.nouveauxSalaries.length}</span>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Modifications / Doublons</span>
                  <span className="text-xl font-black text-amber-900">
                    {resultatDiff.modificationsDetectees.length + resultatDiff.doublonsDetectes.length}
                  </span>
                </div>
              </div>

              {/* Détails des nouveaux salariés à intégrer */}
              {resultatDiff.nouveauxSalaries.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                    <span>Nouveaux salariés à ajouter ({resultatDiff.nouveauxSalaries.length})</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs max-h-40 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Nom complet</th>
                          <th className="py-2 px-3">CNI</th>
                          <th className="py-2 px-3">N° CNSS (Texte)</th>
                          <th className="py-2 px-3">Situation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resultatDiff.nouveauxSalaries.map((n, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-semibold text-slate-900">{n.nomComplet}</td>
                            <td className="py-1.5 px-3 font-mono">{n.cni || '-'}</td>
                            <td className="py-1.5 px-3 font-mono font-bold text-emerald-800">{n.cnss || '-'}</td>
                            <td className="py-1.5 px-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                n.situation === 'ACTIF'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : n.situation === 'SORTI'
                                  ? 'bg-slate-200 text-slate-800 border-slate-300'
                                  : n.situation === 'ENTRANT'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}>
                                {n.situation || 'ACTIF'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Détails des doublons identifiés */}
              {resultatDiff.doublonsDetectes.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Doublons d'identifiants détectés dans le fichier importé :</span>
                  </div>
                  {resultatDiff.doublonsDetectes.map((d, i) => (
                    <div key={i} className="text-[11px] font-mono text-amber-800 pl-6">
                      &bull; {d.type} : "{d.identifiant}" présent aux lignes {d.lignes.join(' et ')}
                    </div>
                  ))}
                  <p className="text-[10px] text-amber-700 italic pt-1 pl-6">
                    Aucun doublon n'est supprimé automatiquement. L'intégrité reste préservée.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>

          {resultatDiff && (
            <button
              type="button"
              onClick={handleConfirmerMiseAJour}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmer la mise à jour de la Base</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
