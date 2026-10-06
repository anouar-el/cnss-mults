import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileCode,
  Sparkles,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { cnssPreetabliService } from '../services/cnssPreetabliService';
import { FichierPreetabliCnss } from '../types/cnssPreetabli';

interface ImportPreetabliCnssModalProps {
  isOpen: boolean;
  moisActif: string;
  fichierExistant: FichierPreetabliCnss | null;
  onClose: () => void;
  onFichierImporte: (fichier: FichierPreetabliCnss) => void;
}

export const ImportPreetabliCnssModal: React.FC<ImportPreetabliCnssModalProps> = ({
  isOpen,
  moisActif,
  fichierExistant,
  onClose,
  onFichierImporte,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fichierEnAttente, setFichierEnAttente] = useState<{
    nom: string;
    contenu: string;
    estFixture?: boolean;
  } | null>(null);
  const [avertissementDoublon, setAvertissementDoublon] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const traiterFichierTexte = (nom: string, contenu: string, estFixture = false) => {
    const hash = cnssPreetabliService.calculerHash(contenu);

    // Détection de doublon (Section 27)
    if (fichierExistant && fichierExistant.hash === hash) {
      setAvertissementDoublon(true);
      setFichierEnAttente({ nom, contenu, estFixture });
      return;
    }

    const analyse = cnssPreetabliService.importerEtAnalyserFichierBrut(nom, contenu, estFixture);
    onFichierImporte(analyse);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      traiterFichierTexte(file.name, text, false);
    };
    reader.readAsText(file, 'ISO-8859-1'); // Lit en mode texte sans altérer les encodages Windows-1256 / ISO
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      traiterFichierTexte(file.name, text, false);
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  const handleChargerFixture = () => {
    const fixtureContenu = cnssPreetabliService.genererFixturePreetabliReference(moisActif);
    const nomFixture = `DS_7891234_${moisActif.replace('-', '')}_PREETABLI_REF.txt`;
    traiterFichierTexte(nomFixture, fixtureContenu, true);
  };

  const confirmerAnalyseMalgreDoublon = () => {
    if (!fichierEnAttente) return;
    const analyse = cnssPreetabliService.importerEtAnalyserFichierBrut(
      fichierEnAttente.nom,
      fichierEnAttente.contenu,
      fichierEnAttente.estFixture
    );
    onFichierImporte(analyse);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* EN-TÊTE MODALE */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Importer un Préétabli CNSS / BDS
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-indigo-100 text-indigo-800">
                  PROMPT 07-BIS
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Période {moisActif} &bull; Fichier brut original conservé en lecture seule
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPS DE LA MODALE */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* ALERTE DOUBLON DÉTECTÉ (SECTION 27) */}
          {avertissementDoublon && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Ce fichier préétabli a déjà été importé (empreinte identique)</span>
              </div>
              <p className="text-xs text-amber-800">
                Un fichier avec exactement le même contenu et le même hash d'intégrité est déjà chargé pour la période {moisActif}. Souhaitez-vous quand même ré-exécuter l'analyse ?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setAvertissementDoublon(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmerAnalyseMalgreDoublon}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Analyser quand même
                </button>
              </div>
            </div>
          )}

          {/* ZONE DE GLISSER-DÉPOSER */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
              dragActive
                ? 'border-indigo-600 bg-indigo-50/70 scale-98'
                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <Upload className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">
                Glissez votre fichier préétabli CNSS ici, ou{' '}
                <span className="text-indigo-600 hover:underline">parcourez vos dossiers</span>
              </p>
              <p className="text-xs text-slate-500">
                Formats acceptés : <strong>.txt</strong> (BDS Damancom officiel à longueur fixe 260 car.)
              </p>
            </div>
          </div>

          {/* OPTION DE DÉMONSTRATION / FIXTURE RÉFÉRENCE */}
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">
                  Fixture Officielle de Référence (Test)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-indigo-100 text-indigo-800">
                  SECTION 36
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Génère instantanément un préétabli BDS conforme basé sur les salariés réels de Septembre (88 salariés, 260 car./ligne).
              </p>
            </div>

            <button
              onClick={handleChargerFixture}
              type="button"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Charger la Fixture
            </button>
          </div>

          {/* RAPPEL DES RÈGLES D'IMMUTABILITÉ (SECTION 1 & 29) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Garanties d'intégrité et de non-altération</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500">
              <li>Le fichier original est scanné et conservé en lecture seule avec calcul d'empreinte SHA256.</li>
              <li>Aucun espace, retour chariot ni caractère n'est tronqué ou modifié.</li>
              <li>Le registre mensuel MULT.S reste totalement indépendant et inviolé.</li>
              <li>Ce module réalise une inspection analytique sans aucun envoi vers Damancom.</li>
            </ul>
          </div>
        </div>

        {/* PIED DE MODALE */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
