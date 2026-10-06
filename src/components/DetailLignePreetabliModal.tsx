import React, { useState } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  User,
  Hash,
  Calendar,
  DollarSign,
  Briefcase,
  Layers,
} from 'lucide-react';
import {
  RapprochementPreetabli,
  LignePreetabliOriginale,
  ChampCandidat,
} from '../types/cnssPreetabli';
import { LigneRegistreCnss, SalarieReferentiel } from '../types/cnss';

interface DetailLignePreetabliModalProps {
  isOpen: boolean;
  rapprochement: RapprochementPreetabli | null;
  ligneOriginale: LignePreetabliOriginale | null;
  champsCandidats: ChampCandidat[];
  ligneRegistreAssociee?: LigneRegistreCnss;
  baseSalaries: SalarieReferentiel[];
  onClose: () => void;
  onValiderDecision: (
    ligneId: string,
    action: 'VALIDER' | 'IGNORER' | 'ASSOCIER_SALARIE',
    salarieCibleId?: string,
    motif?: string
  ) => void;
}

export const DetailLignePreetabliModal: React.FC<DetailLignePreetabliModalProps> = ({
  isOpen,
  rapprochement,
  ligneOriginale,
  champsCandidats,
  ligneRegistreAssociee,
  baseSalaries,
  onClose,
  onValiderDecision,
}) => {
  const [salarieManuelId, setSalarieManuelId] = useState<string>('');
  const [motifDecision, setMotifDecision] = useState<string>('');
  const [afficherRattachementManuel, setAfficherRattachementManuel] = useState(false);

  if (!isOpen || !rapprochement || !ligneOriginale) return null;

  const handleConfirmerValidation = () => {
    onValiderDecision(
      rapprochement.id,
      'VALIDER',
      rapprochement.salarieId,
      motifDecision || 'Concordance vérifiée et validée'
    );
    onClose();
  };

  const handleIgnorer = () => {
    onValiderDecision(
      rapprochement.id,
      'IGNORER',
      undefined,
      motifDecision || 'Ligne ignorée après examen'
    );
    onClose();
  };

  const handleAssocierManuel = () => {
    if (!salarieManuelId) return;
    onValiderDecision(
      rapprochement.id,
      'ASSOCIER_SALARIE',
      salarieManuelId,
      motifDecision || 'Association manuelle gestionnaire'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* EN-TÊTE DE LA MODALE */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Comparaison Face-à-Face : Préétabli CNSS ↔ Registre MULT.S
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-slate-200 text-slate-800">
                  Ligne source n°{ligneOriginale.numeroLigne}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Inspection granulaire &bull; Données originales protégées en lecture seule
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
        <div className="p-6 overflow-y-auto space-y-6">
          {/* STATUT DU RAPPROCHEMENT */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Statut du rapprochement :</span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-black ${
                rapprochement.statut === 'IDENTIFIE' || rapprochement.statut === 'VALIDÉ'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : rapprochement.statut === 'AMBIGU'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : rapprochement.statut === 'INCOHERENT'
                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {rapprochement.statut}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (Méthode : {rapprochement.methode} &bull; Score : {rapprochement.score}%)
              </span>
            </div>

            {rapprochement.valideParHumain && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Validé manuellement
              </span>
            )}
          </div>

          {/* COMPARAISON FACE-À-FACE (SECTION 31) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* COLONNE A : PRÉÉTABLI ORIGINAL */}
            <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-black text-xs text-indigo-950 uppercase tracking-wider">
                    COLONNE A &bull; PRÉÉTABLI ORIGINAL
                  </h4>
                </div>
                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  Ligne {ligneOriginale.numeroLigne} ({ligneOriginale.longueur} car.)
                </span>
              </div>

              {/* Contenu brut */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Enregistrement brut</span>
                <div className="bg-slate-900 text-emerald-400 font-mono text-[11px] p-2.5 rounded-xl overflow-x-auto whitespace-pre border border-slate-800">
                  {ligneOriginale.contenuOriginal}
                </div>
              </div>

              {/* Valeurs décodées */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">CNSS Candidat</span>
                  <span className="font-mono font-bold text-slate-900">
                    {rapprochement.preetabliCnss || 'Non détecté'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">CNI Candidate</span>
                  <span className="font-mono font-bold text-slate-900">
                    {rapprochement.preetabliCni || 'Non détectée'}
                  </span>
                </div>

                <div className="col-span-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Nom Candidat</span>
                  <span className="font-bold text-slate-900">
                    {rapprochement.preetabliNom || 'Non détecté'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Jours Candidats</span>
                  <span className="font-mono font-bold text-slate-900">
                    {rapprochement.preetabliJours !== undefined ? `${rapprochement.preetabliJours} j` : '-'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Situation</span>
                  <span className="font-mono font-bold text-slate-900">
                    {rapprochement.preetabliSituation || '(vide)'}
                  </span>
                </div>
              </div>
            </div>

            {/* COLONNE B : REGISTRE MULT.S */}
            <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <h4 className="font-black text-xs text-teal-950 uppercase tracking-wider">
                    COLONNE B &bull; REGISTRE MULT.S
                  </h4>
                </div>
                {ligneRegistreAssociee ? (
                  <span className="text-[10px] font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-bold">
                    Statut: {ligneRegistreAssociee.statut}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold">
                    Aucun salarié rattaché
                  </span>
                )}
              </div>

              {ligneRegistreAssociee ? (
                <div className="space-y-3">
                  <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200">
                    <span className="text-[10px] font-bold text-teal-800 block uppercase">Salarié Référentiel</span>
                    <div className="text-sm font-black text-teal-950 mt-0.5">
                      {ligneRegistreAssociee.nomOfficiel}
                    </div>
                    {ligneRegistreAssociee.nomSource !== ligneRegistreAssociee.nomOfficiel && (
                      <div className="text-[11px] text-teal-700 font-mono">
                        Source paie : {ligneRegistreAssociee.nomSource}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">CNSS Référentiel</span>
                      <span className="font-mono font-bold text-slate-900">
                        {ligneRegistreAssociee.cnss || 'MANQUANT'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">CNI Référentiel</span>
                      <span className="font-mono font-bold text-slate-900">
                        {ligneRegistreAssociee.cni || 'MANQUANT'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Jours Déclarés</span>
                      <span className="font-mono font-bold text-slate-900">
                        {ligneRegistreAssociee.joursDeclares} j
                      </span>
                      {ligneRegistreAssociee.joursDeclares !== ligneRegistreAssociee.joursImportes && (
                        <div className="text-[10px] text-amber-600 font-semibold">
                          (Source paie: {ligneRegistreAssociee.joursImportes} j)
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Situation</span>
                      <span className="font-mono font-bold text-slate-900">
                        {ligneRegistreAssociee.situation || 'ACTIF'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Brut Déclaré</span>
                      <span className="font-mono font-bold text-slate-900">
                        {ligneRegistreAssociee.salaireBrutDeclare.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Base Plafonnée</span>
                      <span className="font-mono font-bold text-slate-900">
                        {ligneRegistreAssociee.baseDeclaree.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    Ce salarié du préétabli n'est pas encore identifié dans le registre MULT.S.
                  </p>
                  <button
                    onClick={() => setAfficherRattachementManuel(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Rattacher manuellement
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DIFFÉRENCES DÉTECTÉES */}
          {rapprochement.differences.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Différences constatées entre le Préétabli et le Registre MULT.S
              </span>
              <div className="space-y-1.5 text-xs">
                {rapprochement.differences.map((diff, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg flex items-center justify-between border ${
                      diff.categorie === 'IDENTIQUE'
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                        : diff.categorie === 'DIFFÉRENT'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono">
                        {diff.champ}
                      </span>
                      <span>{diff.message}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase">
                      {diff.categorie}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RATTACHEMENT MANUEL */}
          {afficherRattachementManuel && (
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950">
                  Sélectionner un salarié dans le référentiel permanent
                </span>
                <button
                  onClick={() => setAfficherRattachementManuel(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Annuler
                </button>
              </div>

              <select
                value={salarieManuelId}
                onChange={e => setSalarieManuelId(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:outline-hidden"
              >
                <option value="">-- Choisir un salarié --</option>
                {baseSalaries.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nomComplet} (CNI: {s.cni || '-'} &bull; CNSS: {s.immatriculationCnss || '-'})
                  </option>
                ))}
              </select>

              <button
                onClick={handleAssocierManuel}
                disabled={!salarieManuelId}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Associer et Valider le Rapprochement
              </button>
            </div>
          )}

          {/* MOTIF DE DÉCISION HUMAINE (SECTION 19) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Justification / Motif de la décision gestionnaire
            </label>
            <input
              type="text"
              value={motifDecision}
              onChange={e => setMotifDecision(e.target.value)}
              placeholder="Ex: Concordance vérifiée avec la fiche matricule..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden"
            />
          </div>
        </div>

        {/* PIED DE MODALE ET ACTIONS HUMAINES */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleIgnorer}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
            >
              Ignorer cette ligne
            </button>

            <button
              onClick={handleConfirmerValidation}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Valider la correspondance</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
