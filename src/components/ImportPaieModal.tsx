import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  RefreshCw,
  HelpCircle,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { excelService } from '../services/excelService';
import { persistenceService } from '../services/persistenceService';
import {
  AnalyseFichierExcel,
  ChampMappeType,
  LignePaieImportee,
} from '../types/cnss';
import { RAW_CALCUL_SALAIRE_SEPTEMBRE } from '../data/septembreRealData';

interface ImportPaieModalProps {
  isOpen: boolean;
  onClose: () => void;
  idMois: string;
  libelleMois: string;
  onImportConfirme: (lignesPaie: LignePaieImportee[], analyse: AnalyseFichierExcel) => void;
}

export const ImportPaieModal: React.FC<ImportPaieModalProps> = ({
  isOpen,
  onClose,
  idMois,
  libelleMois,
  onImportConfirme,
}) => {
  const [fichierAnalyse, setFichierAnalyse] = useState<AnalyseFichierExcel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [estEnDrag, setEstEnDrag] = useState(false);
  const [alerteDoubleImport, setAlerteDoubleImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Traitement d'un fichier réel déposé ou sélectionné
  const traiterFichier = (file: File) => {
    setErreur(null);
    setAlerteDoubleImport(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const analyse = excelService.analyserBufferOuClasseur(
          buffer,
          file.name,
          file.size,
          new Date(file.lastModified).toISOString()
        );

        // Vérification de double import (Section 16)
        const estDouble = persistenceService.verifierDoubleImport(
          idMois,
          file.name,
          file.size,
          analyse.totalLignesDetectees
        );

        if (estDouble) {
          setAlerteDoubleImport(true);
        }

        setFichierAnalyse(analyse);
      } catch (err: any) {
        setErreur(`Erreur lors de la lecture du fichier : ${err.message || 'Format non supporté'}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Chargement rapide du jeu de données réel de Septembre (88 salariés + 1 total)
  const chargerDemoSeptembre = () => {
    setErreur(null);
    setAlerteDoubleImport(false);

    // Générer du CSV pour test direct de parsing réel
    const lignesCsv: string[] = ['NOM ET PRENOM,JRS OUVRE,BASE,BRUT'];
    RAW_CALCUL_SALAIRE_SEPTEMBRE.forEach(row => {
      lignesCsv.push(`"${row.nom}",${row.jours},${row.base},${row.brut}`);
    });
    // Ajouter expressément la ligne TOTAL pour valider l'exigence
    lignesCsv.push('"TOTAL GENERAL",1789,280720,270115');

    const csvContent = lignesCsv.join('\n');
    const analyse = excelService.analyserBufferOuClasseur(
      csvContent,
      'calcul_salaire_septembre_mults.csv',
      csvContent.length,
      new Date().toISOString()
    );

    const estDouble = persistenceService.verifierDoubleImport(
      idMois,
      'calcul_salaire_septembre_mults.csv',
      csvContent.length,
      analyse.totalLignesDetectees
    );
    if (estDouble) {
      setAlerteDoubleImport(true);
    }

    setFichierAnalyse(analyse);
  };

  // Modification d'un mapping manuel par l'utilisateur (Section 5)
  const handleModifierMapping = (colonneSource: string, nouveauChamp: ChampMappeType) => {
    if (!fichierAnalyse) return;

    const nouveauxMappings = fichierAnalyse.mappings.map(m => {
      if (m.colonneSource === colonneSource) {
        return { ...m, champCible: nouveauChamp, confiance: 'MANUEL' as const };
      }
      return m;
    });

    // Mémoriser le mapping pour les prochains fichiers
    persistenceService.saveMappingColonne(colonneSource, nouveauChamp);

    setFichierAnalyse({
      ...fichierAnalyse,
      mappings: nouveauxMappings,
    });
  };

  // Validation définitive de l'import
  const handleValiderImport = () => {
    if (!fichierAnalyse) return;

    // Convertir les lignes brutes avec intégrité absolue
    const lignesPaie = excelService.convertirEnLignesPaie(fichierAnalyse, idMois);

    // Mémoriser l'information du fichier pour protection double import
    persistenceService.enregistrerFichierImporte(
      idMois,
      fichierAnalyse.nomFichier,
      fichierAnalyse.taille,
      fichierAnalyse.totalLignesDetectees
    );

    onImportConfirme(lignesPaie, fichierAnalyse);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Importer Fichier de Calcul des Salaires</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {libelleMois} ({idMois})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Formats acceptés : .xlsx, .xls, .csv &bull; Détection automatique des feuilles, colonnes et lignes Total
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

        {/* Corps modale scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Alerte de double import (Section 16) */}
          {alerteDoubleImport && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Avertissement : Ce fichier semble déjà avoir été importé pour ce mois</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Un fichier identique ({fichierAnalyse?.nomFichier}) a déjà été enregistré sur la période {libelleMois}. Voulez-vous recharger les données ou annuler ?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setAlerteDoubleImport(false)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                >
                  Recharger quand même
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFichierAnalyse(null);
                    setAlerteDoubleImport(false);
                  }}
                  className="px-2.5 py-1 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg font-semibold text-[11px] cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {erreur && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {/* ZONE DE GLISSER-DÉPOSER / SÉLECTION */}
          {!fichierAnalyse && (
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
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20'
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
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Cliquez pour sélectionner ou glissez-déposez le fichier de paie
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Compatible avec Excel (.xlsx, .xls) et CSV (.csv) &bull; Détection intelligente des colonnes
                </p>
              </div>

              {/* Bouton de test rapide avec les données réelles de Septembre */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={chargerDemoSeptembre}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Charger le fichier réel : calcul_salaire_septembre_mults.csv (88 salariés)</span>
                </button>
              </div>
            </div>
          )}

          {/* RÉSULTAT DE L'ANALYSE DU FICHIER */}
          {fichierAnalyse && (
            <div className="space-y-6">
              {/* Carte des métadonnées du fichier (Section 2 & 3) */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{fichierAnalyse.nomFichier}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>Taille : {Math.round(fichierAnalyse.taille / 1024) || 1} Ko</span>
                      <span>&bull;</span>
                      <span>Feuilles : {fichierAnalyse.feuilles.join(', ')}</span>
                      <span>&bull;</span>
                      <span className="font-semibold text-emerald-700">Feuille retenue : {fichierAnalyse.feuilleSelectionnee}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFichierAnalyse(null)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold self-start md:self-auto cursor-pointer"
                >
                  Changer de fichier
                </button>
              </div>

              {/* Compteurs de synthèse de l'analyse (Section 6, 7 & 20) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Lignes Détectées</span>
                  <span className="text-xl font-black text-blue-900">{fichierAnalyse.totalLignesDetectees}</span>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Lignes Valides</span>
                  <span className="text-xl font-black text-emerald-900">{fichierAnalyse.lignesValidesCount}</span>
                </div>

                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">Ligne Total Ignorée</span>
                  <span className="text-xl font-black text-slate-800">{fichierAnalyse.lignesIgnoreesTotalCount}</span>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Anomalies Détectées</span>
                  <span className="text-xl font-black text-amber-900">{fichierAnalyse.lignesAnomaliesCount}</span>
                </div>
              </div>

              {/* Notification explicite de la ligne Total (Section 6) */}
              {fichierAnalyse.lignesIgnoreesTotalCount > 0 && (
                <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{fichierAnalyse.lignesIgnoreesTotalCount} ligne récapitulative "Total" ignorée</strong> : Le moteur l'a isolée pour ne pas fausser le décompte des salariés.
                  </span>
                </div>
              )}

              {/* TABLEAU DE MAPPING DES COLONNES (Section 4 & 5) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Mapping des colonnes détectées</span>
                    <span className="text-[10px] font-normal lowercase text-slate-500">(Sauvegarde automatique)</span>
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Colonne Excel</th>
                        <th className="py-2.5 px-3">Champ CNSS MULT.S</th>
                        <th className="py-2.5 px-3">Détection</th>
                        <th className="py-2.5 px-3">Aperçu valeurs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {fichierAnalyse.mappings.map(m => (
                        <tr key={m.colonneSource} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {m.colonneSource}
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={m.champCible}
                              onChange={e => handleModifierMapping(m.colonneSource, e.target.value as ChampMappeType)}
                              className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-hidden ${
                                m.champCible !== 'ignorer'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-500'
                              }`}
                            >
                              <option value="nomComplet">Nom complet du salarié</option>
                              <option value="joursTravailles">Jours travaillés (jrs ouvrés)</option>
                              <option value="salaireBase">Salaire de base</option>
                              <option value="salaireBrut">Salaire brut</option>
                              <option value="cni">CNI</option>
                              <option value="cnss">Immatriculation CNSS</option>
                              <option value="client">Client / Chantier</option>
                              <option value="ignorer">Ignorer cette colonne</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.confiance === 'AUTOMATIQUE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {m.confiance}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-500 truncate max-w-xs font-mono">
                            {m.apercuValeurs.filter(Boolean).join(' | ') || 'Vide'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PRÉVISUALISATION DES 10 PREMIÈRES LIGNES (Section 6) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Prévisualisation des 10 premières lignes
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Affiche les données brutes telles qu'extraites
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
                  <table className="w-full text-left font-sans">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5 text-center w-12">Ligne</th>
                        <th className="py-2 px-3">Nom complet</th>
                        <th className="py-2 px-3 text-right">Jours importés</th>
                        <th className="py-2 px-3 text-right">Base</th>
                        <th className="py-2 px-3 text-right">Brut</th>
                        <th className="py-2 px-3">Contrôle immédiat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fichierAnalyse.lignesPrevisualisation.map((row, idx) => {
                        const joursVal = Number(row.jours);
                        const estNegatif = joursVal < 0;
                        const estSup26 = joursVal > 26;
                        const estZero = joursVal === 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                              {row._ligneExcel}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {row.nom}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              {row.jours} j
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {row.base !== undefined ? `${row.base} DH` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {row.brut !== undefined ? `${row.brut} DH` : '-'}
                            </td>
                            <td className="py-2 px-3">
                              {estNegatif ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                                  🔴 Jours négatifs ({joursVal} j)
                                </span>
                              ) : estSup26 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                                  🔴 Dépassement 26 j ({joursVal} j)
                                </span>
                              ) : estZero ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">
                                  🟠 0 jour ouvré
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  🟢 Conforme
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>

          {fichierAnalyse && (
            <button
              type="button"
              onClick={handleValiderImport}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Valider l'import et Lancer le Rapprochement ({fichierAnalyse.totalLignesDetectees} lignes)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
