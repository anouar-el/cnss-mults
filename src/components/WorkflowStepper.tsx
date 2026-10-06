import React from 'react';
import {
  Upload,
  Eye,
  ArrowRightLeft,
  FileCheck2,
  Cpu,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export interface WorkflowStepperProps {
  etapeCourante: number; // 1 à 10
  onChangerEtape?: (etape: number) => void;
  anomaliesBloquantes: number;
}

const ETAPES = [
  { numero: 1, libelle: 'Import', description: 'Fichier paie Excel/CSV', icon: Upload },
  { numero: 2, libelle: 'Prévisualisation', description: 'Contrôle 10 lignes & Total', icon: Eye },
  { numero: 3, libelle: 'Mapping', description: 'Affectation des colonnes', icon: ArrowRightLeft },
  { numero: 4, libelle: 'Validation Import', description: 'Intégrité des données', icon: FileCheck2 },
  { numero: 5, libelle: 'Normalisation', description: 'Nettoyage technique CNI/CNSS', icon: Cpu },
  { numero: 6, libelle: 'Rapprochement', description: 'Scoring & Alias P1→P5', icon: RefreshCw },
  { numero: 7, libelle: 'Anomalies', description: 'Arbitrage jours >26, négatifs', icon: AlertTriangle },
  { numero: 8, libelle: 'Nouveaux & Sorties', description: 'Entrants & radiations', icon: UserCheck },
  { numero: 9, libelle: 'Vérification', description: 'Contrôle avant déclaration', icon: ShieldCheck },
  { numero: 10, libelle: 'Préparation', description: 'Déclaration mensuelle', icon: FileText },
];

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  etapeCourante,
  onChangerEtape,
  anomaliesBloquantes,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-2xs">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Workflow Mensuel CNSS
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              Étape {etapeCourante} / 10 &bull; {ETAPES[etapeCourante - 1]?.libelle}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            {etapeCourante < 6 ? (
              <span className="text-blue-600 font-semibold">Phase A : Importation et Structuration</span>
            ) : etapeCourante < 9 ? (
              <span className="text-amber-600 font-semibold">Phase B : Rapprochement & Contrôle</span>
            ) : (
              <span className="text-emerald-600 font-semibold">Phase C : Clôture & Préparation</span>
            )}
          </div>
        </div>

        {/* Stepper bar */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
          {ETAPES.map(e => {
            const Icon = e.icon;
            const estComplete = e.numero < etapeCourante;
            const estActive = e.numero === etapeCourante;

            return (
              <button
                key={e.numero}
                onClick={() => onChangerEtape && onChangerEtape(e.numero)}
                disabled={!onChangerEtape}
                title={`Étape ${e.numero}: ${e.libelle} - ${e.description}`}
                className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                  estActive
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-200 font-bold shadow-xs'
                    : estComplete
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-white border-slate-100 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  {estComplete ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Icon className={`w-3.5 h-3.5 ${estActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  )}
                  <span className="text-[10px] font-mono font-bold">
                    {e.numero}
                  </span>
                </div>
                <span className="text-[10px] truncate max-w-full leading-tight font-semibold">
                  {e.libelle}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
