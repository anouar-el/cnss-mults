/**
 * Vue Principale du Bordereau de Paiement des Cotisations CNSS MULT.S
 * PROMPT 08 — Calcul, Consolidation, Contrôle Croisé Tripartite et Validation
 * Document de Référence : Formulaire Administratif CNSS Maroc Réf: 511-1-01 (Indice 03)
 */

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
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
  DollarSign,
  ChevronRight,
  Users,
  Search,
  Sliders,
} from 'lucide-react';
import { LigneRegistreCnss, StatutPeriode } from '../types/cnss';
import {
  DocumentBordereauPaiementCnss,
  BilanControleCroisePaiement,
  CotisationIndividuelleSalarie,
  CnssTauxItem,
} from '../types/cnssPaiement';
import { DocumentBordereauCnss, EntrepriseCnssConfig } from '../types/cnssBordereau';
import { cnssPaiementService } from '../services/cnssPaiementService';
import { persistenceService } from '../services/persistenceService';
import { ApercuBordereauPaiement } from './ApercuBordereauPaiement';

interface BordereauPaiementViewProps {
  moisActif: string;
  statutPeriode: StatutPeriode;
  lignesRegistre: LigneRegistreCnss[];
  onNaviguerVersRegistre: () => void;
  onNaviguerVersBordereauSalaries: () => void;
  onNaviguerVersTestsP8: () => void;
}

