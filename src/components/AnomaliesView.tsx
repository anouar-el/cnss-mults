import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Search,
  Filter,
  Check,
  X,
  FileQuestion,
  Calendar,
  CreditCard,
  Building,
  UserCheck,
  Edit3,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  AnomalieLigne,
  ResultatRapprochement,
  SalarieReferentiel,
  SeveriteAnomalie,
} from '../types/cnss';
import { ModifierAnomalieModal, DonneesModificationAnomalie } from './ModifierAnomalieModal';

interface AnomaliesViewProps {
  anomalies: AnomalieLigne[];
  rapprochements: ResultatRapprochement[];
  baseSalaries?: SalarieReferentiel[];
  onValiderCorrectionJours: (
    idRapprochement: string,
    joursDeclares: number,
    justification: string
  ) => void;
  onCompleterCni: (idRapprochement: string, cni: string) => void;
  onCompleterCnss: (idRapprochement: string, cnss: string) => void;
  onNaviguerVersRapprochement: () => void;
  onSauvegarderModificationsAnomalie?: (
    idRapprochement: string,
    donnees: DonneesModificationAnomalie
  ) => void;
  onChoisirCandidatAmbigu?: (
    idRapprochement: string,
    salarieId: string,
    memoriserAlias: boolean
  ) => void;
}

