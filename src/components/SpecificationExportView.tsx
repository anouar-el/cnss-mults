import React, { useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ExternalLink,
  Layers,
  BookOpen,
  Info,
  Calendar,
  Lock,
  ArrowRight,
  Database,
  Building2,
  FileCode,
  ShieldAlert,
} from 'lucide-react';
import { LigneRegistreCnss, StatutPeriode } from '../types/cnss';
import { cnssExportSpecService } from '../services/cnssExportSpecService';
import { DefinitionChampExport, StatutCertitude } from '../types/cnssExportSpec';

interface SpecificationExportViewProps {
  moisActif: string;
  statutPeriode: StatutPeriode;
  lignesRegistre: LigneRegistreCnss[];
  onNaviguerVersTestsP7A: () => void;
  onNaviguerVersRegistre: () => void;
}

type SousOngletType = 'MAPPING' | 'SOURCES' | 'CONTROLE_DIRECT' | 'CODES_SITUATION' | 'CADRE_07B';

export const SpecificationExportView: React.FC<SpecificationExportViewProps> = ({
  moisActif,
  statutPeriode,
  lignesRegistre,
  onNaviguerVersTestsP7A,
  onNaviguerVersRegistre,
}) => {
  const [sousOnglet, setSousOnglet] = useState<SousOngletType>('MAPPING');
  const [filtreCertitude, setFiltreCertitude] = useState<'TOUS' | StatutCertitude>('TOUS');

  // Spécification officielle chargée depuis le service
  const specBds = cnssExportSpecService.SPEC_BDS_EDI;
  const matriceErreurs = cnssExportSpecService.MATRICE_ERREURS;

  // Contrôle d'éligibilité en temps réel sur la période courante
  const bilanEligibilite = useMemo(() => {
    return cnssExportSpecService.verifierEligibiliteExport(
      moisActif,
      statutPeriode,
      lignesRegistre
    );
  }, [moisActif, statutPeriode, lignesRegistre]);

  const champsFiltres = useMemo(() => {
    if (filtreCertitude === 'TOUS') return specBds.champs;
    return specBds.champs.filter(c => c.statutCertitude === filtreCertitude);
  }, [specBds, filtreCertitude]);

  const getBadgeCertitude = (statut: StatutCertitude) => {
    switch (statut) {
      case 'CONFIRME':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            CONFIRMÉ
          </span>
        );
      case 'SOURCE_SECONDAIRE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
            <Info className="w-3 h-3 text-blue-600" />
            SOURCE SECONDAIRE
          </span>
        );
      case 'A_CONFIRMER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            À CONFIRMER
          </span>
        );
      case 'NON_DOCUMENTEE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-700 border border-slate-300">
            NON DOCUMENTÉE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. EN-TÊTE DE LA SPÉCIFICATION (PROMPT 07-A) */}
      <div className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300 uppercase tracking-wider">
                PROMPT 07-A &bull; ÉTUDE, MAPPING & CONTRÔLE D'EXPORT
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                Spécification v{specBds.version}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Phase Analyse &bull; Aucun envoi à Damancom
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Spécification Technique d'Export CNSS / Damancom
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Étude exhaustive du format de déclaration des salaires (BDS), cartographie des champs, règles de conformité légale marocaine (plafonnement 26 jours, base 6 000 MAD) et contrôle préalable d'éligibilité en lecture seule.
            </p>
          </div>

          {/* BADGE D'ÉLIGIBILITÉ DU MOIS EN DIRECT */}
          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            <div className={`p-4 rounded-xl border text-center min-w-[200px] ${
              bilanEligibilite.estEligible
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wide">
                {bilanEligibilite.estEligible ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Mois Éligible à l'Export</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>{bilanEligibilite.erreursBloquantes.length} Erreur(s) Bloquante(s)</span>
                  </>
                )}
              </div>
              <div className="text-lg font-black mt-1">
                {bilanEligibilite.lignesEligibles} / {bilanEligibilite.totalLignes} salariés conformes
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Période {moisActif} ({statutPeriode})
              </div>
            </div>

            <button
              onClick={onNaviguerVersTestsP7A}
              className="w-full sm:w-auto px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-indigo-200" />
              <span>Banc Tests 07-A (15/15)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION PAR SOUS-ONGLETS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSousOnglet('MAPPING')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'MAPPING'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Table de Mapping ({specBds.champs.length} champs)</span>
        </button>

        <button
          onClick={() => setSousOnglet('CONTROLE_DIRECT')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'CONTROLE_DIRECT'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit d'Éligibilité en Direct</span>
          {!bilanEligibilite.estEligible && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
              {bilanEligibilite.erreursBloquantes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSousOnglet('SOURCES')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'SOURCES'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Rapport des Sources Officielles</span>
        </button>

        <button
          onClick={() => setSousOnglet('CODES_SITUATION')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'CODES_SITUATION'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Codes de Situation CNSS</span>
        </button>

        <button
          onClick={() => setSousOnglet('CADRE_07B')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'CADRE_07B'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Cahier des Charges PROMPT 07-B</span>
        </button>
      </div>

      {/* 3. CONTENU DU SOUS-ONGLET SÉLECTIONNÉ */}

      {/* A. TABLE DE MAPPING DÉTERMINISTE */}
      {sousOnglet === 'MAPPING' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Cartographie Fichier BDS Déclaration des Salaires ({specBds.formatCible})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque champ officiel CNSS est sourcé depuis une donnée validée du Registre CNSS MULT.S sans aucune invention.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Filtrer par certitude :</span>
              <select
                value={filtreCertitude}
                onChange={e => setFiltreCertitude(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="TOUS">Tous les niveaux</option>
                <option value="CONFIRME">Confirmé uniquement</option>
                <option value="SOURCE_SECONDAIRE">Source secondaire</option>
                <option value="A_CONFIRMER">À confirmer</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4">Champ Officiel CNSS</th>
                    <th className="py-3 px-3 text-center">Type</th>
                    <th className="py-3 px-3 text-center">Obligatoire</th>
                    <th className="py-3 px-4">Format Légal Attendu</th>
                    <th className="py-3 px-3 text-center">Longueur</th>
                    <th className="py-3 px-4 font-mono">Source Registre MULT.S</th>
                    <th className="py-3 px-3 text-center">Certitude</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {champsFiltres.map((champ: DefinitionChampExport) => (
                    <tr key={champ.position} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-400">
                        {champ.position}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {champ.champOfficiel}
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5 font-sans">
                          {champ.remarques}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                          {champ.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {champ.obligatoire ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                            OUI
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            NON
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-sans text-[11px]">
                        {champ.formatAttendu}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono text-slate-700">
                        {champ.longueurFixe ? `${champ.longueurFixe} car. (fixe)` : champ.longueurMax ? `≤ ${champ.longueurMax} car.` : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-700 font-bold bg-indigo-50/30">
                        {champ.sourceRegistreMultS}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {getBadgeCertitude(champ.statutCertitude)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* B. AUDIT D'ÉLIGIBILITÉ EN DIRECT */}
      {sousOnglet === 'CONTROLE_DIRECT' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Audit d'Éligibilité Export pour le mois de {moisActif}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ce moteur de vérification simule le passage au crible de l'ensemble des 13 règles de blocage d'export sur les données actuelles du registre.
                </p>
              </div>

              <button
                onClick={onNaviguerVersRegistre}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>Accéder au Registre CNSS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Salariés</span>
                <span className="text-2xl font-black text-slate-900">{bilanEligibilite.totalLignes}</span>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">Conformes & Éligibles</span>
                <span className="text-2xl font-black text-emerald-700">{bilanEligibilite.lignesEligibles}</span>
              </div>

              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
                <span className="text-[10px] font-bold uppercase text-rose-700 block">Bloquants pour l'Export</span>
                <span className="text-2xl font-black text-rose-700">{bilanEligibilite.lignesBloquantes}</span>
              </div>

              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 text-center">
                <span className="text-[10px] font-bold uppercase text-indigo-700 block">Statut Global</span>
                <span className={`text-xs font-black inline-block mt-2 px-2.5 py-1 rounded-full ${
                  bilanEligibilite.estEligible
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}>
                  {bilanEligibilite.estEligible ? 'PRÊT POUR EXPORT' : 'BLOQUÉ'}
                </span>
              </div>
            </div>
          </div>

          {/* DÉTAIL DES ERREURS BLOQUANTES D'EXPORT */}
          {bilanEligibilite.erreursBloquantes.length > 0 && (
            <div className="bg-rose-50 rounded-2xl border border-rose-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Erreurs Bloquantes Détectées ({bilanEligibilite.erreursBloquantes.length})</span>
              </div>
              <p className="text-xs text-rose-800">
                La déclaration ne pourra pas être générée tant que ces anomalies subsistent dans le Registre CNSS ou dans le paramétrage du mois :
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {bilanEligibilite.erreursBloquantes.map((err, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-xl border border-rose-300 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono">
                        {err.code}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {err.salarie}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700">
                      {err.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MATRICE COMPLÈTE DES 13 RÈGLES D'EXPORT */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Référentiel des 13 Règles de Blocage d'Export (Section 21)
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {matriceErreurs.map((regle) => (
                <div key={regle.code} className="py-2.5 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700 text-[11px]">{regle.code}</span>
                      <span className="font-semibold text-slate-900">&bull; {regle.intitule}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Action requise : {regle.actionCorrective}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 shrink-0">
                    BLOQUANTE
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* C. RAPPORT DES SOURCES OFFICIELLES */}
      {sousOnglet === 'SOURCES' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Inventaire & Évaluation des Sources Officielles et Règlementaires
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Conformément à la règle de non-invention, chaque règle technique appliquée dans le projet est adossée à une source qualifiée.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source 1 */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Portail Damancom — Guide Utilisateur EDI</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                    CONFIRMÉ
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Documentation officielle CNSS Maroc relative à l'Échange de Données Informatisé. Définit la structure du fichier BDS plat, l'absence d'accents et la gestion des rejets.
                </p>
              </div>

              {/* Source 2 */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Dahir n° 1-72-184 &bull; Code Sécurité Sociale</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                    CONFIRMÉ
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Législation officielle régissant le régime de sécurité sociale des salariés au Maroc. Établit le plafonnement mensuel strict à 26 jours ouvrables par salarié.
                </p>
              </div>

              {/* Source 3 */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Décret n° 2-02-710 &bull; Plafonnement CNSS</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                    CONFIRMÉ
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Décret fixant le plafond de rémunération soumis à cotisation pour les prestations CNSS à 6 000,00 MAD mensuels par travailleur.
                </p>
              </div>

              {/* Source 4 */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Guide BDSE Réf. 512-1-10 (Entrants)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                    CONFIRMÉ
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Procédure officielle d'immatriculation préalable des nouveaux salariés. Confirme que les salariés sans immatriculation sont exclus du BDS principal.
                </p>
              </div>

              {/* Source 5 */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">Pratiques Éditeurs Paie (Sage, Silae RH)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800">
                    SOURCE SECONDAIRE
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Pratique établie sur le marché marocain pour la conversion des montants décimaux, encodage des retours chariot et gestion des caractères spéciaux.
                </p>
              </div>

              {/* Source 6 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">API Web Services Machine-to-Machine</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-700">
                    NON DOCUMENTÉE
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Les interfaces directes API Damancom ne font l'objet d'aucune documentation publique ouverte. Seul le flux de fichiers plats EDI est accessible.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D. CODES DE SITUATION CNSS */}
      {sousOnglet === 'CODES_SITUATION' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Table Officielle des Codes de Situation Salarié CNSS
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                La CNSS requiert un code de situation à 2 lettres pour motiver les absences de cotisation ou mouvements en cours de mois.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-center">Code CNSS</th>
                    <th className="py-3 px-4">Libellé Officiel</th>
                    <th className="py-3 px-4">Équivalent MULT.S</th>
                    <th className="py-3 px-3 text-center">Jours Autorisés</th>
                    <th className="py-3 px-4">Règle Métier & Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">(vide)</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Salarié actif normal</td>
                    <td className="py-3 px-4 font-mono text-indigo-700">ACTIF / NOUVEAU</td>
                    <td className="py-3 px-3 text-center font-mono">1 à 26 jours</td>
                    <td className="py-3 px-4 text-slate-600">Salarié présent sans incident de paie durant le mois.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-black text-rose-700 bg-rose-50">SO</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Sortant (Départ, Démission, Fin CDD)</td>
                    <td className="py-3 px-4 font-mono text-rose-700">SORTI / SORTIE</td>
                    <td className="py-3 px-3 text-center font-mono">0 à 26 jours</td>
                    <td className="py-3 px-4 text-slate-600">Doit être arbitré dans l'onglet Sorties avant déclaration.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-black text-amber-700 bg-amber-50">CO</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Congé sans solde</td>
                    <td className="py-3 px-4 font-mono text-amber-700">CONGE_SANS_SOLDE</td>
                    <td className="py-3 px-3 text-center font-mono">0 jour</td>
                    <td className="py-3 px-4 text-slate-600">Maintient l'immatriculation sans générer d'assiette cotisable.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-black text-blue-700 bg-blue-50">AT</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Accident de travail</td>
                    <td className="py-3 px-4 font-mono text-blue-700">ACCIDENT_TRAVAIL</td>
                    <td className="py-3 px-3 text-center font-mono">0 à 26 jours</td>
                    <td className="py-3 px-4 text-slate-600">Justifie la prise en charge par l'assurance accident.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-black text-purple-700 bg-purple-50">ML</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Maladie ordinaire</td>
                    <td className="py-3 px-4 font-mono text-purple-700">MALADIE</td>
                    <td className="py-3 px-3 text-center font-mono">0 à 26 jours</td>
                    <td className="py-3 px-4 text-slate-600">Permet le versement d'indemnités journalières de maladie.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-black text-pink-700 bg-pink-50">MT</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Maternité</td>
                    <td className="py-3 px-4 font-mono text-pink-700">MATERNITE</td>
                    <td className="py-3 px-3 text-center font-mono">0 jour</td>
                    <td className="py-3 px-4 text-slate-600">Suspension légale pour congé maternité indemnisé par CNSS.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-black text-slate-700 bg-slate-100">DE</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Salarié décédé</td>
                    <td className="py-3 px-4 font-mono text-slate-700">DECES</td>
                    <td className="py-3 px-3 text-center font-mono">0 jour</td>
                    <td className="py-3 px-4 text-slate-600">Radiation définitive du compte d'assurance maladie et retraite.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* E. CAHIER DES CHARGES POUR PROMPT 07-B */}
      {sousOnglet === 'CADRE_07B' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Spécifications et Prérequis pour le PROMPT 07-B (Génération Fichier)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                La phase 07-B assurera la génération concrète du fichier texte BDS sur la base stricte de la présente étude.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-1">
                <span className="font-bold text-indigo-950">1. Découplage Total & Immuabilité</span>
                <p>
                  La génération d'un export n'altère jamais les objets du Registre ni les fiches de paie. Le service d'export lira les données scellées sans effet de bord.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-1">
                <span className="font-bold text-indigo-950">2. Contrôle Préalable Systématique</span>
                <p>
                  Toute tentative d'export appellera obligatoirement <code className="bg-white px-1.5 py-0.5 rounded font-mono text-indigo-800">cnssExportSpecService.verifierEligibiliteExport(...)</code>. Si le registre contient ne serait-ce qu'une seule anomalie bloquante, l'export sera rejeté avec le rapport d'erreurs.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-1">
                <span className="font-bold text-indigo-950">3. Convention de Nommage & Traçabilité Audit</span>
                <p>
                  Le fichier portera le nom normalisé <code className="bg-white px-1.5 py-0.5 rounded font-mono text-indigo-800">DS_[numAffiliation]_[YYYYMM].txt</code> et chaque téléchargement créera un événement d'audit irréversible avec l'horodatage précis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