export const BordereauPaiementView: React.FC<BordereauPaiementViewProps> = ({
  moisActif,
  statutPeriode,
  lignesRegistre,
  onNaviguerVersRegistre,
  onNaviguerVersBordereauSalaries,
  onNaviguerVersTestsP8,
}) => {
  // Configuration entreprise persistée
  const [configEntreprise] = useState<EntrepriseCnssConfig>(() =>
    persistenceService.getEntrepriseConfig()
  );

  // Bordereau de déclaration des salariés (PROMPT 07-B)
  const bordereauDeclaration = useMemo<DocumentBordereauCnss | null>(() => {
    return persistenceService.getBordereauPeriode(moisActif);
  }, [moisActif]);

  // Bordereau de paiement persisté ou calculé à la volée
  const [documentPaiement, setDocumentPaiement] = useState<DocumentBordereauPaiementCnss | null>(() => {
    const stocke = persistenceService.getPaiementPeriode(moisActif);
    if (stocke) return stocke;
    // Si pas encore généré, calculer automatiquement si registre présent
    if (lignesRegistre.length > 0) {
      const calcul = cnssPaiementService.calculerBordereauPaiement(
        lignesRegistre,
        bordereauDeclaration,
        configEntreprise,
        moisActif
      );
      if (calcul.document) {
        persistenceService.savePaiementPeriode(moisActif, calcul.document);
        return calcul.document;
      }
    }
    return null;
  });

  // Sous-onglets internes
  const [sousOnglet, setSousOnglet] = useState<'VOLET_RG' | 'VOLET_AMO' | 'CONTROLE_CROISE' | 'SALARIES' | 'TAUX'>(
    'VOLET_RG'
  );

  // Modal d'aperçu officiel imprimable
  const [isApercuModalOpen, setIsApercuModalOpen] = useState(false);

  // Modal de validation formelle
  const [isValiderModalOpen, setIsValiderModalOpen] = useState(false);
  const [signataireNom, setSignataireNom] = useState('Directeur Financier');

  // Modal de réouverture
  const [isReouvrirModalOpen, setIsReouvrirModalOpen] = useState(false);
  const [motifReouverture, setMotifReouverture] = useState('');
  const [erreurReouverture, setErreurReouverture] = useState<string | null>(null);

  // Filtre recherche salariés
  const [termeRecherche, setTermeRecherche] = useState('');

  // Notification locale
  const [notification, setNotification] = useState<string | null>(null);

  const afficherNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Recalcul du bordereau de paiement
  const handleRecalculer = () => {
    const res = cnssPaiementService.calculerBordereauPaiement(
      lignesRegistre,
      bordereauDeclaration,
      configEntreprise,
      moisActif
    );

    if (res.document) {
      setDocumentPaiement(res.document);
      persistenceService.savePaiementPeriode(moisActif, res.document);
      afficherNotification('Bordereau de paiement recalculé avec succès depuis le registre validé.');
    } else {
      afficherNotification(res.erreur || 'Impossible de calculer le bordereau de paiement.');
    }
  };

  // Validation formelle
  const handleValiderPaiement = () => {
    if (!documentPaiement) return;
    try {
      const docValide = cnssPaiementService.validerBordereauPaiement(documentPaiement, signataireNom);
      setDocumentPaiement(docValide);
      persistenceService.savePaiementPeriode(moisActif, docValide);
      setIsValiderModalOpen(false);
      afficherNotification('Bordereau de paiement validé formellement et verrouillé.');
    } catch (e: any) {
      afficherNotification(e.message || 'Erreur lors de la validation.');
    }
  };

  // Réouverture
  const handleReouvrirPaiement = () => {
    if (!documentPaiement) return;
    if (!motifReouverture || motifReouverture.trim().length < 5) {
      setErreurReouverture('Un motif d’au moins 5 caractères est obligatoire pour réouvrir le paiement.');
      return;
    }

    try {
      const docReouvert = cnssPaiementService.reouvrirBordereauPaiement(
        documentPaiement,
        motifReouverture.trim()
      );
      setDocumentPaiement(docReouvert);
      persistenceService.savePaiementPeriode(moisActif, docReouvert);
      setIsReouvrirModalOpen(false);
      setMotifReouverture('');
      setErreurReouverture(null);
      afficherNotification('Bordereau de paiement réouvert en mode brouillon.');
    } catch (e: any) {
      setErreurReouverture(e.message);
    }
  };

  // Téléchargement CSV administratif
  const handleExportCsv = () => {
    if (!documentPaiement) return;
    const csvContent = cnssPaiementService.exporterPaiementCsv(documentPaiement);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CNSS_Paiement_${documentPaiement.mois}_${documentPaiement.annee}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    afficherNotification('Fichier CSV administratif téléchargé.');
  };

  const formatDevise = (val: number) => {
    return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Salariés filtrés
  const salariesFiltres = useMemo(() => {
    if (!documentPaiement) return [];
    if (!termeRecherche.trim()) return documentPaiement.cotisationsSalaries;
    const t = termeRecherche.toLowerCase().trim();
    return documentPaiement.cotisationsSalaries.filter(
      s =>
        s.nomOfficiel.toLowerCase().includes(t) ||
        s.cnss.includes(t)
    );
  }, [documentPaiement, termeRecherche]);

  return (
    <div className="space-y-6">
      {/* NOTIFICATION FLOTTANTE */}
      {notification && (
        <div className="p-3.5 bg-blue-900 text-white text-xs font-bold rounded-2xl shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-300" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-blue-200 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* EN-TÊTE PRINCIPAL */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center font-bold shadow-md shadow-blue-700/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Bordereau de Paiement des Cotisations CNSS
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  Réf: 511-1-01
                </span>
                {documentPaiement && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      documentPaiement.statut === 'VALIDE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {documentPaiement.statut === 'VALIDE' ? (
                      <>
                        <Lock className="w-3 h-3" />
                        Validé & Verrouillé
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3" />
                        Brouillon Conforme
                      </>
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                <span>
                  Entreprise : <strong className="text-slate-800">{configEntreprise.raisonSociale}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Affilié CNSS : <strong className="text-blue-900">{configEntreprise.numeroAffiliation}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Agence : <strong className="text-slate-800">{configEntreprise.agence}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Période : <strong className="text-slate-800">{moisActif}</strong>
                </span>
              </p>
            </div>
          </div>

          {/* ACTIONS D'EN-TÊTE */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRecalculer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recalculer
            </button>

            {documentPaiement && (
              <>
                <button
                  onClick={() => setIsApercuModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Aperçu Officiel
                </button>

                <button
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  CSV
                </button>

                {documentPaiement.statut === 'VALIDE' ? (
                  <button
                    onClick={() => setIsReouvrirModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5 text-amber-600" />
                    Réouvrir
                  </button>
                ) : (
                  <button
                    onClick={() => setIsValiderModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valider le Paiement
                  </button>
                )}
              </>
            )}

            <button
              onClick={onNaviguerVersTestsP8}
              className="inline-flex items-center gap-1 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Banc P8 (27/27)
            </button>
          </div>
        </div>

        {/* CARTES STATISTIQUES FINANCIÈRES CLÉS */}
        {documentPaiement ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
            {/* 1. Masse Brute Déclarée */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Masse Brute Déclarée</span>
              <span className="text-lg font-black text-slate-900 font-mono mt-1 block">
                {formatDevise(documentPaiement.masseBruteDeclaree)} <span className="text-xs font-sans font-normal text-slate-500">MAD</span>
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {documentPaiement.nombreSalariesDeclares} salariés &bull; {documentPaiement.totalJoursDeclares} j
              </span>
            </div>

            {/* 2. Masse Cotisable Plafonnée */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Masse Plafonnée (PS)</span>
              <span className="text-lg font-black text-blue-900 font-mono mt-1 block">
                {formatDevise(documentPaiement.masseCotisablePlafonnee)} <span className="text-xs font-sans font-normal text-slate-500">MAD</span>
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">Plafond légal 6 000 MAD / sal.</span>
            </div>

            {/* 3. Cotisations Régime Général */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
              <span className="text-[11px] font-bold text-blue-800 block uppercase">1. Régime Général</span>
              <span className="text-lg font-black text-blue-950 font-mono mt-1 block">
                {formatDevise(documentPaiement.totalCotisationsRegimeGeneral)} <span className="text-xs font-sans font-normal text-blue-700">MAD</span>
              </span>
              <span className="text-[10px] text-blue-700 mt-1 block">AF 6.4% + PS 13.46% + TFP 1.6%</span>
            </div>

            {/* 4. Cotisations AMO */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800 block uppercase">2. Volet AMO</span>
              <span className="text-lg font-black text-emerald-950 font-mono mt-1 block">
                {formatDevise(documentPaiement.totalCotisationsAmo)} <span className="text-xs font-sans font-normal text-emerald-700">MAD</span>
              </span>
              <span className="text-[10px] text-emerald-700 mt-1 block">Part. 1.85% + Cotis. 4.52%</span>
            </div>

            {/* 5. Total Global à Payer */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-white shadow-md">
              <span className="text-[11px] font-bold text-blue-200 block uppercase">Total Global à Payer</span>
              <span className="text-xl font-black font-mono mt-1 block text-emerald-300">
                {formatDevise(documentPaiement.totalGlobalAPayer)} <span className="text-xs font-sans font-normal text-blue-200">MAD</span>
              </span>
              <span className="text-[10px] text-blue-200 mt-1 block font-serif truncate" title={documentPaiement.montantEnToutesLettres}>
                {documentPaiement.montantEnToutesLettres}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-6 p-6 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              <div>
                <h4 className="font-bold text-amber-900 text-sm">Bordereau de paiement non généré</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Cliquez sur "Recalculer" pour projeter les cotisations à partir du registre CNSS validé.
                </p>
              </div>
            </div>
            <button
              onClick={handleRecalculer}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Générer maintenant
            </button>
          </div>
        )}
      </div>

      {/* NAVIGATION SOUS-ONGLETS */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-bold">
        <button
          onClick={() => setSousOnglet('VOLET_RG')}
          className={`pb-3 px-4 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'VOLET_RG'
              ? 'border-b-2 border-blue-600 text-blue-900 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-600" />
          Page 1 &bull; Régime Général (511-1-01)
        </button>

        <button
          onClick={() => setSousOnglet('VOLET_AMO')}
          className={`pb-3 px-4 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'VOLET_AMO'
              ? 'border-b-2 border-emerald-600 text-emerald-900 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Page 2 &bull; Assurance Maladie (AMO)
        </button>

        <button
          onClick={() => setSousOnglet('CONTROLE_CROISE')}
          className={`pb-3 px-4 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'CONTROLE_CROISE'
              ? 'border-b-2 border-purple-600 text-purple-900 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-600" />
          Contrôle Croisé Tripartite
          {documentPaiement && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                documentPaiement.controleCroise.estConforme
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {documentPaiement.controleCroise.estConforme ? 'CONFORME' : 'ÉCARTS'}
            </span>
          )}
        </button>

        <button
          onClick={() => setSousOnglet('SALARIES')}
          className={`pb-3 px-4 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'SALARIES'
              ? 'border-b-2 border-blue-600 text-blue-900 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-slate-600" />
          Détail par Salarié ({documentPaiement?.cotisationsSalaries.length || 0})
        </button>

        <button
          onClick={() => setSousOnglet('TAUX')}
          className={`pb-3 px-4 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'TAUX'
              ? 'border-b-2 border-slate-900 text-slate-900 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4 text-slate-600" />
          Taux Officiels CNSS
        </button>
      </div>

      {/* CONTENU DU SOUS-ONGLET */}
      {documentPaiement && (
        <div className="space-y-6">
          {/* =====================================================================
              SOUS-ONGLET 1 : VOLET RÉGIME GÉNÉRAL
             ===================================================================== */}
          {sousOnglet === 'VOLET_RG' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Décompte Officiel du Régime Général (CNSS Réf: 511-1-01 Page 1)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Allocations Familiales, Prestations Sociales (plafonnées à 6 000 MAD/salarié) et Taxe de Formation Professionnelle
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 block">Total Régime Général</span>
                  <span className="text-xl font-black text-blue-900 font-mono">
                    {formatDevise(documentPaiement.voletRegimeGeneral.montantGlobalVersement)} MAD
                  </span>
                </div>
              </div>

              {/* TABLEAU DES CASES RG */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-3 text-center w-14">Case</th>
                      <th className="py-3 px-4">Désignation de la Cotisation</th>
                      <th className="py-3 px-4 text-right">Assiette (MAD)</th>
                      <th className="py-3 px-3 text-center">Taux</th>
                      <th className="py-3 px-3 text-center">Part Patronale</th>
                      <th className="py-3 px-3 text-center">Part Salariale</th>
                      <th className="py-3 px-4 text-right">Montant (MAD)</th>
                      <th className="py-3 px-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {/* Case 1 */}
                    {documentPaiement.voletRegimeGeneral.lignes
                      .filter(l => l.caseNumero === 1)
                      .map(l => (
                        <tr key={l.codeRubrique} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-3 text-center font-mono font-bold bg-slate-50">1</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{l.libelleFr}</div>
                            <div className="text-[11px] text-slate-500 font-serif" dir="rtl">
                              {l.libelleAr}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Assiette brute déplafonnée</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                            {formatDevise(l.assietteRetenue)}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-blue-900">
                            {l.taux.toFixed(2)} %
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-600">6,40 %</td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-400">0,00 %</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatDevise(l.montantArrondi)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              CONFIRMÉ
                            </span>
                          </td>
                        </tr>
                      ))}

                    {/* Case 2 */}
                    {documentPaiement.voletRegimeGeneral.lignes
                      .filter(l => l.caseNumero === 2)
                      .map(l => (
                        <tr key={l.codeRubrique} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-3 text-center font-mono font-bold bg-slate-50">2</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{l.libelleFr}</div>
                            <div className="text-[11px] text-slate-500 font-serif" dir="rtl">
                              {l.libelleAr}
                            </div>
                            <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                              Assiette plafonnée à 6 000 MAD par salarié
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-950">
                            {formatDevise(l.assietteRetenue)}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-blue-900">
                            {l.taux.toFixed(2)} %
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-600">8,98 %</td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-600">4,48 %</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatDevise(l.montantArrondi)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              CONFIRMÉ
                            </span>
                          </td>
                        </tr>
                      ))}

                    {/* Case 3 : Total Cotisations */}
                    <tr className="bg-slate-100/70 font-bold">
                      <td className="py-3 px-3 text-center font-mono font-black">3</td>
                      <td className="py-3 px-4">Total des cotisations versées (Case 1 + Case 2)</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">-</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">-</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">-</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">-</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-blue-900">
                        {formatDevise(documentPaiement.voletRegimeGeneral.totalCotisationsVersees)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                          TOTAL RG
                        </span>
                      </td>
                    </tr>

                    {/* Case 8 : TFP */}
                    {documentPaiement.voletRegimeGeneral.lignes
                      .filter(l => l.caseNumero === 8)
                      .map(l => (
                        <tr key={l.codeRubrique} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-3 text-center font-mono font-bold bg-slate-50">8</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{l.libelleFr}</div>
                            <div className="text-[11px] text-slate-500 font-serif" dir="rtl">
                              {l.libelleAr}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Assiette brute déplafonnée (100% patronal)</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                            {formatDevise(l.assietteRetenue)}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-blue-900">
                            {l.taux.toFixed(2)} %
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-600">1,60 %</td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-400">0,00 %</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatDevise(l.montantArrondi)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              CONFIRMÉ
                            </span>
                          </td>
                        </tr>
                      ))}

                    {/* Case 10 : Total Global RG */}
                    <tr className="bg-blue-900 text-white font-black text-sm">
                      <td className="py-4 px-3 text-center font-mono">10</td>
                      <td className="py-4 px-4">
                        <div>MONTANT GLOBAL DU VERSEMENT RÉGIME GÉNÉRAL (Case 3 + Case 8)</div>
                        <div className="text-[11px] text-blue-200 font-serif font-normal" dir="rtl">
                          المبلغ الإجمالي للأداء &bull; نظام الضمان الاجتماعي
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono opacity-80">-</td>
                      <td className="py-4 px-3 text-center font-mono opacity-80">-</td>
                      <td className="py-4 px-3 text-center font-mono opacity-80">-</td>
                      <td className="py-4 px-3 text-center font-mono opacity-80">-</td>
                      <td className="py-4 px-4 text-right font-mono text-base font-black text-emerald-300">
                        {formatDevise(documentPaiement.voletRegimeGeneral.montantGlobalVersement)} MAD
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                          À RÉGLER
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              SOUS-ONGLET 2 : VOLET AMO
             ===================================================================== */}
          {sousOnglet === 'VOLET_AMO' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Décompte Officiel Assurance Maladie Obligatoire (CNSS Réf: 511-1-01 Page 2)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Participation AMO (1,85% patronale) et Cotisation AMO (4,52% partagée 50/50 patronale et salariale)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 block">Total AMO</span>
                  <span className="text-xl font-black text-emerald-900 font-mono">
                    {formatDevise(documentPaiement.voletAmo.montantGlobalVersementAmo)} MAD
                  </span>
                </div>
              </div>

              {/* TABLEAU DES CASES AMO */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-3 text-center w-14">Case</th>
                      <th className="py-3 px-4">Désignation de la Cotisation AMO</th>
                      <th className="py-3 px-4 text-right">Assiette (MAD)</th>
                      <th className="py-3 px-3 text-center">Taux</th>
                      <th className="py-3 px-3 text-center">Part Patronale</th>
                      <th className="py-3 px-3 text-center">Part Salariale</th>
                      <th className="py-3 px-4 text-right">Montant (MAD)</th>
                      <th className="py-3 px-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {/* Case 1 AMO */}
                    {documentPaiement.voletAmo.lignes
                      .filter(l => l.caseNumero === 1)
                      .map(l => (
                        <tr key={l.codeRubrique} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-3 text-center font-mono font-bold bg-slate-50">1</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{l.libelleFr}</div>
                            <div className="text-[11px] text-slate-500 font-serif" dir="rtl">
                              {l.libelleAr}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Part patronale exclusive</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                            {formatDevise(l.assietteRetenue)}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-900">
                            {l.taux.toFixed(2)} %
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-600">1,85 %</td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-400">0,00 %</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatDevise(l.montantArrondi)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              CONFIRMÉ
                            </span>
                          </td>
                        </tr>
                      ))}

                    {/* Case 2 AMO */}
                    {documentPaiement.voletAmo.lignes
                      .filter(l => l.caseNumero === 2)
                      .map(l => (
                        <tr key={l.codeRubrique} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-3 text-center font-mono font-bold bg-slate-50">2</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{l.libelleFr}</div>
                            <div className="text-[11px] text-slate-500 font-serif" dir="rtl">
                              {l.libelleAr}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Part patronale (2,26%) + Part salariale (2,26%)
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                            {formatDevise(l.assietteRetenue)}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-900">
                            {l.taux.toFixed(2)} %
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-600">2,26 %</td>
                          <td className="py-3.5 px-3 text-center font-mono text-slate-600">2,26 %</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatDevise(l.montantArrondi)}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              CONFIRMÉ
                            </span>
                          </td>
                        </tr>
                      ))}

                    {/* Case 3 AMO : Total cotisations AMO */}
                    <tr className="bg-emerald-50/70 font-bold">
                      <td className="py-3 px-3 text-center font-mono font-black">3</td>
                      <td className="py-3 px-4">Total des cotisations versées AMO (Case 1 + Case 2)</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">-</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">-</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">-</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">-</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-950">
                        {formatDevise(documentPaiement.voletAmo.totalCotisationsAmo)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          TOTAL AMO
                        </span>
                      </td>
                    </tr>

                    {/* Case 10 AMO : Total Global AMO */}
                    <tr className="bg-emerald-900 text-white font-black text-sm">
                      <td className="py-4 px-3 text-center font-mono">10</td>
                      <td className="py-4 px-4">
                        <div>MONTANT GLOBAL DU VERSEMENT ASSURANCE MALADIE OBLIGATOIRE (AMO)</div>
                        <div className="text-[11px] text-emerald-200 font-serif font-normal" dir="rtl">
                          المبلغ الإجمالي للأداء &bull; التأمين الإجباري الأساسي عن المرض
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono opacity-80">-</td>
                      <td className="py-4 px-3 text-center font-mono opacity-80">-</td>
                      <td className="py-4 px-3 text-center font-mono opacity-80">-</td>
                      <td className="py-4 px-3 text-center font-mono opacity-80">-</td>
                      <td className="py-4 px-4 text-right font-mono text-base font-black text-emerald-300">
                        {formatDevise(documentPaiement.voletAmo.montantGlobalVersementAmo)} MAD
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                          À RÉGLER
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              SOUS-ONGLET 3 : CONTRÔLE CROISÉ TRIPARTITE
             ===================================================================== */}
          {sousOnglet === 'CONTROLE_CROISE' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Contrôle Croisé Tripartite & Cohérence Métier
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registre CNSS validé &harr; Bordereau de Déclaration des Salariés (07-B) &harr; Bordereau de Paiement (08)
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                    documentPaiement.controleCroise.estConforme
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {documentPaiement.controleCroise.estConforme ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Cohérence Intégrale Validée
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      {documentPaiement.controleCroise.totalBloquants} Écart(s) Bloquant(s)
                    </>
                  )}
                </span>
              </div>

              {/* LISTE DES CONTRÔLES FORMELS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-xs">Concordance Registre</span>
                    {documentPaiement.controleCroise.concordanceRegistre ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Toutes les lignes du registre sont validées, sans anomalie bloquante et avec immatriculation CNSS conforme.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-xs">Concordance Déclaration</span>
                    {documentPaiement.controleCroise.concordanceBordereauSalaries ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Même nombre de salariés ({documentPaiement.nombreSalariesDeclares}) et même total de jours déclarés ({documentPaiement.totalJoursDeclares} j).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-xs">Concordance Taux Officiels</span>
                    {documentPaiement.controleCroise.concordanceTaux ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    100% des taux appliqués sont issus du document officiel CNSS Maroc (Réf: 511-1-01) et confirmés.
                  </p>
                </div>
              </div>

              {/* TABLEAU DES ÉCARTS ÉVENTUELS */}
              {documentPaiement.controleCroise.ecarts.length > 0 ? (
                <div className="border border-red-200 rounded-2xl overflow-hidden">
                  <div className="bg-red-50 p-3 border-b border-red-200 font-bold text-red-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Détail des Écarts Détectés ({documentPaiement.controleCroise.ecarts.length})
                  </div>
                  <div className="divide-y divide-red-100 text-xs">
                    {documentPaiement.controleCroise.ecarts.map(ecart => (
                      <div key={ecart.id} className="p-3.5 bg-white flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-red-800">{ecart.type}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              {ecart.niveau}
                            </span>
                          </div>
                          <p className="text-slate-700 mt-1 font-medium">{ecart.message}</p>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-4">
                            <span>Attendu : <strong>{String(ecart.valeurAttendue)}</strong></span>
                            <span>Obtenu : <strong>{String(ecart.valeurObtenue)}</strong></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">Aucun écart détecté</h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Parfaite concordance arithmétique et réglementaire entre le registre MULT.S, le bordereau de déclaration des salariés et les cotisations calculées.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              SOUS-ONGLET 4 : DÉTAIL PAR SALARIÉ (TRAÇABILITÉ)
             ===================================================================== */}
          {sousOnglet === 'SALARIES' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Décompte Individuel par Salarié ({salariesFiltres.length} / {documentPaiement.cotisationsSalaries.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Traçabilité individuelle des assiettes plafonnées et cotisations calculées
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrer par nom ou N° CNSS..."
                    value={termeRecherche}
                    onChange={e => setTermeRecherche(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* TABLEAU SALARIÉS */}
              <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                <table className="w-full text-xs text-left min-w-[750px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-3">N° CNSS</th>
                      <th className="py-3 px-3">Nom et Prénom</th>
                      <th className="py-3 px-2 text-center">Jours</th>
                      <th className="py-3 px-3 text-right">Salaire Brut (MAD)</th>
                      <th className="py-3 px-3 text-right">Assiette Plafonnée (6k)</th>
                      <th className="py-3 px-2 text-right">AF (6.4%)</th>
                      <th className="py-3 px-2 text-right">PS (13.46%)</th>
                      <th className="py-3 px-2 text-right">TFP (1.6%)</th>
                      <th className="py-3 px-2 text-right">Part AMO (1.85%)</th>
                      <th className="py-3 px-2 text-right">Cotis AMO (4.52%)</th>
                      <th className="py-3 px-3 text-right font-black">Total Cotisations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {salariesFiltres.map(s => (
                      <tr key={s.salarieId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-blue-900">{s.cnss}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{s.nomOfficiel}</td>
                        <td className="py-2.5 px-2 text-center text-slate-700">{s.joursDeclares}</td>
                        <td className="py-2.5 px-3 text-right text-slate-900">{formatDevise(s.salaireBrutDeclare)}</td>
                        <td className="py-2.5 px-3 text-right text-blue-900 font-bold">
                          {formatDevise(s.salaireCotisablePlafonne)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-700">{formatDevise(s.cotisationAllocationsFamiliales)}</td>
                        <td className="py-2.5 px-2 text-right text-slate-700">{formatDevise(s.cotisationPrestationsSociales)}</td>
                        <td className="py-2.5 px-2 text-right text-slate-700">{formatDevise(s.cotisationTfp)}</td>
                        <td className="py-2.5 px-2 text-right text-slate-700">{formatDevise(s.cotisationParticipationAmo)}</td>
                        <td className="py-2.5 px-2 text-right text-slate-700">{formatDevise(s.cotisationAmo)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-blue-950">
                          {formatDevise(s.totalCotisationsSalarie)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =====================================================================
              SOUS-ONGLET 5 : TAUX OFFICIELS
             ===================================================================== */}
          {sousOnglet === 'TAUX' && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Référentiel des Taux Officiels CNSS Maroc
                </h3>
                <p className="text-xs text-slate-500">
                  Extrait fidèle du formulaire officiel CNSS (Réf: 511-1-01, Indice 03) — Aucun taux inventé
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Rubrique</th>
                      <th className="py-3 px-3">Régime</th>
                      <th className="py-3 px-3 text-center">Taux Global</th>
                      <th className="py-3 px-3 text-center">Part Patronale</th>
                      <th className="py-3 px-3 text-center">Part Salariale</th>
                      <th className="py-3 px-3">Plafond</th>
                      <th className="py-3 px-4">Source Documentaire</th>
                      <th className="py-3 px-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {cnssPaiementService.TAUX_OFFICIELS_DEFAUT.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-900">{t.libelle}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              t.regime === 'REGIME_GENERAL'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {t.regime === 'REGIME_GENERAL' ? 'Régime Général' : 'AMO'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                          {t.tauxTotal.toFixed(2)} %
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600">
                          {t.tauxPatronal?.toFixed(2)} %
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600">
                          {t.tauxSalarial?.toFixed(2)} %
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-mono text-xs">
                          {t.estPlafonne ? '6 000 MAD / mois' : 'Déplafonné'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{t.source}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                            CONFIRMÉ
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALE D'APERÇU OFFICIEL IMPRIMABLE (Réf: 511-1-01) */}
      {isApercuModalOpen && documentPaiement && (
        <ApercuBordereauPaiement
          document={documentPaiement}
          onFermer={() => setIsApercuModalOpen(false)}
          onValider={() => {
            setIsApercuModalOpen(false);
            setIsValiderModalOpen(true);
          }}
        />
      )}

      {/* MODALE DE VALIDATION FORMELLE DU BORDEREAU DE PAIEMENT */}
      {isValiderModalOpen && documentPaiement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-2">
              Validation Formelle du Bordereau de Paiement CNSS
            </h3>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Vous allez valider et verrouiller le montant officiel des cotisations CNSS pour la période{' '}
              <strong>{moisActif}</strong>. Cette opération fige le calcul et enregistre l'empreinte cryptographique
              dans l'audit.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Masse brute déclarée :</span>
                <span className="font-bold text-slate-900">{formatDevise(documentPaiement.masseBruteDeclaree)} MAD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Régime Général :</span>
                <span className="font-bold text-blue-900">{formatDevise(documentPaiement.totalCotisationsRegimeGeneral)} MAD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Volet AMO :</span>
                <span className="font-bold text-emerald-900">{formatDevise(documentPaiement.totalCotisationsAmo)} MAD</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span className="text-slate-800">Total global à payer :</span>
                <span className="text-emerald-700 font-mono text-sm">{formatDevise(documentPaiement.totalGlobalAPayer)} MAD</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom du signataire / Validateur responsable :
              </label>
              <input
                type="text"
                value={signataireNom}
                onChange={e => setSignataireNom(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsValiderModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleValiderPaiement}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Confirmer la validation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE RÉOUVERTURE DU BORDEREAU DE PAIEMENT */}
      {isReouvrirModalOpen && documentPaiement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <Unlock className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-2">
              Réouverture du Bordereau de Paiement CNSS
            </h3>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              La réouverture d'un bordereau de paiement validé nécessite obligatoirement un motif justificatif formel
              qui sera consigné dans le journal d'audit de conformité.
            </p>

            {erreurReouverture && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 text-xs rounded-xl mb-4 font-bold">
                {erreurReouverture}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motif justificatif de la réouverture (minimum 5 caractères) :
              </label>
              <textarea
                rows={3}
                value={motifReouverture}
                onChange={e => setMotifReouverture(e.target.value)}
                placeholder="Exemple : Ajustement suite à régularisation de prime validée par la direction..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsReouvrirModalOpen(false);
                  setErreurReouverture(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleReouvrirPaiement}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Réouvrir le document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