export const AnomaliesView: React.FC<AnomaliesViewProps> = ({
  anomalies,
  rapprochements,
  baseSalaries = [],
  onValiderCorrectionJours,
  onCompleterCni,
  onCompleterCnss,
  onNaviguerVersRapprochement,
  onSauvegarderModificationsAnomalie,
  onChoisirCandidatAmbigu,
}) => {
  const [filtre, setFiltre] = useState<'TOUTES' | 'BLOQUANTE' | 'AVERTISSEMENT' | 'AMBIGUS' | 'RESOLUE'>('TOUTES');
  const [recherche, setRecherche] = useState('');

  // Modale universelle de modification & résolution d'anomalie
  const [lignePourModification, setLignePourModification] = useState<ResultatRapprochement | null>(null);
  const [anomaliePourModification, setAnomaliePourModification] = useState<AnomalieLigne | null>(null);

  // Modale de traitement d'anomalie de jours
  const [modalJours, setModalJours] = useState<{
    rap: ResultatRapprochement;
    typeAction: 'NEUTRALISER' | 'PLAFONNER_26' | 'AUTRE';
  } | null>(null);
  const [valeurSaisieJours, setValeurSaisieJours] = useState<number>(0);
  const [justificationSaisie, setJustificationSaisie] = useState<string>('');

  // Modale de saisie CNI / CNSS
  const [modalIdentifiant, setModalIdentifiant] = useState<{
    rap: ResultatRapprochement;
    type: 'CNI' | 'CNSS';
  } | null>(null);
  const [valeurIdentifiant, setValeurIdentifiant] = useState('');

  // Compteurs dynamiques (Section 2)
  const totalBloquantes = useMemo(() => anomalies.filter(a => a.gravite === 'BLOQUANTE' && !a.estResolue).length, [anomalies]);
  const totalAvertissements = useMemo(() => anomalies.filter(a => a.gravite === 'AVERTISSEMENT' && !a.estResolue).length, [anomalies]);
  const totalAmbigus = useMemo(() => anomalies.filter(a => a.code === 'CORRESPONDANCE_AMBIGUE' && !a.estResolue).length, [anomalies]);
  const totalResolues = useMemo(() => anomalies.filter(a => a.estResolue).length, [anomalies]);

  // Filtrage
  const anomaliesFiltrees = useMemo(() => {
    return anomalies.filter(a => {
      if (filtre === 'BLOQUANTE' && (a.gravite !== 'BLOQUANTE' || a.estResolue)) return false;
      if (filtre === 'AVERTISSEMENT' && (a.gravite !== 'AVERTISSEMENT' || a.estResolue)) return false;
      if (filtre === 'AMBIGUS' && a.code !== 'CORRESPONDANCE_AMBIGUE') return false;
      if (filtre === 'RESOLUE' && !a.estResolue) return false;

      if (recherche.trim()) {
        const q = recherche.toLowerCase();
        return (
          a.salarieConcerne.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [anomalies, filtre, recherche]);

  // Ouvrir la modale d'arbitrage de jours
  const ouvrirArbitrageJours = (rap: ResultatRapprochement, type: 'NEUTRALISER' | 'PLAFONNER_26' | 'AUTRE') => {
    setModalJours({ rap, typeAction: type });
    if (type === 'NEUTRALISER') {
      setValeurSaisieJours(0);
      setJustificationSaisie('Neutralisation de la régularisation négative pour déclaration BDS CNSS');
    } else if (type === 'PLAFONNER_26') {
      setValeurSaisieJours(26);
      setJustificationSaisie('Plafonnement au maximum légal de 26 jours ouvrables CNSS');
    } else {
      setValeurSaisieJours(rap.validationJours.joursDeclares ?? (rap.validationJours.joursImportes > 0 ? rap.validationJours.joursImportes : 0));
      setJustificationSaisie(rap.validationJours.justification || '');
    }
  };

  const soumettreArbitrageJours = () => {
    if (!modalJours) return;
    onValiderCorrectionJours(modalJours.rap.id, valeurSaisieJours, justificationSaisie || 'Arbitré par le gestionnaire');
    setModalJours(null);
  };

  const soumettreIdentifiant = () => {
    if (!modalIdentifiant) return;
    if (modalIdentifiant.type === 'CNI') {
      onCompleterCni(modalIdentifiant.rap.id, valeurIdentifiant.trim().toUpperCase());
    } else {
      onCompleterCnss(modalIdentifiant.rap.id, valeurIdentifiant.trim());
    }
    setModalIdentifiant(null);
  };

  return (
    <div className="space-y-5">
      {/* 1. EN-TÊTE & COMPTEURS CLÉS (Section 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Contrôles & Anomalies CNSS</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Règle fondamentale : La valeur importée (<strong>joursImportes</strong>) reste strictement intouchable. Toute correction alimente les <strong>joursDeclares</strong> avec justification traçable.
            </p>
          </div>

          {/* Filtres de sévérité */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFiltre('TOUTES')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filtre === 'TOUTES' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toutes ({anomalies.length})
            </button>
            <button
              onClick={() => setFiltre('BLOQUANTE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filtre === 'BLOQUANTE' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              🔴 Bloquantes ({totalBloquantes})
            </button>
            <button
              onClick={() => setFiltre('AVERTISSEMENT')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filtre === 'AVERTISSEMENT' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              🟠 Avertissements ({totalAvertissements})
            </button>
            <button
              onClick={() => setFiltre('AMBIGUS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filtre === 'AMBIGUS' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-900 hover:text-amber-950'
              }`}
            >
              ⚡ Ambigus ({totalAmbigus})
            </button>
            <button
              onClick={() => setFiltre('RESOLUE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filtre === 'RESOLUE' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              🟢 Résolues ({totalResolues})
            </button>
          </div>
        </div>

        {/* GUIDE PRATIQUE POUR MODIFIER LES ANOMALIES & CAS AMBIGUS */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Comment modifier les anomalies et cas ambigus ?</strong>
              <span className="text-[11px] text-indigo-800">
                Cliquez sur le bouton <strong>« ✏️ Modifier »</strong> présent sur chaque ligne pour ouvrir le panneau d'édition : ajustement des jours (0 à 26j), saisie de CNI / N° CNSS, choix direct parmi les candidats ambigus ou levée d'anomalie avec justification.
              </span>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filtrer les anomalies par nom de salarié, code ou description..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />
        </div>
      </div>

      {/* 2. TABLEAU DÉTAILLÉ DES CONTRÔLES */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">Salarié Concerné</th>
                <th className="py-3 px-3">Type d'Anomalie</th>
                <th className="py-3 px-3">Gravité</th>
                <th className="py-3 px-3 text-center">Valeur Importée</th>
                <th className="py-3 px-3.5">Détail du Problème</th>
                <th className="py-3 px-3">Statut Résolution</th>
                <th className="py-3 px-3 text-right">Actions de Traitement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anomaliesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    Aucune anomalie à afficher selon les critères sélectionnés.
                  </td>
                </tr>
              ) : (
                anomaliesFiltrees.map((ano) => {
                  const rapLigne = rapprochements.find(r => r.lignePaieId === ano.lignePaieId);

                  return (
                    <tr
                      key={ano.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        ano.estResolue ? 'bg-emerald-50/20' : ano.gravite === 'BLOQUANTE' ? 'bg-rose-50/25' : ''
                      }`}
                    >
                      {/* Salarié */}
                      <td className="py-3.5 px-3.5 font-bold text-slate-900">
                        {ano.salarieConcerne}
                      </td>

                      {/* Code anomalie */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {ano.code}
                        </span>
                      </td>

                      {/* Gravité */}
                      <td className="py-3.5 px-3">
                        {ano.gravite === 'BLOQUANTE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                            🔴 BLOQUANTE
                          </span>
                        ) : ano.gravite === 'AVERTISSEMENT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">
                            🟠 AVERTISSEMENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                            🔵 INFO
                          </span>
                        )}
                      </td>

                      {/* Valeur importée (intacte) */}
                      <td className="py-3.5 px-3 text-center font-mono font-black text-slate-900">
                        {String(ano.valeurOriginale)}
                      </td>

                      {/* Message / Règle CNSS */}
                      <td className="py-3.5 px-3.5 text-slate-600 max-w-sm">
                        {ano.message}
                      </td>

                      {/* Statut résolution */}
                      <td className="py-3.5 px-3">
                        {ano.estResolue ? (
                          <div className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                            <Check className="w-3.5 h-3.5" />
                            <span>Résolue</span>
                            {ano.actionResolution && (
                              <span className="text-[10px] text-slate-500 font-normal block">
                                ({ano.actionResolution})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-rose-700 font-bold text-[11px] flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Non résolue</span>
                          </span>
                        )}
                      </td>

                      {/* Actions spécifiques par code & bouton Modifier universel */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* BOUTON MODIFIER UNIVERSEL */}
                          {rapLigne && (
                            <button
                              type="button"
                              onClick={() => {
                                setLignePourModification(rapLigne);
                                setAnomaliePourModification(ano);
                              }}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer shadow-2xs flex items-center gap-1 transition-colors"
                              title="Modifier cette anomalie (jours, identité, arbitrage ou levée)"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Modifier</span>
                            </button>
                          )}

                          {/* CAS AMBIGUS : Sélection directe 1 clic */}
                          {ano.code === 'CORRESPONDANCE_AMBIGUE' && rapLigne && (
                            <>
                              {((rapLigne.candidats && rapLigne.candidats.length > 0)
                                ? rapLigne.candidats
                                : (rapLigne.candidatsAmbigus || []).map(c => ({ salarie: c.salarie, score: c.score }))
                              ).slice(0, 2).map(c => (
                                <button
                                  key={c.salarie.id}
                                  type="button"
                                  onClick={() => {
                                    if (onChoisirCandidatAmbigu) {
                                      onChoisirCandidatAmbigu(rapLigne.id, c.salarie.id, true);
                                    }
                                  }}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                                  title={`Choisir directement ${c.salarie.nomComplet} (${c.score}%)`}
                                >
                                  <span>✓</span>
                                  <span className="truncate max-w-[90px]">{c.salarie.nomComplet.split(' ')[0]}</span>
                                  <span className="opacity-80">({c.score}%)</span>
                                </button>
                              ))}
                            </>
                          )}

                          {/* 1. CAS JOURS NÉGATIFS (Section 3) */}
                          {ano.code === 'JOURS_NEGATIFS' && rapLigne && (
                            <button
                              onClick={() => ouvrirArbitrageJours(rapLigne, 'NEUTRALISER')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer shadow-2xs"
                              title="Déclarer 0 jour ouvré pour ce mois"
                            >
                              Neutraliser (0 j)
                            </button>
                          )}

                          {/* 2. CAS JOURS > 26 (Section 4) */}
                          {ano.code === 'JOURS_SUPERIEURS_26' && rapLigne && (
                            <button
                              onClick={() => ouvrirArbitrageJours(rapLigne, 'PLAFONNER_26')}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer shadow-2xs"
                              title="Plafonner à 26 jours légaux"
                            >
                              Plafonner (26 j)
                            </button>
                          )}

                          {/* 3. CAS CNI MANQUANTE */}
                          {ano.code === 'CNI_MANQUANTE' && rapLigne && (
                            <button
                              onClick={() => {
                                setModalIdentifiant({ rap: rapLigne, type: 'CNI' });
                                setValeurIdentifiant(rapLigne.cniDeclareeFinale || '');
                              }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              CNI
                            </button>
                          )}

                          {/* 4. CAS CNSS MANQUANTE */}
                          {ano.code === 'CNSS_MANQUANTE' && rapLigne && (
                            <button
                              onClick={() => {
                                setModalIdentifiant({ rap: rapLigne, type: 'CNSS' });
                                setValeurIdentifiant(rapLigne.cnssDeclareeFinale || '');
                              }}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              CNSS
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

      {/* 3. MODALE D'ARBITRAGE DES JOURS (Sections 1, 3, 4) */}
      {modalJours && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">Validation Humaine des Jours Déclarés</h3>
              </div>
              <button
                onClick={() => setModalJours(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">
                  {modalJours.rap.lignePaieId} &bull; {modalJours.rap.salariePropose?.nomComplet || 'Salarié'}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Arbitrage obligatoire : la valeur importée d'origine ne sera pas modifiée.
                </div>
              </div>

              {/* Comparatif STRICT des jours (Section 1) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">
                    joursImportes (Original)
                  </span>
                  <div className="text-2xl font-black text-amber-950 mt-1">
                    {modalJours.rap.validationJours.joursImportes} j
                  </div>
                  <div className="text-[10px] text-amber-700 mt-1">
                    Valeur originale intouchable
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300">
                  <label htmlFor="input-jours-declares" className="text-[10px] uppercase font-bold text-emerald-800 block">
                    joursDeclares (Destination CNSS)
                  </label>
                  <input
                    id="input-jours-declares"
                    type="number"
                    min={0}
                    max={26}
                    value={valeurSaisieJours}
                    onChange={(e) => setValeurSaisieJours(parseInt(e.target.value) || 0)}
                    className="w-full mt-1 text-2xl font-black text-emerald-950 bg-white border border-emerald-400 rounded-lg px-2 py-1 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="text-[10px] text-emerald-700 mt-1">
                    Valeur transmise sur le bordereau
                  </div>
                </div>
              </div>

              {/* Justification obligatoire */}
              <div>
                <label htmlFor="input-justification-jours" className="font-bold text-slate-700 block mb-1">
                  Justification de la décision (Exigée pour l'audit) :
                </label>
                <input
                  id="input-justification-jours"
                  type="text"
                  value={justificationSaisie}
                  onChange={(e) => setJustificationSaisie(e.target.value)}
                  placeholder="Ex: Plafonné à 26 jours standard CNSS, régularisation neutralisée..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              <div className="bg-slate-100 p-2.5 rounded-lg text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Cette validation débloquera le salarié sans jamais écraser les {modalJours.rap.validationJours.joursImportes} jours importés d'origine.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setModalJours(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={soumettreArbitrageJours}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Enregistrer & Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODALE DE SAISIE CNI / CNSS (Sections 7 & 8) */}
      {modalIdentifiant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {modalIdentifiant.type === 'CNI' ? 'Renseigner la CNI' : 'Renseigner l\'Immatriculation CNSS'}
              </h3>
              <button
                onClick={() => setModalIdentifiant(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="text-slate-600">
                Salarié : <strong>{modalIdentifiant.rap.lignePaieId}</strong>
              </div>

              <div>
                <label htmlFor="input-identifiant-valeur" className="font-bold text-slate-700 block mb-1">
                  {modalIdentifiant.type === 'CNI' ? 'Numéro de CNI marocaine :' : 'Numéro d\'immatriculation CNSS (9 chiffres) :'}
                </label>
                <input
                  id="input-identifiant-valeur"
                  type="text"
                  value={valeurIdentifiant}
                  onChange={(e) => setValeurIdentifiant(e.target.value)}
                  placeholder={modalIdentifiant.type === 'CNI' ? 'Ex: WA306471' : 'Ex: 137586052'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-mono text-xs uppercase"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setModalIdentifiant(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={soumettreIdentifiant}
                disabled={!valeurIdentifiant.trim()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE UNIVERSELLE DE MODIFICATION / CORRECTION D'ANOMALIE */}
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
    </div>
  );
};
