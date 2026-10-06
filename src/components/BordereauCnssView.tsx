/**
 * Vue Principale du Bordereau de Déclaration des Salariés CNSS MULT.S
 * PROMPT 07-B — Gestion, Contrôle d'Éligibilité, Paramétrage Entreprise,
 * Génération, Validation Humaine et Export des formulaires F.212-2-58 et F.212-2-59.
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Lock,
  Unlock,
  Printer,
  Download,
  Eye,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  Info,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserPlus,
  Hash,
} from 'lucide-react';
import { LigneRegistreCnss, StatutPeriode } from '../types/cnss';
import {
  EntrepriseCnssConfig,
  DocumentBordereauCnss,
  BilanEligibiliteBordereau,
} from '../types/cnssBordereau';
import { cnssBordereauService } from '../services/cnssBordereauService';
import { persistenceService } from '../services/persistenceService';
import { ApercuBordereauCnss } from './ApercuBordereauCnss';

interface BordereauCnssViewProps {
  moisActif: string;
  statutPeriode: StatutPeriode;
  lignesRegistre: LigneRegistreCnss[];
  onNaviguerVersRegistre: () => void;
  onNaviguerVersTestsP7B: () => void;
}

export const BordereauCnssView: React.FC<BordereauCnssViewProps> = ({
  moisActif,
  statutPeriode,
  lignesRegistre,
  onNaviguerVersRegistre,
  onNaviguerVersTestsP7B,
}) => {
  // Configuration entreprise persistée
  const [config, setConfig] = useState<EntrepriseCnssConfig>(() =>
    persistenceService.getEntrepriseConfig()
  );

  // Document bordereau généré persisté
  const [documentBordereau, setDocumentBordereau] = useState<DocumentBordereauCnss | null>(() =>
    persistenceService.getBordereauPeriode(moisActif)
  );

  // Onglet interne de vue
  const [sousOnglet, setSousOnglet] = useState<'ORDINAIRES' | 'ENTRANTS' | 'CONFIG' | 'ELIGIBILITE'>('ORDINAIRES');

  // Affichage plein écran de l'aperçu officiel imprimable
  const [isApercuModalOpen, setIsApercuModalOpen] = useState(false);

  // État du formulaire de configuration
  const [configTemp, setConfigTemp] = useState<EntrepriseCnssConfig>(config);
  const [messageConfig, setMessageConfig] = useState<string | null>(null);

  // Pagination locale pour l'affichage tableau
  const [pageOrdinaireIndex, setPageOrdinaireIndex] = useState(0);
  const [pageEntrantIndex, setPageEntrantIndex] = useState(0);

  // Calcul dynamique de l'éligibilité
  const bilanEligibilite: BilanEligibiliteBordereau = useMemo(() => {
    return cnssBordereauService.verifierEligibiliteBordereau(lignesRegistre, config, moisActif);
  }, [lignesRegistre, config, moisActif]);

  // Handler de sauvegarde de la configuration entreprise
  const handleSauvegarderConfig = (e: React.FormEvent) => {
    e.preventDefault();
    persistenceService.saveEntrepriseConfig(configTemp);
    setConfig(configTemp);
    setMessageConfig('Paramètres entreprise enregistrés avec succès.');
    setTimeout(() => setMessageConfig(null), 3000);
  };

  // Handler de génération du bordereau
  const handleGenererBordereau = () => {
    const res = cnssBordereauService.genererBordereau(
      lignesRegistre,
      config,
      moisActif,
      'Gestionnaire MULT.S'
    );

    if (res.succes && res.document) {
      setDocumentBordereau(res.document);
      persistenceService.saveBordereauPeriode(moisActif, res.document);
      setPageOrdinaireIndex(0);
      setPageEntrantIndex(0);
    }
  };

  // Handler de validation humaine formelle
  const handleValiderBordereau = () => {
    if (!documentBordereau) return;
    const docValide = cnssBordereauService.validerBordereau(documentBordereau, 'Responsable RH MULT.S');
    setDocumentBordereau(docValide);
    persistenceService.saveBordereauPeriode(moisActif, docValide);

    // Enregistrer l'événement d'audit
    persistenceService.enregistrerEvenementAudit({
      id: docValide.auditId || `audit_bds_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'VALIDATION_REGISTRE',
      salarie: 'Tous salariés',
      utilisateur: 'Responsable RH MULT.S',
      nouvelleValeur: `Bordereau ${docValide.idExport} validé et scellé`,
      justification: `Validation formelle du Bordereau de déclaration CNSS (${docValide.totalSalariesDeclares} salariés, ${docValide.totalJoursDeclares} j)`,
    });
  };

  // Téléchargement des CSV administratifs
  const handleTelechargerCsvOrdinaires = () => {
    if (!documentBordereau) return;
    const csv = cnssBordereauService.exporterBordereauOrdinairesCsv(documentBordereau);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BDS_${documentBordereau.entreprise.numeroAffiliation}_${moisActif}_ORDINAIRES.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTelechargerCsvEntrants = () => {
    if (!documentBordereau) return;
    const csv = cnssBordereauService.exporterBordereauEntrantsCsv(documentBordereau);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BDS_${documentBordereau.entreprise.numeroAffiliation}_${moisActif}_ENTRANTS.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTelechargerJsonAudit = () => {
    if (!documentBordereau) return;
    const json = JSON.stringify(documentBordereau, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BDS_${documentBordereau.entreprise.numeroAffiliation}_${moisActif}_METADONNEES.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pagesOrdinaires = documentBordereau?.bordereauOrdinaires.pages || [];
  const pagesEntrants = documentBordereau?.bordereauEntrants.pages || [];

  const pageOrdinaireCourante = pagesOrdinaires[pageOrdinaireIndex] || pagesOrdinaires[0];
  const pageEntrantCourante = pagesEntrants[pageEntrantIndex] || pagesEntrants[0];

  return (
    <div className="space-y-6">
      {/* BANDEAU SUPÉRIEUR — IDENTITÉ DU BORDEREAU & CONTRÔLE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Bordereau de Déclaration des Salariés CNSS
                </h2>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                  PROMPT 07-B
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                  Formulaires F.212-2-58 &bull; F.212-2-59
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Moteur d'édition administratif projeté à partir du Registre CNSS validé. Distinction stricte entre les salariés ordinaires (F.212-2-58) et les nouveaux entrants (F.212-2-59 avec CNI).
              </p>
            </div>
          </div>

          {/* ACTIONS PRINCIPALES */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onNaviguerVersTestsP7B}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <span>🔬 Tests 07-B (24/24)</span>
            </button>

            <button
              onClick={() => setSousOnglet('CONFIG')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Paramètres Entreprise</span>
            </button>

            <button
              onClick={handleGenererBordereau}
              disabled={!bilanEligibilite.estEligible}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Générer le Bordereau</span>
            </button>
          </div>
        </div>

        {/* ALERTE STRICTE DE SÉPARATION AVEC LE PAIEMENT */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>Règle de séparation stricte CNSS :</strong> Ce moteur génère exclusivement le <em>Bordereau de Déclaration des Salariés</em> (nom, CNSS, CNI, jours et situation). Le <em>Bordereau de Paiement des Cotisations</em> (masses salariales, taux et montant du versement) est un module indépendant qui fera l'objet d'une phase distincte.
          </div>
        </div>
      </div>

      {/* BILAN D'ÉLIGIBILITÉ DU REGISTRE */}
      {!bilanEligibilite.estEligible && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-5 text-rose-950 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-sm text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Génération bloquée : Conditions obligatoires non satisfaites ({bilanEligibilite.bloquants.length})</span>
            </div>
            <button
              onClick={onNaviguerVersRegistre}
              className="text-xs font-bold text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Accéder au Registre CNSS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <ul className="text-xs space-y-1.5 list-disc pl-5 font-medium text-rose-900">
            {bilanEligibilite.bloquants.slice(0, 6).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {bilanEligibilite.bloquants.length > 6 && (
              <li className="font-bold text-rose-700">
                ... et {bilanEligibilite.bloquants.length - 6} autre(s) condition(s) à régulariser.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* RÉSUMÉ DU BORDEREAU GÉNÉRÉ */}
      {documentBordereau && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Document Actif &bull; Période {documentBordereau.mois}/{documentBordereau.annee}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  documentBordereau.statut === 'VALIDE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {documentBordereau.statut === 'VALIDE' ? 'VERROUILLÉ & VALIDÉ' : 'BROUILLON CONFORME'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-800 mt-1">
                <span>Réf. structurée : <strong className="font-mono text-purple-700">{documentBordereau.referenceStructuree}</strong></span>
                <span>Affiliation : <strong className="font-mono">{documentBordereau.entreprise.numeroAffiliation}</strong></span>
                <span>Agence : <strong>{documentBordereau.entreprise.agence}</strong></span>
              </div>
            </div>

            {/* BOUTONS D'EXPORT & VALIDATION */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsApercuModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Aperçu Officiel & Impression</span>
              </button>

              {documentBordereau.statut !== 'VALIDE' && (
                <button
                  onClick={handleValiderBordereau}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Valider le Bordereau</span>
                </button>
              )}

              <button
                onClick={handleTelechargerCsvOrdinaires}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer"
                title="Export CSV Salariés Ordinaires (F.212-2-58)"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>CSV Ordinaires</span>
              </button>

              <button
                onClick={handleTelechargerCsvEntrants}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer"
                title="Export CSV Salariés Entrants (F.212-2-59)"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>CSV Entrants</span>
              </button>
            </div>
          </div>

          {/* INDICATEURS CHIFFRÉS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Déclarés</span>
              <span className="text-xl font-black text-slate-900">{documentBordereau.totalSalariesDeclares}</span>
            </div>
            <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200 text-center">
              <span className="text-[10px] uppercase font-bold text-purple-700 block">Ordinaires (F.212-2-58)</span>
              <span className="text-xl font-black text-purple-900">{documentBordereau.nombreSalariesOrdinaires}</span>
            </div>
            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">Entrants (F.212-2-59)</span>
              <span className="text-xl font-black text-blue-900">{documentBordereau.nombreSalariesEntrants}</span>
            </div>
            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Jours</span>
              <span className="text-xl font-black text-emerald-900">{documentBordereau.totalJoursDeclares} j</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Pagination Totale</span>
              <span className="text-xl font-black text-slate-900">{documentBordereau.totalPages} pages</span>
            </div>
          </div>
        </div>
      )}

      {/* ONGLETS INTERNES */}
      <div className="border-b border-slate-200 flex space-x-2 text-xs font-bold">
        <button
          onClick={() => setSousOnglet('ORDINAIRES')}
          className={`py-2 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            sousOnglet === 'ORDINAIRES'
              ? 'border-purple-600 text-purple-700 bg-purple-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-purple-600" />
          <span>Bordereau Salariés Ordinaires (F.212-2-58)</span>
          {documentBordereau && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
              {documentBordereau.nombreSalariesOrdinaires}
            </span>
          )}
        </button>

        <button
          onClick={() => setSousOnglet('ENTRANTS')}
          className={`py-2 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            sousOnglet === 'ENTRANTS'
              ? 'border-purple-600 text-purple-700 bg-purple-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4 text-blue-600" />
          <span>Bordereau Salariés Entrants (F.212-2-59)</span>
          {documentBordereau && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
              {documentBordereau.nombreSalariesEntrants}
            </span>
          )}
        </button>

        <button
          onClick={() => setSousOnglet('CONFIG')}
          className={`py-2 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            sousOnglet === 'CONFIG'
              ? 'border-purple-600 text-purple-700 bg-purple-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-slate-500" />
          <span>Paramètres Entreprise</span>
        </button>

        <button
          onClick={() => setSousOnglet('ELIGIBILITE')}
          className={`py-2 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            sousOnglet === 'ELIGIBILITE'
              ? 'border-purple-600 text-purple-700 bg-purple-50/40'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Contrôles d'Éligibilité</span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
            bilanEligibilite.estEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {bilanEligibilite.estEligible ? 'CONFORME' : `${bilanEligibilite.bloquants.length} BLOQUANT`}
          </span>
        </button>
      </div>

      {/* CONTENU SELON LE SOUS-ONGLET */}

      {/* 1. TABLEAU DES SALARIÉS ORDINAIRES */}
      {sousOnglet === 'ORDINAIRES' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Bordereau des Salariés Ordinaires & Sortants (Formulaire F.212-2-58)
              </h3>
              <p className="text-xs text-slate-500">
                Projection des salariés affiliés et sortants validés (situation SO). Paginé à {config.lignesParPage} salariés par page.
              </p>
            </div>

            {/* CONTRÔLE DE PAGINATION */}
            {pagesOrdinaires.length > 1 && (
              <div className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-xl">
                <button
                  disabled={pageOrdinaireIndex === 0}
                  onClick={() => setPageOrdinaireIndex(p => Math.max(0, p - 1))}
                  className="p-1 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  Page {pageOrdinaireIndex + 1} sur {pagesOrdinaires.length}
                </span>
                <button
                  disabled={pageOrdinaireIndex >= pagesOrdinaires.length - 1}
                  onClick={() => setPageOrdinaireIndex(p => Math.min(pagesOrdinaires.length - 1, p + 1))}
                  className="p-1 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {!documentBordereau ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Aucun bordereau n'a encore été généré. Cliquez sur « Générer le Bordereau » ci-dessus.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[10px] font-black">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">N° Immatriculé (CNSS)</th>
                      <th className="py-2.5 px-3">Nom et Prénom</th>
                      <th className="py-2.5 px-3 text-center">Nombre de Jours</th>
                      <th className="py-2.5 px-3 text-center">Situation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageOrdinaireCourante?.lignes.map(ligne => (
                      <tr key={ligne.ligneRegistreId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{ligne.index}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ligne.numeroImmatriculation}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-950 uppercase">{ligne.nomPrenom}</td>
                        <td className="py-2.5 px-3 font-mono text-center font-bold text-purple-700">
                          {ligne.nombreJours}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {ligne.situation ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800">
                              {ligne.situation} ({ligne.situationLibelle || 'Sorti'})
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTAUX DE PAGE */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs font-bold text-slate-700">
                <span>Page {pageOrdinaireCourante?.numeroPage || 1} / {pageOrdinaireCourante?.totalPages || 1}</span>
                <div className="flex items-center gap-6">
                  <span>Jours de la page : <strong>{pageOrdinaireCourante?.totalJoursPage || 0} j</strong></span>
                  <span>Cumul précédent : <strong>{pageOrdinaireCourante?.totalJoursCumulePrecedents || 0} j</strong></span>
                  <span className="text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded">
                    Cumul Global : <strong>{pageOrdinaireCourante?.totalJoursCumuleGlobal || 0} j</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. TABLEAU DES SALARIÉS ENTRANTS */}
      {sousOnglet === 'ENTRANTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Bordereau des Salariés Entrants (Formulaire F.212-2-59)
              </h3>
              <p className="text-xs text-slate-500">
                Nouveaux salariés déclarés pour la première fois avec immatriculation et <strong>CNI obligatoire</strong>.
              </p>
            </div>

            {pagesEntrants.length > 1 && (
              <div className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-xl">
                <button
                  disabled={pageEntrantIndex === 0}
                  onClick={() => setPageEntrantIndex(p => Math.max(0, p - 1))}
                  className="p-1 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  Page {pageEntrantIndex + 1} sur {pagesEntrants.length}
                </span>
                <button
                  disabled={pageEntrantIndex >= pagesEntrants.length - 1}
                  onClick={() => setPageEntrantIndex(p => Math.min(pagesEntrants.length - 1, p + 1))}
                  className="p-1 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {!documentBordereau ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Aucun bordereau n'a encore été généré.
            </div>
          ) : documentBordereau.nombreSalariesEntrants === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Aucun salarié entrant pour cette période mensuelle.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[10px] font-black">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">N° Immatriculé</th>
                      <th className="py-2.5 px-3">Nom et Prénom</th>
                      <th className="py-2.5 px-3">CNI (Obligatoire)</th>
                      <th className="py-2.5 px-3 text-center">Nbre de Jours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageEntrantCourante?.lignes.map(ligne => (
                      <tr key={ligne.ligneRegistreId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{ligne.index}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{ligne.numeroImmatriculation}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-950 uppercase">{ligne.nomPrenom}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-purple-900 bg-purple-50/40">
                          {ligne.cni}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center font-bold text-blue-700">
                          {ligne.nombreJours}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTAUX ENTRANTS */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs font-bold text-slate-700">
                <span>Page {pageEntrantCourante?.numeroPage || 1} / {pageEntrantCourante?.totalPages || 1}</span>
                <div className="flex items-center gap-6">
                  <span>Jours entrants page : <strong>{pageEntrantCourante?.totalJoursPage || 0} j</strong></span>
                  <span className="text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded">
                    Cumul Global Entrants : <strong>{pageEntrantCourante?.totalJoursCumuleGlobal || 0} j</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. PARAMÈTRES DE CONFIGURATION ENTREPRISE */}
      {sousOnglet === 'CONFIG' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs max-w-3xl space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Paramètres Entreprise & Affiliation CNSS
            </h3>
            <p className="text-xs text-slate-500">
              Ces paramètres sont reportés sur les en-têtes officiels des bordereaux F.212-2-58 et F.212-2-59. Le numéro d'affiliation et l'agence sont obligatoires.
            </p>
          </div>

          {messageConfig && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{messageConfig}</span>
            </div>
          )}

          <form onSubmit={handleSauvegarderConfig} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Raison Sociale</label>
                <input
                  type="text"
                  value={configTemp.raisonSociale}
                  onChange={e => setConfigTemp({ ...configTemp, raisonSociale: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  N° Affiliation CNSS (Obligatoire)
                </label>
                <input
                  type="text"
                  value={configTemp.numeroAffiliation}
                  onChange={e => setConfigTemp({ ...configTemp, numeroAffiliation: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  placeholder="Ex: 6541835"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Agence CNSS de rattachement (Obligatoire)
                </label>
                <input
                  type="text"
                  value={configTemp.agence}
                  onChange={e => setConfigTemp({ ...configTemp, agence: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  placeholder="Ex: SIDI BELYOUT"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ville</label>
                <input
                  type="text"
                  value={configTemp.ville}
                  onChange={e => setConfigTemp({ ...configTemp, ville: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Adresse</label>
                <input
                  type="text"
                  value={configTemp.adresse}
                  onChange={e => setConfigTemp({ ...configTemp, adresse: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Salariés par page (Gabarit d'impression)
                </label>
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={configTemp.lignesParPage}
                  onChange={e => setConfigTemp({ ...configTemp, lignesParPage: parseInt(e.target.value, 10) || 12 })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Défaut officiel : 12 lignes par page (conforme au document PDF CNSS réel)
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
              >
                Enregistrer la Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. RAPPORT D'ÉLIGIBILITÉ */}
      {sousOnglet === 'ELIGIBILITE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Rapport de Conformité et Contrôles d'Éligibilité
              </h3>
              <p className="text-xs text-slate-500">
                Audite l'exhaustivité et la validité des données du registre avant toute projection administrative.
              </p>
            </div>

            <div className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
              bilanEligibilite.estEligible
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}>
              {bilanEligibilite.estEligible ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{bilanEligibilite.estEligible ? 'REGISTRE 100% CONFORME' : 'ANOMALIES DÉTECTÉES'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Lignes Contrôlées</span>
              <span className="text-lg font-black text-slate-900">{bilanEligibilite.totalLignesControlees}</span>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-[10px] uppercase font-bold text-purple-700 block">Salariés Ordinaires</span>
              <span className="text-lg font-black text-purple-900">{bilanEligibilite.totalOrdinaires}</span>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">Salariés Entrants</span>
              <span className="text-lg font-black text-blue-900">{bilanEligibilite.totalEntrants}</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Salariés Sortants (SO)</span>
              <span className="text-lg font-black text-amber-900">{bilanEligibilite.totalSortants}</span>
            </div>
          </div>

          {bilanEligibilite.bloquants.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-rose-900 text-xs">Conditions Bloquantes :</h4>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1.5 text-xs text-rose-900">
                {bilanEligibilite.bloquants.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bilanEligibilite.estEligible && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-black">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tous les contrôles administratifs sont satisfaits avec succès :</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-emerald-800">
                <li>Numéro d'affiliation employeur configuré et conforme.</li>
                <li>Agence CNSS de rattachement renseignée.</li>
                <li>Toutes les immatriculations CNSS comportent exactement 9 chiffres.</li>
                <li>Toutes les CNI des nouveaux entrants sont présentes et conformes.</li>
                <li>Les jours déclarés sont strictement compris entre 0 et 26 jours.</li>
                <li>Aucun doublon de numéro d'immatriculation dans le registre.</li>
                <li>Aucun salarié non identifié ni anomalie bloquante non résolue.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* MODALE PLEIN ÉCRAN POUR L'APERÇU OFFICIEL ET IMPRESSION */}
      {isApercuModalOpen && documentBordereau && (
        <ApercuBordereauCnss
          document={documentBordereau}
          onFermer={() => setIsApercuModalOpen(false)}
          onValiderBordereau={handleValiderBordereau}
        />
      )}
    </div>
  );
};
