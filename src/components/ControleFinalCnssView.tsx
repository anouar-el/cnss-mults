/**
 * Vue Principale du Dossier CNSS Mensuel Final MULT.S
 * PROMPT 09 — Contrôle Global, Clôture, Archivage, Versionnage et Traçabilité
 *
 * RÈGLE FONDAMENTALE :
 * Projection en lecture seule du Registre CNSS et des bordereaux validés.
 * Ne modifie jamais les données sources.
 */

import React, { useState, useMemo } from 'react';
import {
  FolderCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Printer,
  Download,
  Eye,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Layers,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  History,
  Search,
  Check,
  ChevronRight,
  Info,
  Clock,
  UserCheck,
} from 'lucide-react';
import { LigneRegistreCnss, StatutPeriode, AnomalieLigne, PeriodeMensuelle } from '../types/cnss';
import { DossierCnssMensuel } from '../types/cnssDossier';
import { DocumentBordereauCnss, EntrepriseCnssConfig } from '../types/cnssBordereau';
import { DocumentBordereauPaiementCnss } from '../types/cnssPaiement';
import { cnssDossierService } from '../services/cnssDossierService';
import { persistenceService } from '../services/persistenceService';
import { ApercuDossierSynthese } from './ApercuDossierSynthese';

interface ControleFinalCnssViewProps {
  moisActif: string;
  statutPeriode: StatutPeriode;
  lignesRegistre: LigneRegistreCnss[];
  anomalies: AnomalieLigne[];
  periodes: PeriodeMensuelle[];
  onChangerMois: (mois: string) => void;
  onNaviguerVersVue: (vue: any) => void;
  onNaviguerVersTestsP9: () => void;
}

export const ControleFinalCnssView: React.FC<ControleFinalCnssViewProps> = ({
  moisActif,
  statutPeriode,
  lignesRegistre,
  anomalies,
  periodes,
  onChangerMois,
  onNaviguerVersVue,
  onNaviguerVersTestsP9,
}) => {
  // Configuration entreprise
  const [config] = useState<EntrepriseCnssConfig>(() =>
    persistenceService.getEntrepriseConfig()
  );

  // Bordereaux existants pour la période
  const bordereauDeclaration = useMemo<DocumentBordereauCnss | null>(() => {
    return persistenceService.getBordereauPeriode(moisActif);
  }, [moisActif]);

  const bordereauPaiement = useMemo<DocumentBordereauPaiementCnss | null>(() => {
    return persistenceService.getPaiementPeriode(moisActif);
  }, [moisActif]);

  // Dossier mensuel persisté ou calculé à la volée
  const [dossier, setDossier] = useState<DossierCnssMensuel>(() => {
    const stocke = persistenceService.getDossierPeriode(moisActif);
    const agrege = cnssDossierService.agregerDossierMensuel({
      periodeId: moisActif,
      lignesRegistre,
      bordereauDeclaration,
      bordereauPaiement,
      anomalies,
      config,
      statutPeriode,
      dossierExistant: stocke,
    });
    persistenceService.saveDossierPeriode(moisActif, agrege);
    return agrege;
  });

  // Sous-onglets internes
  const [sousOnglet, setSousOnglet] = useState<
    'CHECKLIST' | 'TRIPARTITE' | 'DOCUMENTS' | 'HISTORIQUE' | 'AUDIT'
  >('CHECKLIST');

  // Modales
  const [isApercuModalOpen, setIsApercuModalOpen] = useState(false);
  const [isValiderModalOpen, setIsValiderModalOpen] = useState(false);
  const [signataireNom, setSignataireNom] = useState('Directeur des Ressources Humaines');

  const [isCloturerModalOpen, setIsCloturerModalOpen] = useState(false);
  const [clotureNom, setClotureNom] = useState('Directeur Financier');

  const [isReouvrirModalOpen, setIsReouvrirModalOpen] = useState(false);
  const [motifReouverture, setMotifReouverture] = useState('');
  const [erreurReouverture, setErreurReouverture] = useState<string | null>(null);

  // Notification
  const [notification, setNotification] = useState<string | null>(null);

  // Recherche dans l'historique
  const [rechercheHistorique, setRechercheHistorique] = useState('');

  const afficherNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Recalcul de l'agrégation
  const handleRecalculerDossier = () => {
    const decActuelle = persistenceService.getBordereauPeriode(moisActif);
    const payActuelle = persistenceService.getPaiementPeriode(moisActif);
    const maj = cnssDossierService.agregerDossierMensuel({
      periodeId: moisActif,
      lignesRegistre,
      bordereauDeclaration: decActuelle,
      bordereauPaiement: payActuelle,
      anomalies,
      config,
      statutPeriode,
      dossierExistant: persistenceService.getDossierPeriode(moisActif),
    });
    setDossier(maj);
    persistenceService.saveDossierPeriode(moisActif, maj);
    afficherNotification('Dossier CNSS synchronisé avec les données sources.');
  };

  // Validation formelle
  const handleValiderDossier = () => {
    try {
      const docValide = cnssDossierService.validerDossierMensuel(dossier, signataireNom);
      setDossier(docValide);
      persistenceService.saveDossierPeriode(moisActif, docValide);
      setIsValiderModalOpen(false);
      afficherNotification('Dossier CNSS Mensuel validé et scellé avec succès.');
    } catch (e: any) {
      afficherNotification(e.message || 'Erreur lors de la validation.');
    }
  };

  // Clôture définitive
  const handleCloturerDossier = () => {
    try {
      const docClos = cnssDossierService.cloturerPeriodeDossier(dossier, clotureNom);
      setDossier(docClos);
      persistenceService.saveDossierPeriode(moisActif, docClos);
      setIsCloturerModalOpen(false);
      afficherNotification('Période définitivement clôturée et archivée en lecture seule.');
    } catch (e: any) {
      afficherNotification(e.message || 'Erreur lors de la clôture.');
    }
  };

  // Réouverture contrôlée
  const handleReouvrirDossier = () => {
    if (!motifReouverture || motifReouverture.trim().length < 5) {
      setErreurReouverture('Un motif d’au moins 5 caractères est obligatoire pour réouvrir la période.');
      return;
    }

    try {
      const docReouvert = cnssDossierService.reouvrirDossierMensuel(
        dossier,
        motifReouverture.trim(),
        'Superviseur RH & Paie'
      );
      setDossier(docReouvert);
      persistenceService.saveDossierPeriode(moisActif, docReouvert);
      setIsReouvrirModalOpen(false);
      setMotifReouverture('');
      setErreurReouverture(null);
      afficherNotification(`Période réouverte pour modification (Nouvelle Version ${docReouvert.versionCourante}).`);
    } catch (e: any) {
      setErreurReouverture(e.message);
    }
  };

  // Téléchargement CSV
  const handleTelechargerCsv = () => {
    const csvContent = cnssDossierService.exporterDossierCsv(dossier);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CNSS_Dossier_${dossier.mois}_${dossier.annee}_v${dossier.versionCourante}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    afficherNotification('Fichier de synthèse CSV téléchargé.');
  };

  const formatDevise = (val: number) => {
    return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Historique filtré
  const periodesFiltrees = useMemo(() => {
    if (!rechercheHistorique.trim()) return periodes;
    const t = rechercheHistorique.toLowerCase().trim();
    return periodes.filter(
      p =>
        p.idMois.toLowerCase().includes(t) ||
        p.libelle.toLowerCase().includes(t) ||
        p.statut.toLowerCase().includes(t)
    );
  }, [periodes, rechercheHistorique]);

  const auditEventsPeriode = useMemo(() => {
    const all = persistenceService.getJournalAudit();
    return all.filter(e => e.moisId === moisActif || !e.moisId);
  }, [moisActif]);

  return (
    <div className="space-y-6">
      {/* NOTIFICATION FLOTTANTE */}
      {notification && (
        <div className="p-3.5 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* EN-TÊTE PRINCIPAL */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-md shadow-slate-900/20">
              <FolderCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Dossier CNSS Mensuel Final MULT.S
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-800 border border-slate-300">
                  Version {dossier.versionCourante}
                </span>

                {/* Badge de statut */}
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    dossier.statut === 'CLOTURE'
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : dossier.statut === 'VALIDE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : dossier.statut === 'PRET_A_VALIDER'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {dossier.statut === 'CLOTURE' ? (
                    <>
                      <Lock className="w-3 h-3 text-purple-700" />
                      Clôturé & Archivé
                    </>
                  ) : dossier.statut === 'VALIDE' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      Validé (Prêt à Clôturer)
                    </>
                  ) : dossier.statut === 'PRET_A_VALIDER' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-blue-700" />
                      Prêt à Valider
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                      Contrôles Requis ({dossier.motifsBlocageValidation.length})
                    </>
                  )}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                <span>
                  Entreprise : <strong className="text-slate-800">{config.raisonSociale}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Affilié CNSS : <strong className="text-blue-900">{config.numeroAffiliation}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Agence : <strong className="text-slate-800">{config.agence}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Période : <strong className="text-slate-800">{moisActif}</strong>
                </span>
                <span>&bull;</span>
                <span className="font-mono text-[11px] text-slate-400">
                  Hash : {dossier.dossierHash.slice(0, 16)}...
                </span>
              </p>
            </div>
          </div>

          {/* ACTIONS D'EN-TÊTE */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRecalculerDossier}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Synchroniser avec le registre et bordereaux"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Synchroniser
            </button>

            <button
              onClick={() => setIsApercuModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Page de Garde A4
            </button>

            <button
              onClick={handleTelechargerCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              CSV
            </button>

            {/* Actions selon le statut */}
            {dossier.statut === 'PRET_A_VALIDER' && (
              <button
                onClick={() => setIsValiderModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Valider le Dossier
              </button>
            )}

            {dossier.statut === 'VALIDE' && (
              <button
                onClick={() => setIsCloturerModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Clôturer Définitivement
              </button>
            )}

            {dossier.statut === 'CLOTURE' && (
              <button
                onClick={() => setIsReouvrirModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-600" />
                Réouvrir la Période
              </button>
            )}

            <button
              onClick={onNaviguerVersTestsP9}
              className="inline-flex items-center gap-1 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Banc P9 (25/25)
            </button>
          </div>
        </div>

        {/* CARTES DE SYNTHÈSE DES CHIFFRES DU MOIS (Section 11) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Salariés Déclarés</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">
              {dossier.resume.totalSalaries}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              +{dossier.resume.nombreEntrants} entr. &bull; -{dossier.resume.nombreSortants} sort.
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Jours Déclarés</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">
              {dossier.resume.totalJoursDeclares} j
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {(dossier.resume.totalJoursDeclares / (dossier.resume.totalSalaries || 1)).toFixed(1)} j / sal.
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Masse Brute</span>
            <span className="text-base font-black text-slate-900 font-mono mt-1 block">
              {formatDevise(dossier.resume.masseBruteDeclaree)}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">MAD</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200">
            <span className="text-[10px] font-bold text-blue-800 uppercase block">Régime Général</span>
            <span className="text-base font-black text-blue-950 font-mono mt-1 block">
              {formatDevise(dossier.resume.totalCotisationsRegimeGeneral)}
            </span>
            <span className="text-[10px] text-blue-700 mt-0.5 block">AF + PS + TFP</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Volet AMO</span>
            <span className="text-base font-black text-emerald-950 font-mono mt-1 block">
              {formatDevise(dossier.resume.totalCotisationsAmo)}
            </span>
            <span className="text-[10px] text-emerald-700 mt-0.5 block">Part. + Cotis.</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 text-white shadow-xs">
            <span className="text-[10px] font-bold text-slate-300 uppercase block">Total Global CNSS</span>
            <span className="text-base font-black text-emerald-400 font-mono mt-1 block">
              {formatDevise(dossier.resume.totalGlobalAPayer)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">MAD à régler</span>
          </div>
        </div>

        {/* ALERTE DE BLOCAGE SI EXISTANTE */}
        {dossier.motifsBlocageValidation.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-black text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Contrôles préalables non satisfaits ({dossier.motifsBlocageValidation.length}) :</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800 pl-2">
              {dossier.motifsBlocageValidation.map((motif, idx) => (
                <li key={idx}>{motif}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* NAVIGATION SOUS-ONGLETS */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-bold">
        <button
          onClick={() => setSousOnglet('CHECKLIST')}
          className={`pb-3 px-4 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'CHECKLIST'
              ? 'border-b-2 border-slate-900 text-slate-900 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderCheck className="w-4 h-4 text-slate-700" />
          Checklist Réglementaire
          <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-slate-100 text-slate-800">
            {dossier.checklist.filter(c => c.estValide).length}/{dossier.checklist.length}
          </span>
        </button>

        <button
          onClick={() => setSousOnglet('TRIPARTITE')}
          className={`pb-3 px-4 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'TRIPARTITE'
              ? 'border-b-2 border-blue-600 text-blue-900 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Contrôle Tripartite
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
              dossier.controleTripartite.estConforme
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {dossier.controleTripartite.estConforme ? '100% CONFORME' : 'ÉCARTS'}
          </span>
        </button>

        <button
          onClick={() => setSousOnglet('DOCUMENTS')}
          className={`pb-3 px-4 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'DOCUMENTS'
              ? 'border-b-2 border-purple-600 text-purple-900 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" />
          Documents du Dossier ({dossier.documents.length})
        </button>

        <button
          onClick={() => setSousOnglet('HISTORIQUE')}
          className={`pb-3 px-4 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'HISTORIQUE'
              ? 'border-b-2 border-slate-900 text-slate-900 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-slate-700" />
          Historique & Anciens Mois ({periodes.length})
        </button>

        <button
          onClick={() => setSousOnglet('AUDIT')}
          className={`pb-3 px-4 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            sousOnglet === 'AUDIT'
              ? 'border-b-2 border-slate-900 text-slate-900 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-slate-700" />
          Journal d’Audit ({auditEventsPeriode.length})
        </button>
      </div>

      {/* CONTENU DU SOUS-ONGLET */}
      <div className="space-y-6">
        {/* =====================================================================
            SOUS-ONGLET 1 : CHECKLIST DE CONTRÔLE (Section 4 & 10)
           ===================================================================== */}
        {sousOnglet === 'CHECKLIST' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Tableau de Contrôle Final & Checklist Réglementaire
                </h3>
                <p className="text-xs text-slate-500">
                  Vérification exhaustive de la conformité avant validation et clôture de la période
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500">Statut Global</span>
                <div className="text-sm font-black text-slate-900">
                  {dossier.checklist.every(c => c.estValide)
                    ? 'Prêt pour la Clôture'
                    : `${dossier.checklist.filter(c => !c.estValide).length} point(s) bloquant(s)`}
                </div>
              </div>
            </div>

            {/* LISTE GROUPÉE PAR CATÉGORIE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['IDENTIFICATION', 'REGISTRE', 'DECLARATION', 'PAIEMENT', 'FINAL'] as const).map(cat => {
                const items = dossier.checklist.filter(c => c.categorie === cat);
                const titrecat =
                  cat === 'IDENTIFICATION'
                    ? '1. Identification Entreprise'
                    : cat === 'REGISTRE'
                    ? '2. Registre CNSS Mensuel'
                    : cat === 'DECLARATION'
                    ? '3. Bordereau Déclaration des Salariés (07-B)'
                    : cat === 'PAIEMENT'
                    ? '4. Bordereau Paiement des Cotisations (08)'
                    : '5. Contrôle Tripartite & Clôture';

                return (
                  <div key={cat} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                      {titrecat}
                    </h4>

                    <div className="space-y-2">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            {item.estValide ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{item.libelle}</div>
                              {item.messageDetail && (
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {item.messageDetail}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bouton de navigation directe vers le module concerné */}
                          {item.lienVue && (
                            <button
                              onClick={() => onNaviguerVersVue(item.lienVue)}
                              className="px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <span>Voir</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            SOUS-ONGLET 2 : CONTRÔLE TRIPARTITE (Section 9)
           ===================================================================== */}
        {sousOnglet === 'TRIPARTITE' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Contrôle Croisé Tripartite Final
                </h3>
                <p className="text-xs text-slate-500">
                  Vérification de stricte cohérence : Registre CNSS vs Bordereau Salariés vs Bordereau Paiement
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                  dossier.controleTripartite.estConforme
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {dossier.controleTripartite.estConforme ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    100% Concordant
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    {dossier.controleTripartite.totalBloquants} Écart(s) Détecté(s)
                  </>
                )}
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Point de Contrôle</th>
                    <th className="py-3 px-4">1. Registre CNSS</th>
                    <th className="py-3 px-4">2. Bordereau Déclaration</th>
                    <th className="py-3 px-4">3. Bordereau Paiement</th>
                    <th className="py-3 px-3 text-center">Résultat</th>
                    <th className="py-3 px-4">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dossier.controleTripartite.controles.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.libelle}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{String(c.valeurA)}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{String(c.valeurB)}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{String(c.valeurC)}</td>
                      <td className="py-3 px-3 text-center">
                        {c.estConforme ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                            CONFORME
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800">
                            ÉCART
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{c.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            SOUS-ONGLET 3 : DOCUMENTS DU DOSSIER (Section 12)
           ===================================================================== */}
        {sousOnglet === 'DOCUMENTS' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Liasse Documentaire du Dossier CNSS
                </h3>
                <p className="text-xs text-slate-500">
                  Ensemble des documents administratifs internes certifiés pour la période {moisActif}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dossier.documents.map(doc => (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{doc.libelle}</h4>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Réf: <strong>{doc.referenceOfficielle || 'INTERNE'}</strong>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        doc.estVerrouille
                          ? 'bg-emerald-100 text-emerald-800'
                          : doc.estGenere
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {doc.estVerrouille ? 'VERROUILLÉ' : doc.estGenere ? 'GÉNÉRÉ' : 'À GÉNÉRER'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono flex justify-between items-center pt-2 border-t border-slate-200">
                    <span>Date: {doc.dateGeneration.slice(0, 10)}</span>
                    {doc.hash && <span>Hash: {doc.hash.slice(0, 14)}...</span>}
                  </div>

                  {/* Actions directes selon le document */}
                  <div className="flex justify-end gap-2 pt-1">
                    {doc.type === 'REGISTRE' && (
                      <button
                        onClick={() => onNaviguerVersVue('REGISTRE')}
                        className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold text-[11px] cursor-pointer"
                      >
                        Consulter Registre
                      </button>
                    )}
                    {doc.type === 'BORDEREAU_SALARIES' && (
                      <button
                        onClick={() => onNaviguerVersVue('BORDEREAU')}
                        className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-purple-700 font-bold text-[11px] cursor-pointer"
                      >
                        Consulter Déclaration (07-B)
                      </button>
                    )}
                    {doc.type === 'BORDEREAU_PAIEMENT' && (
                      <button
                        onClick={() => onNaviguerVersVue('PAIEMENT')}
                        className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-blue-700 font-bold text-[11px] cursor-pointer"
                      >
                        Consulter Paiement (08)
                      </button>
                    )}
                    {doc.type === 'RAPPORT_ANOMALIES' && (
                      <button
                        onClick={() => onNaviguerVersVue('ANOMALIES')}
                        className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-amber-700 font-bold text-[11px] cursor-pointer"
                      >
                        Consulter Anomalies
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            SOUS-ONGLET 4 : HISTORIQUE DES MOIS ET VERSIONS (Section 19, 20 & 21)
           ===================================================================== */}
        {sousOnglet === 'HISTORIQUE' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Historique Multi-Périodes & Versions du Dossier
                </h3>
                <p className="text-xs text-slate-500">
                  Consultation des anciens mois et audit des réouvertures successives
                </p>
              </div>

              {/* Recherche de période */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher par mois, statut..."
                  value={rechercheHistorique}
                  onChange={e => setRechercheHistorique(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* TABLEAU DES PÉRIODES PERSISTÉES */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Période</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-3 text-center">Salariés</th>
                    <th className="py-3 px-3 text-center">Étape Workflow</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {periodesFiltrees.map(p => {
                    const estActif = p.idMois === moisActif;
                    return (
                      <tr key={p.idMois} className={`hover:bg-slate-50/70 ${estActif ? 'bg-slate-50/80 font-bold' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="text-slate-900">{p.libelle}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.idMois}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              p.statut === 'CLOTURE'
                                ? 'bg-purple-100 text-purple-800'
                                : p.statut === 'VALIDE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {p.statut}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          {p.lignesPaieCount || lignesRegistre.length}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          Étape {p.etapeWorkflow || 6} / 6
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onChangerMois(p.idMois)}
                            disabled={estActif}
                            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                              estActif
                                ? 'bg-slate-200 text-slate-500 cursor-default'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            {estActif ? 'Période Active' : 'Basculer'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TABLEAU DES VERSIONS DU MOIS EN COURS */}
            {dossier.versionsHistorique.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Historique des Versions & Réouvertures (Période {moisActif})
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Version</th>
                        <th className="py-2 px-3">Statut</th>
                        <th className="py-2 px-3">Date Clôture</th>
                        <th className="py-2 px-4">Motif Réouverture</th>
                        <th className="py-2 px-3">Auteur Réouverture</th>
                        <th className="py-2 px-3 text-right">Total Versement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {dossier.versionsHistorique.map(v => (
                        <tr key={v.numeroVersion} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">v{v.numeroVersion}</td>
                          <td className="py-2 px-3">{v.statut}</td>
                          <td className="py-2 px-3">{v.dateCloture?.slice(0, 10) || '-'}</td>
                          <td className="py-2 px-4 font-sans text-slate-700">{v.motifReouverture || '-'}</td>
                          <td className="py-2 px-3 font-sans text-slate-600">{v.reouvertPar || '-'}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatDevise(v.totalGlobalAPayer)} MAD
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

        {/* =====================================================================
            SOUS-ONGLET 5 : JOURNAL D’AUDIT FINAL (Section 23)
           ===================================================================== */}
        {sousOnglet === 'AUDIT' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Journal d’Audit & Traçabilité des Opérations
                </h3>
                <p className="text-xs text-slate-500">
                  Consignation chronologique inaltérable des validations, clôtures et réouvertures
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {auditEventsPeriode.length > 0 ? (
                auditEventsPeriode.map(evt => (
                  <div
                    key={evt.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[11px]">
                          {evt.date.slice(0, 19).replace('T', ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                          {evt.action || evt.typeAction || 'ACTION'}
                        </span>
                        <span className="font-bold text-slate-900">{evt.auteur || evt.utilisateur || 'Responsable'}</span>
                      </div>
                      <p className="text-slate-700 mt-1 font-medium">{evt.description || evt.justification}</p>
                      {evt.details && (
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{evt.details}</p>
                      )}
                    </div>
                    {evt.moisId && (
                      <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                        {evt.moisId}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Aucun événement d’audit enregistré pour cette période.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODALE D'APERÇU OFFICIEL IMPRIMABLE (PAGE DE GARDE A4) */}
      {isApercuModalOpen && (
        <ApercuDossierSynthese
          dossier={dossier}
          onFermer={() => setIsApercuModalOpen(false)}
          onValider={() => {
            setIsApercuModalOpen(false);
            setIsValiderModalOpen(true);
          }}
          onCloturer={() => {
            setIsApercuModalOpen(false);
            setIsCloturerModalOpen(true);
          }}
        />
      )}

      {/* MODALE DE VALIDATION DU DOSSIER */}
      {isValiderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-2">
              Validation Finale du Dossier CNSS Mensuel
            </h3>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Après validation, tous les documents constitutifs du dossier (registre, bordereaux de déclaration et de
              paiement) seront formellement verrouillés. Toute modification ultérieure nécessitera une réouverture
              justifiée.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Période concernée :</span>
                <span className="font-bold text-slate-900">{moisActif}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Salariés déclarés :</span>
                <span className="font-bold text-slate-900">{dossier.resume.totalSalaries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Charge globale CNSS :</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatDevise(dossier.resume.totalGlobalAPayer)} MAD
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom et titre du signataire habilité :
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
                onClick={handleValiderDossier}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Confirmer la validation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CLÔTURE DÉFINITIVE */}
      {isCloturerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-2">
              Clôture Définitive & Archivage de la Période
            </h3>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              La clôture verrouille l’ensemble du cycle mensuel de paie et de déclaration CNSS. Aucun import ou
              modification ne pourra plus être effectué pour <strong>{moisActif}</strong> sans une réouverture
              formellement consignée dans l'audit.
            </p>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Responsable de la Clôture :
              </label>
              <input
                type="text"
                value={clotureNom}
                onChange={e => setClotureNom(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCloturerModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleCloturerDossier}
                className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Confirmer la Clôture Définitive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE RÉOUVERTURE DU DOSSIER */}
      {isReouvrirModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <Unlock className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-2">
              Réouverture Contrôlée de la Période
            </h3>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              La réouverture d'une période clôturée nécessite obligatoirement un motif justificatif d'au moins 5
              caractères. L’état actuel sera archivé sous la <strong>Version {dossier.versionCourante}</strong> et une
              nouvelle version <strong>v{dossier.versionCourante + 1}</strong> sera créée.
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
                placeholder="Exemple : Régularisation d'une prime d'ancienneté suite à contrôle de direction..."
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
                onClick={handleReouvrirDossier}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Réouvrir la Période
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
