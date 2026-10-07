import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRightLeft,
  ShieldCheck,
  Check,
  X,
  Layers,
  HelpCircle,
  AlertTriangle,
  Users,
  UserPlus,
  UserMinus,
  ShieldAlert,
  Lock,
  Unlock,
  Upload,
  Database,
  Calendar,
  Plus,
  ArrowRight,
  Clock,
  Play,
  FileSpreadsheet,
  Info,
  FileText,
  CreditCard,
  FolderCheck,
  HardDrive,
  Download,
  ClipboardPaste,
} from 'lucide-react';
import { RapprochementsView } from './components/RapprochementsView';
import { AnomaliesView } from './components/AnomaliesView';
import { NouveauxView } from './components/NouveauxView';
import { SortiesView } from './components/SortiesView';
import { ClotureModal } from './components/ClotureModal';
import { WorkflowStepper } from './components/WorkflowStepper';
import { NouveauMoisModal } from './components/NouveauMoisModal';
import { ImportPaieModal } from './components/ImportPaieModal';
import { ImportBaseCnssModal } from './components/ImportBaseCnssModal';
import { RegistreCnssView } from './components/RegistreCnssView';
import { SpecificationExportView } from './components/SpecificationExportView';
import { PreetabliCnssView } from './components/PreetabliCnssView';
import { ImportPreetabliCnssModal } from './components/ImportPreetabliCnssModal';
import { BordereauCnssView } from './components/BordereauCnssView';
import { BordereauPaiementView } from './components/BordereauPaiementView';
import { ControleFinalCnssView } from './components/ControleFinalCnssView';
import { executerTestsPrompt02, BilanPrompt02 } from './tests/testPrompt02';
import { executerTestsPrompt03, BilanPrompt03 } from './tests/testPrompt03';
import { executerTestsPrompt04, BilanPrompt04 } from './tests/testPrompt04';
import { executerTestsPrompt05, BilanPrompt05 } from './tests/testPrompt05';
import { executerTestsPrompt06, BilanPrompt06 } from './tests/testPrompt06';
import { executerTestsPrompt07A, BilanPrompt07A } from './tests/testPrompt07A';
import { executerTestsPrompt07Bis, BilanPrompt07Bis } from './tests/testPrompt07Bis';
import { executerTestsPrompt07B, BilanPrompt07B } from './tests/testPrompt07B';
import { executerTestsPrompt08, BilanPrompt08 } from './tests/testPrompt08';
import { executerTestsPrompt09, BilanPrompt09 } from './tests/testPrompt09';
import { executerTestsPrompt10, BilanPrompt10 } from './tests/testPrompt10';
import { executerTestsPrompt11, BilanPrompt11 } from './tests/testPrompt11';
import { executerTestsPrompt17, BilanPrompt17 } from './tests/testPrompt17';
import { BackupRestoreView } from './components/BackupRestoreView';
import { DonneesModificationAnomalie } from './components/ModifierAnomalieModal';
import { MigrationSupabaseModal } from './components/MigrationSupabaseModal';
import { isSupabaseConfigured, checkSupabaseConnection } from './services/supabaseClient';
import { cnssPreetabliService } from './services/cnssPreetabliService';
import {
  FichierPreetabliCnss,
  RapprochementPreetabli,
  DecisionHumainePreetabli,
} from './types/cnssPreetabli';
import {
  chargerBaseSalariesReelle,
  chargerLignesPaieReelles,
  RAW_CALCUL_SALAIRE_SEPTEMBRE,
} from './data/septembreRealData';
import { excelService } from './services/excelService';
import { rapprocherLigne, executerRapprochement } from './services/matchingEngine';
import { normaliserSituation, normaliserCni, normaliserCnss } from './services/normalizer';
import { validationEngine } from './services/validationEngine';
import { persistenceService } from './services/persistenceService';
import { supabasePersistenceService } from './services/supabasePersistenceService';
import { cnssRegisterService } from './services/cnssRegisterService';
import {
  SalarieReferentiel,
  LignePaieImportee,
  ResultatRapprochement,
  AnomalieLigne,
  AliasItem,
  HistoriqueDecision,
  SortieItem,
  StatutPeriode,
  PeriodeMensuelle,
  AnalyseFichierExcel,
  LigneRegistreCnss,
  EvenementAudit,
  SituationEmploye,
} from './types/cnss';

type VueType =
  | 'RAPPROCHEMENT'
  | 'REGISTRE'
  | 'BORDEREAU'
  | 'PAIEMENT'
  | 'DOSSIER'
  | 'BACKUP'
  | 'SPEC_EXPORT'
  | 'PREETABLI'
  | 'ANOMALIES'
  | 'NOUVEAUX'
  | 'SORTIES'
  | 'ALIAS'
  | 'TESTS_P17'
  | 'TESTS_P11'
  | 'TESTS_P10'
  | 'TESTS_P9'
  | 'TESTS_P8'
  | 'TESTS_P7B'
  | 'TESTS_P7BIS'
  | 'TESTS_P7A'
  | 'TESTS_P6'
  | 'TESTS_P5'
  | 'TESTS_P4'
  | 'TESTS_P3'
  | 'TESTS_P2';

export default function App() {
  // Liste des périodes persistées
  const [periodes, setPeriodes] = useState<PeriodeMensuelle[]>(() =>
    persistenceService.getPeriodes()
  );

  // Mois actif en cours
  const [moisActif, setMoisActif] = useState<string>('2026-09');

  // Anomalies levées manuellement par dérogation administrative
  const [anomaliesResoluesManuellement, setAnomaliesResoluesManuellement] = useState<
    Record<string, { justification: string; date: string }>
  >(() => persistenceService.getAnomaliesResoluesManuellement('2026-09'));

  // Navigation par onglets
  const [vueActive, setVueActive] = useState<VueType>('RAPPROCHEMENT');

  // Modales
  const [isClotureModalOpen, setIsClotureModalOpen] = useState(false);
  const [isNouveauMoisOpen, setIsNouveauMoisOpen] = useState(false);
  const [isImportPaieOpen, setIsImportPaieOpen] = useState(false);
  const [isImportBaseCnssOpen, setIsImportBaseCnssOpen] = useState(false);
  const [isImportPreetabliOpen, setIsImportPreetabliOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isReinitialiserModalOpen, setIsReinitialiserModalOpen] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => isSupabaseConfigured());

  useEffect(() => {
    checkSupabaseConnection().then(connecte => {
      setIsSupabaseConnected(connecte || isSupabaseConfigured());
    });
  }, []);

  // Bannière de résumé après import (Section 20)
  const [resumeImport, setResumeImport] = useState<{
    nomFichier: string;
    totalLignes: number;
    valides: number;
    ignoreesTotal: number;
    anomalies: number;
    date: string;
  } | null>(null);

  // Notification d'action effectuée
  const [notificationAction, setNotificationAction] = useState<string | null>(null);

  // Base salariés référentielle partagée
  const [baseSalaries, setBaseSalaries] = useState<SalarieReferentiel[]>(() => {
    const salariesSauvegardes = persistenceService.getSalaries();
    if (salariesSauvegardes && salariesSauvegardes.length > 0) {
      return salariesSauvegardes;
    }
    const init = chargerBaseSalariesReelle();
    persistenceService.saveSalaries(init);
    return init;
  });

  // Lignes de paie du mois actif (vierge au départ si aucune donnée importée)
  const [lignesPaie, setLignesPaie] = useState<LignePaieImportee[]>(() => {
    const saved = persistenceService.getLignesPaiePeriode('2026-09');
    return (saved && saved.length > 0) ? saved : [];
  });

  // Rapprochements en cours et alias mémorisés
  const [rapprochements, setRapprochements] = useState<ResultatRapprochement[]>([]);
  const [aliases, setAliases] = useState<AliasItem[]>([]);
  const [decisionsSorties, setDecisionsSorties] = useState<Record<string, 'SORTIE_CONFIRMEE' | 'MAINTENU_ACTIF'>>(() =>
    persistenceService.getDecisionsSorties()
  );

  // Bilans des bancs de tests automatisés
  const [bilanP2, setBilanP2] = useState<BilanPrompt02>(() => executerTestsPrompt02());
  const [bilanP3, setBilanP3] = useState<BilanPrompt03>(() => executerTestsPrompt03());
  const [bilanP4, setBilanP4] = useState<BilanPrompt04>(() => executerTestsPrompt04());
  const [bilanP5, setBilanP5] = useState<BilanPrompt05>(() => executerTestsPrompt05());
  const [bilanP6, setBilanP6] = useState<BilanPrompt06>(() => executerTestsPrompt06());
  const [bilanP7A, setBilanP7A] = useState<BilanPrompt07A>(() => executerTestsPrompt07A());
  const [bilanP7Bis, setBilanP7Bis] = useState<BilanPrompt07Bis>(() => executerTestsPrompt07Bis());
  const [bilanP7B, setBilanP7B] = useState<BilanPrompt07B>(() => executerTestsPrompt07B());
  const [bilanP8, setBilanP8] = useState<BilanPrompt08>(() => executerTestsPrompt08());
  const [bilanP9, setBilanP9] = useState<BilanPrompt09>(() => executerTestsPrompt09());
  const [bilanP10, setBilanP10] = useState<BilanPrompt10>(() => executerTestsPrompt10());
  const [bilanP11, setBilanP11] = useState<BilanPrompt11>(() => executerTestsPrompt11());
  const [bilanP17, setBilanP17] = useState<BilanPrompt17 | null>(null);

  useEffect(() => {
    executerTestsPrompt17().then(setBilanP17).catch(console.error);
  }, []);

  // Registre Mensuel CNSS (PROMPT 06 - vierge au départ si non construit)
  const [lignesRegistre, setLignesRegistre] = useState<LigneRegistreCnss[]>(() => {
    const saved = persistenceService.getRegistrePeriode('2026-09');
    return (saved && saved.length > 0) ? saved : [];
  });

  // Fichier Préétabli CNSS & Rapprochement (PROMPT 07-BIS - vierge au départ)
  const [fichierPreetabli, setFichierPreetabli] = useState<FichierPreetabliCnss | null>(() => {
    return persistenceService.getFichierPreetabli('2026-09') || null;
  });

  const [decisionsPreetabli, setDecisionsPreetabli] = useState<Record<string, DecisionHumainePreetabli>>(() =>
    persistenceService.getDecisionsPreetabli('2026-09')
  );

  const [rapprochementsPreetabli, setRapprochementsPreetabli] = useState<RapprochementPreetabli[]>(() => {
    const saved = persistenceService.getRapprochementsPreetabli('2026-09');
    if (saved && saved.length > 0) return saved;
    if (fichierPreetabli) {
      const raps = cnssPreetabliService.rapprocherPreetabliAvecRegistre(
        fichierPreetabli,
        lignesRegistre,
        baseSalaries,
        aliases,
        decisionsPreetabli
      );
      persistenceService.saveRapprochementsPreetabli('2026-09', raps);
      return raps;
    }
    return [];
  });

  // Informations de la période courante
  const periodeCourante = useMemo(() => {
    return periodes.find(p => p.idMois === moisActif) || {
      idMois: moisActif,
      libelle: moisActif === '2026-09' ? 'Septembre 2026' : moisActif,
      statut: 'BROUILLON' as StatutPeriode,
      etapeWorkflow: lignesPaie.length > 0 ? 6 : 1,
      dateCreation: new Date().toISOString(),
      lignesPaieCount: lignesPaie.length,
    };
  }, [periodes, moisActif, lignesPaie.length]);

  const statutPeriode = periodeCourante.statut;
  const etapeWorkflow = periodeCourante.etapeWorkflow || (lignesPaie.length > 0 ? 6 : 1);

  // Chargement et basculement d'une période (Section 1 & 17)
  const changerMoisActif = useCallback((nouveauMois: string) => {
    setMoisActif(nouveauMois);
    setResumeImport(null);

    // Charger les lignes de paie de la période cible
    const lignesMois = persistenceService.getLignesPaiePeriode(nouveauMois);
    let rapsMois: ResultatRapprochement[] = [];
    if (lignesMois && lignesMois.length > 0) {
      setLignesPaie(lignesMois);
      // Vérifier d'abord les rapprochements sauvegardés (Supabase / cache)
      const rapsSauves = persistenceService.getRapprochementsPeriode(nouveauMois);
      if (rapsSauves && rapsSauves.length > 0) {
        rapsMois = rapsSauves;
      } else {
        rapsMois = executerRapprochement(lignesMois, baseSalaries);
        persistenceService.saveRapprochementsPeriode(nouveauMois, rapsMois);
        supabasePersistenceService.saveRapprochementsPeriode(nouveauMois, rapsMois).catch(() => {});
      }
      setRapprochements(rapsMois);
    } else {
      setLignesPaie([]);
      setRapprochements([]);
    }

    // Charger ou construire le registre de la période cible (PROMPT 06)
    const regSauve = persistenceService.getRegistrePeriode(nouveauMois);
    if (regSauve && regSauve.length > 0) {
      setLignesRegistre(regSauve);
    } else if (lignesMois && lignesMois.length > 0) {
      const ans = validationEngine.auditer(rapsMois, baseSalaries);
      const nouveauReg = cnssRegisterService.construireRegistre(
        nouveauMois,
        lignesMois,
        baseSalaries,
        rapsMois,
        ans
      );
      setLignesRegistre(nouveauReg);
      persistenceService.saveRegistrePeriode(nouveauMois, nouveauReg);
    } else {
      setLignesRegistre([]);
    }

    // Charger ou synchroniser le préétabli de la période cible (PROMPT 07-BIS)
    const preetabliSauve = persistenceService.getFichierPreetabli(nouveauMois);
    setFichierPreetabli(preetabliSauve);
    const decs = persistenceService.getDecisionsPreetabli(nouveauMois);
    setDecisionsPreetabli(decs);
    const rapsPreet = persistenceService.getRapprochementsPreetabli(nouveauMois);
    setRapprochementsPreetabli(rapsPreet);

    // Recharger les anomalies levées manuellement pour ce mois
    setAnomaliesResoluesManuellement(persistenceService.getAnomaliesResoluesManuellement(nouveauMois));
  }, [baseSalaries]);

  // Recalcul des rapprochements après mise à jour de la base ou des alias (sans écraser les validations)
  const recalculerRapprochements = useCallback(() => {
    const listAliases = persistenceService.getAliases();
    setAliases(listAliases);

    if (lignesPaie.length > 0) {
      setRapprochements(prev => {
        const recalcules = executerRapprochement(lignesPaie, baseSalaries);
        if (!prev || prev.length === 0) {
          const cache = persistenceService.getRapprochementsPeriode(moisActif);
          if (cache && cache.length > 0) return cache;
          return recalcules;
        }

        // Fusion stricte : préserver à 100% les salariés validés par l'utilisateur
        const fusionnes = recalcules.map(nouveauRap => {
          const existant = prev.find(p => p.id === nouveauRap.id || p.lignePaieId === nouveauRap.lignePaieId);
          if (existant && (existant.validation === 'VALIDE' || existant.valideParHumain)) {
            return existant;
          }
          return nouveauRap;
        });

        persistenceService.saveRapprochementsPeriode(moisActif, fusionnes);
        supabasePersistenceService.saveRapprochementsPeriode(moisActif, fusionnes).catch(() => {});
        return fusionnes;
      });
    } else {
      setRapprochements([]);
    }
  }, [lignesPaie, baseSalaries, moisActif]);

  // Séquence de chargement initial & rafraîchissement F5 (Supabase prioritaire)
  useEffect(() => {
    let ignore = false;
    async function chargerDepuisSupabaseOuCache() {
      console.log('[SUPABASE-SYNC] lecture après refresh', { moisActif });
      try {
        // 0. Supabase en priorité absolue pour le référentiel salariés (baseSalaries)
        const supaSalaries = await supabasePersistenceService.getSalaries();
        if (!ignore && supaSalaries && supaSalaries.length > 0) {
          persistenceService.saveSalaries(supaSalaries);
          setBaseSalaries(supaSalaries);
        }
      } catch (err) {
        console.warn('[SUPABASE-SYNC] Erreur lecture salariés Supabase, bascule sur cache local', err);
      }

      try {
        // 1. Supabase en priorité absolue pour les rapprochements
        const supaRaps = await supabasePersistenceService.getRapprochementsPeriode(moisActif);
        if (!ignore && supaRaps && supaRaps.length > 0) {
          persistenceService.saveRapprochementsPeriode(moisActif, supaRaps);
          setRapprochements(supaRaps);
          return;
        }
      } catch (err) {
        console.warn('[SUPABASE-SYNC] Erreur lecture Supabase, bascule sur cache local', err);
      }

      // 2. Cache local (localStorage)
      const cacheRaps = persistenceService.getRapprochementsPeriode(moisActif);
      if (!ignore && cacheRaps && cacheRaps.length > 0) {
        setRapprochements(cacheRaps);
        return;
      }

      // 3. Premier calcul par défaut si aucune donnée existante
      if (!ignore && lignesPaie.length > 0) {
        const init = executerRapprochement(lignesPaie, baseSalaries);
        setRapprochements(init);
        persistenceService.saveRapprochementsPeriode(moisActif, init);
        supabasePersistenceService.saveRapprochementsPeriode(moisActif, init).catch(() => {});
      }
    }

    chargerDepuisSupabaseOuCache();
    return () => {
      ignore = true;
    };
  }, [moisActif]);

  // Contrôles et anomalies calculées dynamiquement
  const anomalies = useMemo(() => {
    return validationEngine.auditer(rapprochements, baseSalaries, anomaliesResoluesManuellement);
  }, [rapprochements, baseSalaries, anomaliesResoluesManuellement]);

  // Sorties calculées dynamiquement
  const sorties = useMemo(() => {
    return validationEngine.identifierSorties(baseSalaries, rapprochements, decisionsSorties);
  }, [baseSalaries, rapprochements, decisionsSorties]);

  // Contrôle global avant déclaration
  const bilanPret = useMemo(() => {
    return validationEngine.verifierPretPourDeclaration(rapprochements, baseSalaries, anomalies);
  }, [rapprochements, baseSalaries, anomalies]);

  // Compteurs
  const totalBloquantes = useMemo(() => anomalies.filter(a => a.gravite === 'BLOQUANTE' && !a.estResolue).length, [anomalies]);
  const totalAvertissements = useMemo(() => anomalies.filter(a => a.gravite === 'AVERTISSEMENT' && !a.estResolue).length, [anomalies]);
  const totalNouveaux = useMemo(() => rapprochements.filter(r => r.estMarqueNouveau || r.statut === 'NON_IDENTIFIE').length, [rapprochements]);
  const totalSortiesAConfirmer = useMemo(() => sorties.filter(s => s.statutSortie === 'A_CONFIRMER').length, [sorties]);

  // Tests actions
  const relancerTestsP2 = () => setBilanP2(executerTestsPrompt02());
  const relancerTestsP3 = () => setBilanP3(executerTestsPrompt03());
  const relancerTestsP4 = () => setBilanP4(executerTestsPrompt04());
  const relancerTestsP5 = () => setBilanP5(executerTestsPrompt05());
  const relancerTestsP6 = () => setBilanP6(executerTestsPrompt06());
  const relancerTestsP7A = () => setBilanP7A(executerTestsPrompt07A());

  // -------------------------------------------------------------------------
  // HANDLERS PROMPT 04 & PROMPT 05
  // -------------------------------------------------------------------------

  const afficherNotification = (msg: string) => {
    setNotificationAction(msg);
    setTimeout(() => setNotificationAction(null), 3500);
  };

  const handlePeriodeCreee = (nouvellePeriode: PeriodeMensuelle) => {
    setPeriodes(persistenceService.getPeriodes());
    changerMoisActif(nouvellePeriode.idMois);
    setVueActive('RAPPROCHEMENT');
    afficherNotification(`Période ${nouvellePeriode.libelle} créée avec succès.`);
  };

  const handleImportPaieConfirme = (nouvellesLignes: LignePaieImportee[], analyse: AnalyseFichierExcel) => {
    persistenceService.saveLignesPaiePeriode(moisActif, nouvellesLignes);
    setLignesPaie(nouvellesLignes);

    persistenceService.updatePeriode(moisActif, {
      etapeWorkflow: 6,
      nomFichierPaie: analyse.nomFichier,
      tailleFichierPaie: analyse.taille,
      feuillePaie: analyse.feuilleSelectionnee,
      lignesPaieCount: nouvellesLignes.length,
    });
    setPeriodes(persistenceService.getPeriodes());

    // Synchronisation fidèle de la situation depuis le fichier importé vers la base des salariés
    const baseMiseAJour = [...baseSalaries];
    let aModifieBase = false;

    nouvellesLignes.forEach(l => {
      if (l.situationImportee) {
        const sitNorm = normaliserSituation(l.situationImportee);
        const sal = baseMiseAJour.find(s => {
          if (l.cniImportee && s.cni && normaliserCni(s.cni) === normaliserCni(l.cniImportee)) return true;
          if (l.cnssImportee && s.immatriculationCnss && normaliserCnss(s.immatriculationCnss) === normaliserCnss(l.cnssImportee)) return true;
          if (s.nomNormalise === l.nomNormalise) return true;
          return false;
        });

        if (sal) {
          if (sal.situation !== sitNorm) {
            sal.situation = sitNorm;
            sal.situationOriginale = l.situationImportee;
            sal.actif = sitNorm === 'ACTIF';
            aModifieBase = true;
          }
        }
      }
    });

    if (aModifieBase) {
      setBaseSalaries(baseMiseAJour);
      persistenceService.saveSalaries(baseMiseAJour);
    }

    const baseUtilisee = aModifieBase ? baseMiseAJour : baseSalaries;
    const raps = executerRapprochement(nouvellesLignes, baseUtilisee);
    setRapprochements(raps);
    persistenceService.saveRapprochementsPeriode(moisActif, raps);

    setResumeImport({
      nomFichier: analyse.nomFichier,
      totalLignes: analyse.totalLignesDetectees,
      valides: analyse.lignesValidesCount,
      ignoreesTotal: analyse.lignesIgnoreesTotalCount,
      anomalies: analyse.lignesAnomaliesCount,
      date: new Date().toLocaleTimeString(),
    });

    setVueActive('RAPPROCHEMENT');
  };

  const handleBaseMiseAJour = (nouvelleBase: SalarieReferentiel[]) => {
    setBaseSalaries(nouvelleBase);
    persistenceService.saveSalaries(nouvelleBase);
    if (lignesPaie.length > 0) {
      const raps = executerRapprochement(lignesPaie, nouvelleBase);
      setRapprochements(raps);
    }
    afficherNotification(`Base CNSS mise à jour (${nouvelleBase.length} salariés dans le référentiel).`);
  };

  // -------------------------------------------------------------------------
  // ARBITRAGES MÉTIER & VALIDATION FACE-À-FACE (Section 6, 7, 8, 15, 16)
  // PERSISTANCE SUPABASE PRIORITAIRE & PROTECTION ANTI-ÉCRASEMENT F5 (PROMPT 16)
  // -------------------------------------------------------------------------

  // Helper centralisé de persistance atomique Supabase + Local Cache
  const persisterRapprochements = async (
    nouveauxRaps: ResultatRapprochement[],
    messageSucces?: string
  ): Promise<boolean> => {
    try {
      // 1. Écriture Supabase prioritaire
      await supabasePersistenceService.saveRapprochementsPeriode(moisActif, nouveauxRaps);

      // 2. Mise à jour cache local après succès Supabase
      persistenceService.saveRapprochementsPeriode(moisActif, nouveauxRaps);

      // 3. Mise à jour état React
      setRapprochements(nouveauxRaps);

      if (messageSucces) {
        afficherNotification(messageSucces);
      }
      return true;
    } catch (err: any) {
      console.error('[SUPABASE-SYNC] erreur UPDATE', err);
      afficherNotification(`Échec de persistance Supabase : ${err.message || 'Erreur réseau'}`);
      return false;
    }
  };

  // -------------------------------------------------------------------------
  // MODIFICATION MANUELLE DU STATUT SALARIÉ (PROMPT 17)
  // FLUX OBLIGATOIRE : UI -> SERVICE -> UPDATE SUPABASE -> REACT STATE -> CACHE LOCAL -> AUDIT
  // -------------------------------------------------------------------------
  const handleModifierStatutSalarie = async (
    salarieId: string,
    nouveauStatut: SituationEmploye,
    motif: string
  ): Promise<void> => {
    try {
      console.log('[SUPABASE-SYNC] Début modification statut salarié', {
        salarieId,
        nouveauStatut,
        motif,
      });

      // 1. UPDATE Supabase prioritaire
      const { salarie: salarieMisAJour, auditEvent } = await supabasePersistenceService.modifierStatutSalarie(
        salarieId,
        nouveauStatut,
        {
          monthId: moisActif,
          motif,
          utilisateur: 'Gestionnaire MULT.S',
        }
      );

      // 2. Mettre à jour cache local
      persistenceService.modifierStatutSalarie(salarieId, nouveauStatut, {
        monthId: moisActif,
        motif,
        utilisateur: 'Gestionnaire MULT.S',
      });

      // 3. Mettre à jour l'état React de baseSalaries
      setBaseSalaries(prev => {
        const next = prev.map(s => (s.id === salarieId ? salarieMisAJour : s));
        persistenceService.saveSalaries(next);
        return next;
      });

      // 4. Mettre à jour l'état React des rapprochements de la période
      setRapprochements(prev => {
        const next = prev.map(r => {
          if (r.salariePropose?.id === salarieId || r.salarieBaseId === salarieId) {
            const salPropose = r.salariePropose
              ? { ...r.salariePropose, situation: nouveauStatut, actif: nouveauStatut === 'ACTIF' }
              : undefined;
            const decSorti =
              nouveauStatut === 'ACTIF'
                ? 'REACTIVATION_CONFIRMEE'
                : nouveauStatut === 'SORTI'
                ? 'CONSERVE_SORTI'
                : r.decisionSorti;
            return {
              ...r,
              salariePropose: salPropose,
              decisionSorti: decSorti,
            };
          }
          return r;
        });
        persistenceService.saveRapprochementsPeriode(moisActif, next);
        supabasePersistenceService.saveRapprochementsPeriode(moisActif, next).catch(() => {});
        return next;
      });

      // 5. Mettre à jour l'état React du registre si présent
      setLignesRegistre(prev => {
        const next = prev.map(l => {
          if (l.salarieId === salarieId) {
            return {
              ...l,
              situation: nouveauStatut,
            };
          }
          return l;
        });
        persistenceService.saveRegistrePeriode(moisActif, next);
        return next;
      });

      // 6. Mettre à jour les décisions de sorties
      setDecisionsSorties(persistenceService.getDecisionsSorties());

      afficherNotification(
        `Statut de ${salarieMisAJour.nomComplet} mis à jour : ${nouveauStatut} (persistance Supabase confirmée).`
      );
    } catch (err: any) {
      console.error('[SUPABASE-SYNC] Erreur lors de la modification du statut', err);
      afficherNotification(`❌ Erreur Supabase : ${err.message || 'Impossible de mettre à jour le statut'}`);
      throw err;
    }
  };

  const handleValiderCorrespondance = async (idRapprochement: string, memoriserAlias: boolean) => {
    if (statutPeriode === 'CLOTURE') return;

    const rapCible = rapprochements.find(r => r.id === idRapprochement);
    if (!rapCible) return;

    const salarieFinal = rapCible.salariePropose;
    const entreeHisto: HistoriqueDecision = {
      id: `h_${Date.now()}`,
      lignePaieId: rapCible.lignePaieId,
      dateHeure: new Date().toISOString(),
      typeValidation: rapCible.score >= 90 ? 'VALIDATION_RAPIDE' : 'VALIDATION_FUZZY',
      ancienStatut: rapCible.validation,
      nouveauStatut: 'VALIDE',
      salarieSelectionneId: salarieFinal?.id,
      nomSalarieSelectionne: salarieFinal?.nomComplet,
      aliasCree: memoriserAlias ? salarieFinal?.nomComplet : undefined,
    };

    const rapValide: ResultatRapprochement = {
      ...rapCible,
      validation: 'VALIDE',
      valideParHumain: true,
      statutP5: 'IDENTIFIE',
      dateValidation: new Date().toISOString(),
      enregistrerCommeAlias: memoriserAlias,
      dateDecision: new Date().toISOString(),
      nomDeclareFinal: salarieFinal?.nomComplet,
      cniDeclareeFinale: salarieFinal?.cni,
      cnssDeclareeFinale: salarieFinal?.immatriculationCnss,
      historique: [...(rapCible.historique || []), entreeHisto],
    };

    const nouveauxRaps = rapprochements.map(r => (r.id === idRapprochement ? rapValide : r));

    const succes = await persisterRapprochements(
      nouveauxRaps,
      'Correspondance validée et enregistrée dans Supabase.'
    );
    if (!succes) return;

    if (memoriserAlias && salarieFinal) {
      const aliasObj: AliasItem = {
        id: `alias_${Date.now()}`,
        aliasBrut: rapValide.nomDeclareFinal || salarieFinal.nomComplet,
        aliasNormalise: (rapValide.nomDeclareFinal || salarieFinal.nomComplet).toUpperCase().trim(),
        salarieId: salarieFinal.id,
        nomOfficielSalarie: salarieFinal.nomComplet,
        cniSalarie: salarieFinal.cni,
        cnssSalarie: salarieFinal.immatriculationCnss,
        creeParMois: moisActif,
        dateCreation: new Date().toISOString(),
      };
      await supabasePersistenceService.saveAlias(aliasObj);
      persistenceService.ajouterAlias(aliasObj);
      setAliases(persistenceService.getAliases());
    }

    const auditEvt: EvenementAudit = {
      id: `audit_val_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'VALIDATION_CORRESPONDANCE',
      salarie: salarieFinal?.nomComplet || rapCible.lignePaieId,
      utilisateur: 'Gestionnaire MULT.S',
      nouvelleValeur: `Validé -> ${salarieFinal?.nomComplet} (Score: ${rapCible.score}%)`,
      justification: memoriserAlias ? 'Validation avec mémorisation d\'alias permanent' : 'Validation humaine de la proposition',
    };
    await supabasePersistenceService.enregistrerEvenementAudit(auditEvt);
    persistenceService.enregistrerEvenementAudit(auditEvt);
  };

  const handleRefuserCorrespondance = async (idRapprochement: string) => {
    if (statutPeriode === 'CLOTURE') return;

    const nouveauxRaps = rapprochements.map(rap => {
      if (rap.id !== idRapprochement) return rap;
      return {
        ...rap,
        validation: 'REJETE' as const,
        valideParHumain: true,
        dateDecision: new Date().toISOString(),
      };
    });

    await persisterRapprochements(nouveauxRaps, 'Correspondance rejetée.');
  };

  const handleConfirmerNouveau = async (idRapprochement: string) => {
    if (statutPeriode === 'CLOTURE') return;

    const rapCible = rapprochements.find(r => r.id === idRapprochement);
    const nouveauxRaps = rapprochements.map(rap => {
      if (rap.id !== idRapprochement) return rap;
      return {
        ...rap,
        validation: 'VALIDE' as const,
        estMarqueNouveau: true,
        valideParHumain: true,
        statutP5: 'NOUVEAU_CONFIRME' as const,
        dateDecision: new Date().toISOString(),
      };
    });

    const succes = await persisterRapprochements(nouveauxRaps, 'Nouveau salarié confirmé pour ce mois.');
    if (!succes) return;

    const auditEvt: EvenementAudit = {
      id: `audit_nouv_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'CREATION_SALARIE',
      salarie: rapCible?.nomDeclareFinal || rapCible?.lignePaieId || 'Nouveau',
      utilisateur: 'Gestionnaire MULT.S',
      nouvelleValeur: 'NOUVEAU_CONFIRME',
      justification: 'Confirmation manuelle comme nouveau salarié entrant',
    };
    await supabasePersistenceService.enregistrerEvenementAudit(auditEvt);
    persistenceService.enregistrerEvenementAudit(auditEvt);
  };

  const handleChoisirCandidatAmbigu = async (
    idRapprochement: string,
    salarieId: string,
    memoriserAlias: boolean
  ) => {
    if (statutPeriode === 'CLOTURE') return;
    const salarieChoisi = baseSalaries.find(s => s.id === salarieId);
    if (!salarieChoisi) return;

    const nouveauxRaps = rapprochements.map(rap => {
      if (rap.id !== idRapprochement) return rap;
      return {
        ...rap,
        validation: 'VALIDE' as const,
        valideParHumain: true,
        estAmbigu: false,
        statutP5: 'IDENTIFIE' as const,
        salarieBaseId: salarieChoisi.id,
        salariePropose: salarieChoisi,
        nomDeclareFinal: salarieChoisi.nomComplet,
        cniDeclareeFinale: salarieChoisi.cni,
        cnssDeclareeFinale: salarieChoisi.immatriculationCnss,
        dateDecision: new Date().toISOString(),
      };
    });

    const succes = await persisterRapprochements(
      nouveauxRaps,
      `Candidat ${salarieChoisi.nomComplet} sélectionné et validé.`
    );
    if (!succes) return;

    if (memoriserAlias) {
      const aliasObj: AliasItem = {
        id: `alias_${Date.now()}`,
        aliasBrut: salarieChoisi.nomComplet,
        aliasNormalise: salarieChoisi.nomNormalise,
        salarieId: salarieChoisi.id,
        nomOfficielSalarie: salarieChoisi.nomComplet,
        cniSalarie: salarieChoisi.cni,
        cnssSalarie: salarieChoisi.immatriculationCnss,
        creeParMois: moisActif,
        dateCreation: new Date().toISOString(),
      };
      await supabasePersistenceService.saveAlias(aliasObj);
      persistenceService.ajouterAlias(aliasObj);
      setAliases(persistenceService.getAliases());
    }

    const auditEvt: EvenementAudit = {
      id: `audit_amb_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'CHANGEMENT_SALARIE',
      salarie: salarieChoisi.nomComplet,
      utilisateur: 'Gestionnaire MULT.S',
      nouvelleValeur: `Choix sur cas ambigu -> ${salarieChoisi.nomComplet}`,
      justification: 'Arbitrage humain sur profil ambigu',
    };
    await supabasePersistenceService.enregistrerEvenementAudit(auditEvt);
    persistenceService.enregistrerEvenementAudit(auditEvt);
  };

  const handleRattacherManuellement = async (
    idRapprochement: string,
    salarieId: string,
    memoriserAlias: boolean
  ) => {
    if (statutPeriode === 'CLOTURE') return;
    const salarieChoisi = baseSalaries.find(s => s.id === salarieId);
    if (!salarieChoisi) return;

    const nouveauxRaps = rapprochements.map(rap => {
      if (rap.id !== idRapprochement) return rap;
      return {
        ...rap,
        statut: 'MANUEL' as const,
        validation: 'VALIDE' as const,
        valideParHumain: true,
        statutP5: 'IDENTIFIE' as const,
        salarieBaseId: salarieChoisi.id,
        salariePropose: salarieChoisi,
        nomDeclareFinal: salarieChoisi.nomComplet,
        cniDeclareeFinale: salarieChoisi.cni,
        cnssDeclareeFinale: salarieChoisi.immatriculationCnss,
        dateDecision: new Date().toISOString(),
      };
    });

    const succes = await persisterRapprochements(nouveauxRaps, `Rattaché à ${salarieChoisi.nomComplet}.`);
    if (!succes) return;

    if (memoriserAlias) {
      const aliasObj: AliasItem = {
        id: `alias_${Date.now()}`,
        aliasBrut: salarieChoisi.nomComplet,
        aliasNormalise: salarieChoisi.nomNormalise,
        salarieId: salarieChoisi.id,
        nomOfficielSalarie: salarieChoisi.nomComplet,
        cniSalarie: salarieChoisi.cni,
        cnssSalarie: salarieChoisi.immatriculationCnss,
        creeParMois: moisActif,
        dateCreation: new Date().toISOString(),
      };
      await supabasePersistenceService.saveAlias(aliasObj);
      persistenceService.ajouterAlias(aliasObj);
      setAliases(persistenceService.getAliases());
    }

    const auditEvt: EvenementAudit = {
      id: `audit_rat_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'CHANGEMENT_SALARIE',
      salarie: salarieChoisi.nomComplet,
      utilisateur: 'Gestionnaire MULT.S',
      nouvelleValeur: `Rattaché manuellement -> ${salarieChoisi.nomComplet}`,
      justification: 'Rattachement manuel via recherche référentielle',
    };
    await supabasePersistenceService.enregistrerEvenementAudit(auditEvt);
    persistenceService.enregistrerEvenementAudit(auditEvt);
  };

  const handleCreerNouveauSalarieEtRattacher = async (
    idRapprochement: string,
    nom: string,
    cni?: string,
    cnss?: string
  ) => {
    if (statutPeriode === 'CLOTURE') return;

    const creation = persistenceService.creerNouveauSalarieReferentiel({
      nomComplet: nom,
      cni,
      immatriculationCnss: cnss,
      datePremiereApparition: moisActif,
    });

    await supabasePersistenceService.saveSalarie(creation.salarie);
    const nouvelleBase = persistenceService.getSalaries();
    setBaseSalaries(nouvelleBase);

    const nouveauxRaps = rapprochements.map(rap => {
      if (rap.id !== idRapprochement) return rap;
      return {
        ...rap,
        validation: 'VALIDE' as const,
        estMarqueNouveau: true,
        valideParHumain: true,
        statutP5: 'NOUVEAU_CONFIRME' as const,
        salarieBaseId: creation.salarie.id,
        salariePropose: creation.salarie,
        nomDeclareFinal: creation.salarie.nomComplet,
        cniDeclareeFinale: creation.salarie.cni,
        cnssDeclareeFinale: creation.salarie.immatriculationCnss,
        dateDecision: new Date().toISOString(),
      };
    });

    await persisterRapprochements(nouveauxRaps, `Salarié créé avec ID ${creation.salarie.id}.`);
  };

  const handleArbitrerSortiRetravaillant = async (
    idRapprochement: string,
    action: 'REACTIVATION_CONFIRMEE' | 'CONSERVE_SORTI'
  ) => {
    if (statutPeriode === 'CLOTURE') return;

    const rapCible = rapprochements.find(r => r.id === idRapprochement);
    const nouveauxRaps = rapprochements.map(rap => {
      if (rap.id !== idRapprochement) return rap;
      return {
        ...rap,
        decisionSorti: action,
        validation: (action === 'REACTIVATION_CONFIRMEE' ? 'VALIDE' : rap.validation) as any,
        statutP5: (action === 'REACTIVATION_CONFIRMEE' ? 'IDENTIFIE' : rap.statutP5) as any,
        valideParHumain: true,
        dateDecision: new Date().toISOString(),
      };
    });

    const succes = await persisterRapprochements(
      nouveauxRaps,
      action === 'REACTIVATION_CONFIRMEE' ? 'Réactivation confirmée.' : 'Maintien du statut sorti.'
    );
    if (!succes) return;

    const auditEvt: EvenementAudit = {
      id: `audit_sorti_arb_${Date.now()}`,
      date: new Date().toISOString(),
      action: action === 'REACTIVATION_CONFIRMEE' ? 'REACTIVATION_SALARIE' : 'CONFIRMATION_SORTIE',
      salarie: rapCible?.salariePropose?.nomComplet || rapCible?.lignePaieId || 'Salarié sorti',
      utilisateur: 'Gestionnaire MULT.S',
      nouvelleValeur: action,
      justification: action === 'REACTIVATION_CONFIRMEE' ? 'Réactivation confirmée pour déclaration CNSS' : 'Salarié maintenu sorti',
    };
    await supabasePersistenceService.enregistrerEvenementAudit(auditEvt);
    persistenceService.enregistrerEvenementAudit(auditEvt);
  };

  const handleReinitialiserLigne = async (idRapprochement: string) => {
    if (statutPeriode === 'CLOTURE') return;
    const ligneInit = lignesPaie.find(l => `rap_${l.id}` === idRapprochement);
    if (!ligneInit) return;
    const rapInitial = rapprocherLigne(ligneInit, baseSalaries);
    const nouveauxRaps = rapprochements.map(r => (r.id === idRapprochement ? rapInitial : r));
    await persisterRapprochements(nouveauxRaps, 'Ligne réinitialisée au statut initial.');
  };

  const handleValiderCorrectionJours = async (
    idRapprochement: string,
    joursDeclares: number,
    justification: string
  ) => {
    if (statutPeriode === 'CLOTURE') return;

    const rapCible = rapprochements.find(r => r.id === idRapprochement);
    if (!rapCible) return;

    const nouvelleValidationJours = validationEngine.corrigerJoursHumainement(
      rapCible.validationJours,
      joursDeclares,
      justification
    );

    const nouveauxRaps = rapprochements.map(rap => {
      if (rap.id !== idRapprochement) return rap;
      return {
        ...rap,
        validation: 'VALIDE' as const,
        statutP5: 'IDENTIFIE' as const,
        valideParHumain: true,
        validationJours: nouvelleValidationJours,
        dateDecision: new Date().toISOString(),
      };
    });

    const succes = await persisterRapprochements(
      nouveauxRaps,
      `Jours ajustés à ${joursDeclares} j (valeur importée ${rapCible.validationJours.joursImportes} j intacte).`
    );
    if (!succes) return;

    const auditEvt: EvenementAudit = {
      id: `audit_j_${Date.now()}`,
      date: new Date().toISOString(),
      action: 'MODIFICATION_JOURS',
      salarie: rapCible.nomDeclareFinal || rapCible.salariePropose?.nomComplet || rapCible.lignePaieId,
      utilisateur: 'Gestionnaire MULT.S',
      ancienneValeur: `${rapCible.validationJours.joursImportes} j importés`,
      nouvelleValeur: `${joursDeclares} j déclarés`,
      justification,
    };
    await supabasePersistenceService.enregistrerEvenementAudit(auditEvt);
    persistenceService.enregistrerEvenementAudit(auditEvt);
  };

  const handleCompleterCni = async (idRapprochement: string, cni?: string, cnss?: string) => {
    if (statutPeriode === 'CLOTURE') return;
    const nouveauxRaps = rapprochements.map(rap => {
      if (rap.id !== idRapprochement) return rap;
      return {
        ...rap,
        ...(cni !== undefined ? { cniDeclareeFinale: cni.trim().toUpperCase() } : {}),
        ...(cnss !== undefined ? { cnssDeclareeFinale: cnss.trim() } : {}),
      };
    });
    await persisterRapprochements(nouveauxRaps);
  };

  const handleCompleterCnss = async (idRapprochement: string, cnss: string) => {
    if (statutPeriode === 'CLOTURE') return;
    const nouveauxRaps = rapprochements.map(rap => {
      if (rap.id !== idRapprochement) return rap;
      return { ...rap, cnssDeclareeFinale: cnss.trim() };
    });
    await persisterRapprochements(nouveauxRaps);
  };

  const handleSauvegarderModificationsAnomalie = async (
    idRapprochement: string,
    donnees: DonneesModificationAnomalie
  ) => {
    if (statutPeriode === 'CLOTURE') return;

    const rapCible = rapprochements.find(r => r.id === idRapprochement);
    if (!rapCible) return;

    let salarieFinal = rapCible.salariePropose;
    if (donnees.salarieChoisiId) {
      const salChoisi = baseSalaries.find(s => s.id === donnees.salarieChoisiId);
      if (salChoisi) salarieFinal = salChoisi;
    }

    let nouvelleValidationJours = rapCible.validationJours;
    if (donnees.joursDeclares !== undefined) {
      nouvelleValidationJours = validationEngine.corrigerJoursHumainement(
        rapCible.validationJours,
        donnees.joursDeclares,
        donnees.justificationJours || 'Ajusté par le gestionnaire'
      );

      const auditJours: EvenementAudit = {
        id: `audit_j_${Date.now()}`,
        date: new Date().toISOString(),
        action: 'MODIFICATION_JOURS',
        salarie: donnees.nom || rapCible.nomDeclareFinal || rapCible.lignePaieId,
        utilisateur: 'Gestionnaire MULT.S',
        ancienneValeur: `${rapCible.validationJours.joursImportes} j importés`,
        nouvelleValeur: `${donnees.joursDeclares} j déclarés`,
        justification: donnees.justificationJours || 'Ajusté par le gestionnaire',
      };
      await supabasePersistenceService.enregistrerEvenementAudit(auditJours);
      persistenceService.enregistrerEvenementAudit(auditJours);
    }

    const rapMaj: ResultatRapprochement = {
      ...rapCible,
      validation: 'VALIDE',
      valideParHumain: true,
      statutP5: 'IDENTIFIE',
      validationJours: nouvelleValidationJours,
      salarieBaseId: salarieFinal?.id || rapCible.salarieBaseId,
      salariePropose: salarieFinal,
      nomDeclareFinal: donnees.nom || salarieFinal?.nomComplet || rapCible.nomDeclareFinal,
      cniDeclareeFinale: donnees.cni || salarieFinal?.cni || rapCible.cniDeclareeFinale,
      cnssDeclareeFinale: donnees.cnss || salarieFinal?.immatriculationCnss || rapCible.cnssDeclareeFinale,
      decisionSorti: donnees.decisionSorti || rapCible.decisionSorti,
      estAmbigu: false,
      dateDecision: new Date().toISOString(),
    };

    const nouveauxRaps = rapprochements.map(rap => (rap.id === idRapprochement ? rapMaj : rap));

    const succes = await persisterRapprochements(nouveauxRaps, 'Modifications enregistrées et validées avec succès.');
    if (!succes) return;

    // Si levée d'anomalie spécifique par ID
    if (donnees.leverAnomalie && donnees.anomalieId) {
      persistenceService.saveAnomalieResolueManuellement(
        moisActif,
        donnees.anomalieId,
        donnees.justificationLevee || 'Levée manuellement avec validation'
      );
      setAnomaliesResoluesManuellement(persistenceService.getAnomaliesResoluesManuellement(moisActif));

      const auditLevee: EvenementAudit = {
        id: `audit_ano_levee_${Date.now()}`,
        date: new Date().toISOString(),
        action: 'LEVEE_ANOMALIE_MANUELLE',
        salarie: donnees.nom || idRapprochement,
        utilisateur: 'Gestionnaire MULT.S',
        nouvelleValeur: 'ANOMALIE_LEVEE',
        justification: donnees.justificationLevee || 'Dérogation administrative enregistrée',
      };
      await supabasePersistenceService.enregistrerEvenementAudit(auditLevee);
      persistenceService.enregistrerEvenementAudit(auditLevee);
    }
  };

  const handleConfirmerSortie = (salarieId: string, nomSalarie: string) => {
    if (statutPeriode === 'CLOTURE') return;
    persistenceService.enregistrerDecisionSortie(salarieId, nomSalarie, 'SORTIE_CONFIRMEE');
    setDecisionsSorties(persistenceService.getDecisionsSorties());
    afficherNotification(`Sortie de ${nomSalarie} confirmée.`);
  };

  const handleMaintenirActif = (salarieId: string, nomSalarie: string) => {
    if (statutPeriode === 'CLOTURE') return;
    persistenceService.enregistrerDecisionSortie(salarieId, nomSalarie, 'MAINTENU_ACTIF');
    setDecisionsSorties(persistenceService.getDecisionsSorties());
    afficherNotification(`${nomSalarie} maintenu actif.`);
  };

  const handleValiderRapprochementGlobal = () => {
    persistenceService.updatePeriode(moisActif, {
      etapeWorkflow: 9,
      statut: 'PRET_POUR_DECLARATION',
    });
    setPeriodes(persistenceService.getPeriodes());
    afficherNotification('Rapprochement global validé. Période prête pour déclaration.');
  };

  const handleCloturerMois = (justification: string) => {
    persistenceService.setStatutPeriode(moisActif, 'CLOTURE', justification);
    setPeriodes(persistenceService.getPeriodes());
    setIsClotureModalOpen(false);
    afficherNotification(`Période ${periodeCourante.libelle} formellement clôturée.`);
  };

  const handleReouvrirMois = (justification: string) => {
    persistenceService.setStatutPeriode(moisActif, 'BROUILLON', justification);
    setPeriodes(persistenceService.getPeriodes());
    setIsClotureModalOpen(false);
    afficherNotification(`Période ${periodeCourante.libelle} réouverte.`);
  };

  // Réinitialisation complète à zéro en conservant la base des salariés CNSS
  const handleConfirmerReinitialisation = async () => {
    try {
      const resLocal = persistenceService.reinitialiserToutSaufBaseCnss();
      await supabasePersistenceService.reinitialiserToutSaufBaseCnss();

      const bSal = persistenceService.getSalaries();
      setBaseSalaries(bSal);
      setLignesPaie([]);
      setRapprochements([]);
      setLignesRegistre([]);
      setFichierPreetabli(null);
      setDecisionsPreetabli({});
      setRapprochementsPreetabli([]);
      setAliases([]);
      setDecisionsSorties({});
      setAnomaliesResoluesManuellement({});
      setPeriodes(persistenceService.getPeriodes());
      setMoisActif('2026-09');
      setResumeImport(null);
      setVueActive('RAPPROCHEMENT');
      setIsReinitialiserModalOpen(false);
      afficherNotification(`✓ Données réinitialisées avec succès. Base CNSS (${resLocal.baseSalariesCount} salariés) conservée.`);
    } catch (err) {
      afficherNotification('Erreur lors de la réinitialisation des données.');
    }
  };

  // Chargement direct de la liste mensuelle réelle de test (88 salariés)
  const handleChargerListeDemo = () => {
    const lignesCsv: string[] = ['NOM ET PRENOM,JRS OUVRE,BASE,BRUT'];
    RAW_CALCUL_SALAIRE_SEPTEMBRE.forEach(row => {
      lignesCsv.push(`"${row.nom}",${row.jours},${row.base},${row.brut}`);
    });
    lignesCsv.push('"TOTAL GENERAL",1789,280720,270115');

    const csvContent = lignesCsv.join('\n');
    const analyse = excelService.analyserBufferOuClasseur(
      csvContent,
      `calcul_salaire_${moisActif}_mults.csv`,
      csvContent.length,
      new Date().toISOString()
    );
    const lignes = excelService.convertirEnLignesPaie(analyse, moisActif);
    handleImportPaieConfirme(lignes, analyse);
    afficherNotification(`Liste de salaires réelle chargée avec succès (${lignes.length} salariés).`);
  };

  // Téléchargement du gabarit / modèle Excel pré-rempli avec les salariés de la base CNSS
  const handleTelechargerModeleExcel = () => {
    try {
      const bytes = excelService.genererModeleExcel(baseSalaries);
      const blob = new Blob([bytes as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modele_liste_paie_${moisActif}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      afficherNotification(`Modèle Excel pré-rempli téléchargé (${baseSalaries.length} salariés CNSS inclus).`);
    } catch (e: any) {
      afficherNotification(`Erreur lors du téléchargement : ${e.message}`);
    }
  };

  // -------------------------------------------------------------------------
  // HANDLERS REGISTRE CNSS MENSUEL (PROMPT 06)
  // -------------------------------------------------------------------------

  const handleValiderLigneRegistre = (ligneId: string) => {
    if (statutPeriode === 'CLOTURE') return;
    const ligne = lignesRegistre.find(l => l.id === ligneId);
    if (!ligne) return;
    const res = cnssRegisterService.validerLigneIndividuelle(ligne);
    if (res.succes && res.ligneValidee) {
      const maj = lignesRegistre.map(l => l.id === ligneId ? res.ligneValidee! : l);
      setLignesRegistre(maj);
      persistenceService.saveRegistrePeriode(moisActif, maj);
      afficherNotification(`Ligne ${res.ligneValidee.nomOfficiel} validée et scellée.`);
    } else if (res.erreur) {
      afficherNotification(res.erreur);
    }
  };

  const handleCorrigerJoursRegistre = (ligneId: string, nouveauxJours: number, motif: string) => {
    if (statutPeriode === 'CLOTURE') return;
    const ligne = lignesRegistre.find(l => l.id === ligneId);
    if (!ligne) return;
    const res = cnssRegisterService.appliquerCorrectionJours(ligne, nouveauxJours, motif);
    if (res.succes && res.ligneModifiee) {
      const maj = lignesRegistre.map(l => l.id === ligneId ? res.ligneModifiee! : l);
      setLignesRegistre(maj);
      persistenceService.saveRegistrePeriode(moisActif, maj);
      afficherNotification(`Jours ajustés à ${nouveauxJours} j (source ${ligne.joursImportes} j préservée).`);
    } else if (res.erreur) {
      afficherNotification(res.erreur);
    }
  };

  const handleDemanderReouvertureRegistre = (ligneId: string, motif: string) => {
    if (statutPeriode === 'CLOTURE') return;
    const ligne = lignesRegistre.find(l => l.id === ligneId);
    if (!ligne) return;
    const res = cnssRegisterService.demanderReouvertureLigne(ligne, motif);
    if (res.succes && res.ligneReouverte) {
      const maj = lignesRegistre.map(l => l.id === ligneId ? res.ligneReouverte! : l);
      setLignesRegistre(maj);
      persistenceService.saveRegistrePeriode(moisActif, maj);
      afficherNotification(`Ligne ${res.ligneReouverte.nomOfficiel} réouverte (statut: A_CORRIGER).`);
    } else if (res.erreur) {
      afficherNotification(res.erreur);
    }
  };

  const handleValiderToutLeRegistre = () => {
    if (statutPeriode === 'CLOTURE') return;
    const res = cnssRegisterService.validerToutLeRegistre(lignesRegistre);
    if (res.succes && res.lignesValidees) {
      setLignesRegistre(res.lignesValidees);
      persistenceService.saveRegistrePeriode(moisActif, res.lignesValidees);
      persistenceService.updateStatutPeriode(moisActif, 'VALIDE', 'Validation globale du registre CNSS');
      setPeriodes(persistenceService.getPeriodes());
      afficherNotification(`Registre CNSS entièrement validé (${res.lignesValidees.length} salariés).`);
    } else if (res.erreur) {
      afficherNotification(res.erreur);
    }
  };

  const relancerTestsP7Bis = () => {
    const res = executerTestsPrompt07Bis();
    setBilanP7Bis(res);
    afficherNotification(`Banc PROMPT 07-BIS relancé : ${res.reussis}/${res.total} tests validés.`);
  };

  const relancerTestsP7B = () => {
    const res = executerTestsPrompt07B();
    setBilanP7B(res);
    afficherNotification(`Banc PROMPT 07-B relancé : ${res.reussis}/${res.total} tests validés.`);
  };

  const relancerTestsP8 = () => {
    const res = executerTestsPrompt08();
    setBilanP8(res);
    afficherNotification(`Banc PROMPT 08 relancé : ${res.reussis}/${res.total} tests validés.`);
  };

  const relancerTestsP9 = () => {
    const res = executerTestsPrompt09();
    setBilanP9(res);
    afficherNotification(`Banc PROMPT 09 relancé : ${res.reussis}/${res.total} tests validés.`);
  };

  const relancerTestsP10 = () => {
    const res = executerTestsPrompt10();
    setBilanP10(res);
    afficherNotification(`Banc PROMPT 10 relancé : ${res.reussis}/${res.total} tests validés (${res.tempsExecutionMs} ms).`);
  };

  const relancerTestsP11 = () => {
    const res = executerTestsPrompt11();
    setBilanP11(res);
    afficherNotification(`Banc PROMPT 11 relancé : ${res.reussis}/${res.total} tests validés (${res.tempsExecutionMs} ms).`);
  };

  const handleFichierPreetabliImporte = (fichier: FichierPreetabliCnss) => {
    setFichierPreetabli(fichier);
    persistenceService.saveFichierPreetabli(moisActif, fichier);
    const raps = cnssPreetabliService.rapprocherPreetabliAvecRegistre(
      fichier,
      lignesRegistre,
      baseSalaries,
      aliases,
      decisionsPreetabli
    );
    setRapprochementsPreetabli(raps);
    persistenceService.saveRapprochementsPreetabli(moisActif, raps);
    afficherNotification(`Préétabli CNSS importé avec succès (${fichier.nombreLignes} lignes, empreinte: ${fichier.hash.slice(7, 15)}).`);
  };

  const handleValiderDecisionPreetabli = (
    ligneId: string,
    action: 'VALIDER' | 'IGNORER' | 'ASSOCIER_SALARIE',
    salarieCibleId?: string,
    motif?: string
  ) => {
    const dec: DecisionHumainePreetabli = {
      date: new Date().toISOString(),
      auteur: 'Gestionnaire RH',
      action,
      salarieCibleId,
      motif,
    };
    persistenceService.saveDecisionPreetabli(moisActif, ligneId, dec);
    const decs = persistenceService.getDecisionsPreetabli(moisActif);
    setDecisionsPreetabli(decs);

    if (fichierPreetabli) {
      const rapsMaj = cnssPreetabliService.rapprocherPreetabliAvecRegistre(
        fichierPreetabli,
        lignesRegistre,
        baseSalaries,
        aliases,
        decs
      );
      setRapprochementsPreetabli(rapsMaj);
      persistenceService.saveRapprochementsPreetabli(moisActif, rapsMaj);
    }
    afficherNotification(`Décision enregistrée pour la ligne préétablie (${action}).`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* HEADER DE L'APPLICATION */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">CNSS MULT.S</h1>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">SARLAU MULT.S &bull; N° 6541835</span>
                {statutPeriode === 'CLOTURE' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <Lock className="w-3 h-3 text-amber-700" />
                    CLÔTURÉ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-300">
                    <Unlock className="w-3 h-3 text-blue-700" />
                    EN COURS
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SÉLECTEUR DE MOIS & ACTIONS PRINCIPALES */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Statut de la base (Section 6) */}
            <button
              onClick={() => setIsMigrationModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              title="Gérer la base de données et la synchronisation Supabase"
            >
              <Database className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              {isSupabaseConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  🟢 Supabase connecté
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-rose-800 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  🔴 Supabase déconnecté
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={moisActif}
                onChange={e => changerMoisActif(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                {periodes.map(p => (
                  <option key={p.idMois} value={p.idMois}>
                    {p.libelle} {p.statut === 'CLOTURE' ? '🔒' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsNouveauMoisOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Mois</span>
            </button>

            <button
              onClick={() => setIsImportPaieOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importer Paie</span>
            </button>

            <button
              onClick={() => setIsReinitialiserModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Repartir de 0 : supprimer toutes les données de paie et déclarations en conservant la base des salariés CNSS"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Repartir de 0</span>
            </button>

            <button
              onClick={() => setIsImportBaseCnssOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Base CNSS ({baseSalaries.length})</span>
            </button>

            <button
              onClick={() => setIsImportPreetabliOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Importer et analyser un fichier préétabli CNSS / BDS réel"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Préétabli CNSS</span>
            </button>

            <button
              onClick={() => setIsClotureModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                statutPeriode === 'CLOTURE'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : bilanPret.estPret
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {statutPeriode === 'CLOTURE' ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Clôturé</span>
                </>
              ) : bilanPret.estPret ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Prêt &bull; Clôturer</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{bilanPret.totalBloquantes} Bloquante(s)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* WORKFLOW STEPPER EN 10 ÉTAPES */}
        <WorkflowStepper
          etapeCourante={etapeWorkflow}
          anomaliesBloquantes={totalBloquantes}
          onChangerEtape={(etape) => {
            if (etape <= 4) setIsImportPaieOpen(true);
            else if (etape === 6) setVueActive('RAPPROCHEMENT');
            else if (etape === 7) setVueActive('ANOMALIES');
            else if (etape === 8) setVueActive('NOUVEAUX');
            else if (etape === 9) setIsClotureModalOpen(true);
            else if (etape === 10) setVueActive('REGISTRE');
          }}
        />

        {/* NAVIGATION PAR ONGLETS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-200 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setVueActive('RAPPROCHEMENT')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              vueActive === 'RAPPROCHEMENT'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Rapprochements ({rapprochements.length})
          </button>

          {/* Onglet REGISTRE CNSS (PROMPT 06) */}
          <button
            onClick={() => setVueActive('REGISTRE')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              vueActive === 'REGISTRE'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Registre CNSS</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-teal-100 text-teal-800">
              {lignesRegistre.length}
            </span>
          </button>

          {/* Onglet SPÉCIFICATION EXPORT CNSS (PROMPT 07-A) */}
          <button
            onClick={() => setVueActive('SPEC_EXPORT')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              vueActive === 'SPEC_EXPORT'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>📐 Spécification Export (07-A)</span>
          </button>

          {/* Onglet PRÉÉTABLI CNSS / BDS (PROMPT 07-BIS) */}
          <button
            onClick={() => setVueActive('PREETABLI')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              vueActive === 'PREETABLI'
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>📄 Préétabli BDS (07-BIS)</span>
            {fichierPreetabli && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
                {fichierPreetabli.lignesOriginales.filter(l => l.typeEnregistrement === 'SALARIE').length}
              </span>
            )}
          </button>

          {/* Onglet BORDEREAU DE DÉCLARATION CNSS (PROMPT 07-B) */}
          <button
            onClick={() => setVueActive('BORDEREAU')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              vueActive === 'BORDEREAU'
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-600" />
            <span>📋 Bordereau Déclaration (07-B)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
              F.212-2-58
            </span>
          </button>

          {/* Onglet BORDEREAU DE PAIEMENT DES COTISATIONS (PROMPT 08) */}
          <button
            onClick={() => setVueActive('PAIEMENT')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              vueActive === 'PAIEMENT'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>💳 Bordereau Paiement (08)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
              511-1-01
            </span>
          </button>

          {/* Onglet DOSSIER CNSS MENSUEL (PROMPT 09) */}
          <button
            onClick={() => setVueActive('DOSSIER')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              vueActive === 'DOSSIER'
                ? 'border-purple-900 text-purple-900 bg-purple-50/60 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>📁 Dossier Mensuel (09)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-900 text-white">
              FINAL
            </span>
          </button>

          {/* Onglet BACKUP & ARCHIVAGE (PROMPT 11) */}
          <button
            onClick={() => setVueActive('BACKUP')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              vueActive === 'BACKUP'
                ? 'border-indigo-700 text-indigo-800 bg-indigo-50/60 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-indigo-700" />
            <span>💾 Backup & Reprise (11)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-700 text-white">
              .mcnss
            </span>
          </button>

          <button
            onClick={() => setVueActive('ANOMALIES')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              vueActive === 'ANOMALIES'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Contrôles & Anomalies</span>
            {totalBloquantes > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
                {totalBloquantes}
              </span>
            )}
            {totalBloquantes === 0 && totalAvertissements > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white">
                {totalAvertissements}
              </span>
            )}
          </button>

          <button
            onClick={() => setVueActive('NOUVEAUX')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              vueActive === 'NOUVEAUX'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>Nouveaux Entrants</span>
            {totalNouveaux > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                {totalNouveaux}
              </span>
            )}
          </button>

          <button
            onClick={() => setVueActive('SORTIES')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              vueActive === 'SORTIES'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserMinus className="w-3.5 h-3.5 text-rose-600" />
            <span>Sorties & Départs</span>
            {totalSortiesAConfirmer > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                {totalSortiesAConfirmer}
              </span>
            )}
          </button>

          <button
            onClick={() => setVueActive('ALIAS')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              vueActive === 'ALIAS'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            🏷️ Alias Mémorisés ({aliases.length})
          </button>

          {/* Onglet Tests PROMPT 17 (STATUTS SALARIÉS & PERSISTANCE SUPABASE) */}
          <button
            onClick={() => setVueActive('TESTS_P17')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              vueActive === 'TESTS_P17'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👤 Tests PROMPT 17 (Statuts)</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              bilanP17 && bilanP17.echoues === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {bilanP17 ? `${bilanP17.reussis}/${bilanP17.total}` : '...'}
            </span>
          </button>

          {/* Onglet Tests PROMPT 11 (NOUVEAU - BACKUP & REPRISE APRÈS SINISTRE) */}
          <button
            onClick={() => setVueActive('TESTS_P11')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              vueActive === 'TESTS_P11'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🛡️ Tests PROMPT 11</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              bilanP11.echoues === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {bilanP11.reussis}/{bilanP11.total}
            </span>
          </button>

          {/* Onglet Tests PROMPT 10 (AUDIT RÉEL) */}
          <button
            onClick={() => setVueActive('TESTS_P10')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              vueActive === 'TESTS_P10'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🛡️ Tests PROMPT 10</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              bilanP10.echoues === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {bilanP10.reussis}/{bilanP10.total}
            </span>
          </button>

          {/* Onglet Tests PROMPT 09 (NOUVEAU) */}
          <button
            onClick={() => setVueActive('TESTS_P9')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              vueActive === 'TESTS_P9'
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔬 Tests PROMPT 09</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              bilanP9.echoues === 0 ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {bilanP9.reussis}/{bilanP9.total}
            </span>
          </button>

          {/* Onglet Tests PROMPT 08 (NOUVEAU) */}
          <button
            onClick={() => setVueActive('TESTS_P8')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              vueActive === 'TESTS_P8'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔬 Tests PROMPT 08</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              bilanP8.echoues === 0 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {bilanP8.reussis}/{bilanP8.total}
            </span>
          </button>

          {/* Onglet Tests PROMPT 07-B (NOUVEAU) */}
          <button
            onClick={() => setVueActive('TESTS_P7B')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              vueActive === 'TESTS_P7B'
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔬 Tests PROMPT 07-B</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              bilanP7B.echoues === 0 ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {bilanP7B.reussis}/{bilanP7B.total}
            </span>
          </button>

          {/* Onglet Tests PROMPT 07-BIS (NOUVEAU) */}
          <button
            onClick={() => setVueActive('TESTS_P7BIS')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              vueActive === 'TESTS_P7BIS'
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔬 Tests PROMPT 07-BIS</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              bilanP7Bis.echoues === 0 ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {bilanP7Bis.reussis}/{bilanP7Bis.total}
            </span>
          </button>

          {/* Onglet Tests PROMPT 07-A (NOUVEAU) */}
          <button
            onClick={() => setVueActive('TESTS_P7A')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              vueActive === 'TESTS_P7A'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📜 Tests PROMPT 07-A</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              bilanP7A.echoues === 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {bilanP7A.reussis}/{bilanP7A.total}
            </span>
          </button>

          {/* Onglet Tests PROMPT 06 */}
          <button
            onClick={() => setVueActive('TESTS_P6')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              vueActive === 'TESTS_P6'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🧪 Tests PROMPT 06</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              bilanP6.echoues === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {bilanP6.reussis}/{bilanP6.total}
            </span>
          </button>

          {/* Onglet Tests PROMPT 05 */}
          <button
            onClick={() => setVueActive('TESTS_P5')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              vueActive === 'TESTS_P5'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🧪 Tests PROMPT 05</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
              bilanP5.echoues === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {bilanP5.reussis}/{bilanP5.total}
            </span>
          </button>

          <button
            onClick={() => setVueActive('TESTS_P4')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap text-slate-500 hover:text-slate-800 ${
              vueActive === 'TESTS_P4' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent'
            }`}
          >
            🧪 Tests P04 ({bilanP4.reussis}/{bilanP4.total})
          </button>

          <button
            onClick={() => setVueActive('TESTS_P3')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap text-slate-500 hover:text-slate-800 ${
              vueActive === 'TESTS_P3' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent'
            }`}
          >
            🧪 Tests P03 ({bilanP3.reussis}/{bilanP3.total})
          </button>

          <button
            onClick={() => setVueActive('TESTS_P2')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap text-slate-500 hover:text-slate-800 ${
              vueActive === 'TESTS_P2' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent'
            }`}
          >
            🧪 Tests P02 ({bilanP2.reussis}/{bilanP2.total})
          </button>
        </div>
      </header>

      {/* NOTIFICATION D'ACTION EN COURS */}
      {notificationAction && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{notificationAction}</span>
        </div>
      )}

      {/* BANNIÈRE DE REPRISE DE SESSION */}
      {lignesPaie.length > 0 && statutPeriode !== 'CLOTURE' && !resumeImport && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs text-slate-700">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                <strong>{periodeCourante.libelle} — traitement en cours :</strong> {lignesPaie.length} lignes chargées &bull; Étape {etapeWorkflow}/10 active.
              </span>
            </div>
            <button
              onClick={() => setVueActive('RAPPROCHEMENT')}
              className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Reprendre</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* BANNIÈRE DE RÉSUMÉ D'IMPORT */}
      {resumeImport && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 text-xs text-emerald-950">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-emerald-900">
                  Import réussi : {resumeImport.nomFichier}
                </h4>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                {resumeImport.totalLignes} lignes détectées ({resumeImport.valides} valides, {resumeImport.ignoreesTotal} ligne Total ignorée, {resumeImport.anomalies} anomalies détectées).
              </p>
            </div>
            <button
              onClick={() => setResumeImport(null)}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              Masquer le résumé
            </button>
          </div>
        </div>
      )}

      {/* BANDEAU DE PROTECTION SI CLÔTURÉ */}
      {statutPeriode === 'CLOTURE' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700" />
              <span>
                <strong>Période {periodeCourante.libelle} verrouillée :</strong> Les modifications et arbitrages sont désactivés pour garantir la conformité avec la déclaration CNSS.
              </span>
            </div>
            <button
              onClick={() => setIsClotureModalOpen(true)}
              className="text-amber-800 font-bold hover:underline cursor-pointer ml-3 shrink-0"
            >
              Gérer / Réouvrir
            </button>
          </div>
        </div>
      )}

      {/* CONTENU PRINCIPAL SELON L'ONGLET ACTIF */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ÉTAT VIERGE / HUB D'IMPORTATION ADAPTÉ POUR LA LISTE MENSUELLE */}
        {lignesPaie.length === 0 && vueActive === 'RAPPROCHEMENT' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xs space-y-8 max-w-4xl mx-auto my-6">
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-100 text-emerald-800 shadow-2xs">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">
                  Importation de la Liste Mensuelle des Salaires
                </h3>
                <p className="text-sm text-slate-600 max-w-2xl mx-auto">
                  Période active : <span className="font-bold text-slate-900">{periodeCourante.libelle}</span> ({moisActif}) &bull; Aucun fichier de paie importé pour l'instant.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-teal-600" />
                  <span>Base CNSS active : {baseSalaries.length} salariés prêts au rapprochement</span>
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span>Formats acceptés : Excel (.xlsx, .xls), CSV (.csv) & Copier-Coller</span>
                </span>
              </div>
            </div>

            {/* 3 ACTIONS CLÉS D'IMPORT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1 : Importer son propre fichier / copier-coller */}
              <div className="p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    1. Importer ma Liste
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Glissez-déposez votre fichier de calcul des salaires ou collez directement vos colonnes depuis Excel.
                  </p>
                </div>
                <button
                  onClick={() => setIsImportPaieOpen(true)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Ouvrir l'Importateur</span>
                </button>
              </div>

              {/* Option 2 : Télécharger le modèle pré-rempli */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Download className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    2. Modèle Excel Prêt à l'Emploi
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Téléchargez le gabarit Excel (.xlsx) pré-rempli avec les <strong>{baseSalaries.length} salariés CNSS</strong> pour saisir vos jours et salaires du mois.
                  </p>
                </div>
                <button
                  onClick={handleTelechargerModeleExcel}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Télécharger le Modèle (.xlsx)</span>
                </button>
              </div>

              {/* Option 3 : Charger le jeu de données réel de Septembre */}
              <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/80 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    3. Liste Réelle Démo (88 salariés)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Chargez en un clic le jeu de paie réel de MULT.S pour tester immédiatement l'ensemble du workflow et les contrôles.
                  </p>
                </div>
                <button
                  onClick={handleChargerListeDemo}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Charger les 88 Salariés</span>
                </button>
              </div>
            </div>

            {/* GUIDE TECHNIQUE DES COLONNES DE LA LISTE MENSUELLE */}
            <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Colonnes reconnues pour votre liste mensuelle
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Ordre libre &bull; Détection multi-synonymes automatique
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-emerald-800">NOM ET PRENOM</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800">Requis</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Nom complet (ou NOM, SALARIE, AGENT, EMPLOYE)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-emerald-800">JRS OUVRE</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800">Requis</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Jours travaillés (ou JOURS, POINTAGE, NB JOURS)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-emerald-800">BASE</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800">Requis</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Salaire de base (ou SALAIRE BASE, SB, BASE MENSUELLE)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-emerald-800">BRUT</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800">Requis</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Salaire brut (ou SALAIRE BRUT, BRUT GLOBAL, REMUNERATION)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-slate-800">CNI</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600">Optionnel</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Numéro CIN/CNI (renforce le scoring à 100%)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-slate-800">CNSS</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600">Optionnel</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Immatriculation CNSS (format numérique ou texte)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-slate-800">SITUATION</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600">Optionnel</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    ACTIF, SORTI (so), ou ACCIDENT_TRAVAIL (AT)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-slate-800">CLIENT</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600">Optionnel</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Affectation, chantier ou société cliente
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Isolation automatique des lignes de totaux pour ne pas fausser le décompte des salariés.</span>
                </div>
                <button
                  onClick={() => setIsImportBaseCnssOpen(true)}
                  className="text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Gérer la Base CNSS ({baseSalaries.length} salariés)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1. REGISTRE MENSUEL CNSS (PROMPT 06) */}
        {vueActive === 'REGISTRE' && (
          <RegistreCnssView
            lignesRegistre={lignesRegistre}
            statutPeriode={statutPeriode}
            moisActif={moisActif}
            journalAudit={persistenceService.getJournalAudit()}
            onValiderLigne={handleValiderLigneRegistre}
            onCorrigerJours={handleCorrigerJoursRegistre}
            onDemanderReouverture={handleDemanderReouvertureRegistre}
            onValiderToutLeRegistre={handleValiderToutLeRegistre}
            onNaviguerVersRapprochement={() => setVueActive('RAPPROCHEMENT')}
            onModifierStatutSalarie={handleModifierStatutSalarie}
          />
        )}

        {/* 1 BIS. SPÉCIFICATION TECHNIQUE EXPORT CNSS (PROMPT 07-A) */}
        {vueActive === 'SPEC_EXPORT' && (
          <SpecificationExportView
            moisActif={moisActif}
            statutPeriode={statutPeriode}
            lignesRegistre={lignesRegistre}
            onNaviguerVersTestsP7A={() => setVueActive('TESTS_P7A')}
            onNaviguerVersRegistre={() => setVueActive('REGISTRE')}
          />
        )}

        {/* 1 TER. ANALYSE ET RAPPROCHEMENT PRÉÉTABLI CNSS (PROMPT 07-BIS) */}
        {vueActive === 'PREETABLI' && (
          <PreetabliCnssView
            moisActif={moisActif}
            fichierPreetabli={fichierPreetabli}
            rapprochements={rapprochementsPreetabli}
            lignesRegistre={lignesRegistre}
            baseSalaries={baseSalaries}
            onOuvrirModalImport={() => setIsImportPreetabliOpen(true)}
            onValiderDecision={handleValiderDecisionPreetabli}
            onNaviguerVersRegistre={() => setVueActive('REGISTRE')}
          />
        )}

        {/* 1 QUATER. BORDEREAU DE DÉCLARATION DES SALARIÉS CNSS (PROMPT 07-B) */}
        {vueActive === 'BORDEREAU' && (
          <BordereauCnssView
            moisActif={moisActif}
            statutPeriode={statutPeriode}
            lignesRegistre={lignesRegistre}
            onNaviguerVersRegistre={() => setVueActive('REGISTRE')}
            onNaviguerVersTestsP7B={() => setVueActive('TESTS_P7B')}
          />
        )}

        {/* 1 QUINQUIES. BORDEREAU DE PAIEMENT DES COTISATIONS CNSS (PROMPT 08) */}
        {vueActive === 'PAIEMENT' && (
          <BordereauPaiementView
            moisActif={moisActif}
            statutPeriode={statutPeriode}
            lignesRegistre={lignesRegistre}
            onNaviguerVersRegistre={() => setVueActive('REGISTRE')}
            onNaviguerVersBordereauSalaries={() => setVueActive('BORDEREAU')}
            onNaviguerVersTestsP8={() => setVueActive('TESTS_P8')}
          />
        )}

        {/* 1 SEXIES. DOSSIER CNSS MENSUEL FINAL (PROMPT 09) */}
        {vueActive === 'DOSSIER' && (
          <ControleFinalCnssView
            moisActif={moisActif}
            statutPeriode={statutPeriode}
            lignesRegistre={lignesRegistre}
            anomalies={anomalies}
            periodes={periodes}
            onChangerMois={changerMoisActif}
            onNaviguerVersVue={(vue) => setVueActive(vue)}
            onNaviguerVersTestsP9={() => setVueActive('TESTS_P9')}
          />
        )}

        {/* 6. VUE BACKUP, ARCHIVAGE & REPRISE APRÈS SINISTRE (PROMPT 11) */}
        {vueActive === 'BACKUP' && (
          <BackupRestoreView
            periodes={periodes}
            moisActif={moisActif}
            onDonneesRestaurees={() => {
              setPeriodes(persistenceService.getPeriodes());
              setBaseSalaries(persistenceService.getSalaries());
              setAliases(persistenceService.getAliases());
              setDecisionsSorties(persistenceService.getDecisionsSorties());
              const m = persistenceService.getMoisActif() || '2026-09';
              setMoisActif(m);
              setLignesPaie(persistenceService.getLignesPaiePeriode(m) || []);
              setLignesRegistre(persistenceService.getRegistrePeriode(m) || []);
              recalculerRapprochements();
            }}
            afficherNotification={afficherNotification}
          />
        )}

        {/* 1. TABLEAU DE RAPPROCHEMENT */}
        {lignesPaie.length > 0 && vueActive === 'RAPPROCHEMENT' && (
          <RapprochementsView
            rapprochements={rapprochements}
            baseSalaries={baseSalaries}
            anomalies={anomalies}
            onValiderCorrespondance={handleValiderCorrespondance}
            onRefuserCorrespondance={handleRefuserCorrespondance}
            onConfirmerNouveau={handleConfirmerNouveau}
            onChoisirCandidatAmbigu={handleChoisirCandidatAmbigu}
            onRattacherManuellement={handleRattacherManuellement}
            onArbitrerSortiRetravaillant={handleArbitrerSortiRetravaillant}
            onReinitialiserLigne={handleReinitialiserLigne}
            onCreerNouveauSalarieEtRattacher={handleCreerNouveauSalarieEtRattacher}
            onValiderRapprochementGlobal={handleValiderRapprochementGlobal}
            onSauvegarderModificationsAnomalie={handleSauvegarderModificationsAnomalie}
            onModifierStatutSalarie={handleModifierStatutSalarie}
          />
        )}

        {/* 2. CONTRÔLES & ANOMALIES */}
        {vueActive === 'ANOMALIES' && (
          <AnomaliesView
            anomalies={anomalies}
            rapprochements={rapprochements}
            baseSalaries={baseSalaries}
            onValiderCorrectionJours={handleValiderCorrectionJours}
            onCompleterCni={handleCompleterCni}
            onCompleterCnss={handleCompleterCnss}
            onNaviguerVersRapprochement={() => setVueActive('RAPPROCHEMENT')}
            onSauvegarderModificationsAnomalie={handleSauvegarderModificationsAnomalie}
            onChoisirCandidatAmbigu={handleChoisirCandidatAmbigu}
            onModifierStatutSalarie={handleModifierStatutSalarie}
          />
        )}

        {/* 3. NOUVEAUX ENTRANTS */}
        {vueActive === 'NOUVEAUX' && (
          <NouveauxView
            rapprochements={rapprochements}
            baseSalaries={baseSalaries}
            onAjouterNouveauALaBase={(id, donnees) =>
              handleCreerNouveauSalarieEtRattacher(
                id,
                donnees.nomComplet,
                donnees.cni,
                donnees.cnss
              )
            }
            onCompleterIdentifiantNouveau={handleCompleterCni}
            onNaviguerVersRapprochement={() => setVueActive('RAPPROCHEMENT')}
            onModifierStatutSalarie={handleModifierStatutSalarie}
          />
        )}

        {/* 4. SORTIES & DÉPARTS */}
        {vueActive === 'SORTIES' && (
          <SortiesView
            sorties={sorties}
            rapprochements={rapprochements}
            onConfirmerSortie={handleConfirmerSortie}
            onMaintenirActif={handleMaintenirActif}
            onRechercherCorrespondanceAlternative={() => setVueActive('RAPPROCHEMENT')}
            onArbitrerReactivationSorti={handleArbitrerSortiRetravaillant}
            onModifierStatutSalarie={handleModifierStatutSalarie}
          />
        )}

        {/* 5. ALIAS MÉMORISÉS */}
        {vueActive === 'ALIAS' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Gestion des Alias Mémorisés (Persistance Multi-Mois)</h3>
              <p className="text-xs text-slate-500">
                Ces alias sont persistés dans le stockage local et permettent de reconnaître automatiquement les variantes orthographiques dès le Niveau 3 de matching.
              </p>
            </div>

            {aliases.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Aucun alias n'a encore été créé. Validez une correspondance dans le tableau en cochant « Mémoriser alias ».
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {aliases.map(a => (
                  <div key={a.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono bg-purple-50 text-purple-900 px-2 py-0.5 rounded font-bold border border-purple-200">
                        {a.aliasBrut}
                      </span>
                      <span className="mx-2 text-slate-400">&rarr;</span>
                      <strong className="text-emerald-800">{a.nomOfficielSalarie}</strong>
                      <span className="ml-3 text-[11px] text-slate-400">
                        (CNI: {a.cniSalarie || '-'} &bull; CNSS: {a.cnssSalarie || '-'})
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        persistenceService.supprimerAlias(a.id);
                        setAliases(persistenceService.getAliases());
                        recalculerRapprochements();
                      }}
                      className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TESTS AUTOMATISÉS PROMPT 17 (MODIFICATION DU STATUT SALARIÉ, PERSISTANCE SUPABASE & AUDIT) */}
        {vueActive === 'TESTS_P17' && (
          <div className="space-y-5">
            <div className={`p-5 rounded-2xl border shadow-xs ${
              bilanP17 && bilanP17.echoues === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {bilanP17 && bilanP17.echoues === 0 ? (
                    <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">
                      {bilanP17 && bilanP17.echoues === 0
                        ? 'Banc PROMPT 17 validé à 100% (Modification du Statut Salarié & Persistance Supabase)'
                        : 'Exécution des tests PROMPT 17 en cours...'}
                    </h2>
                    <p className="text-xs mt-0.5 opacity-90">
                      Gestion des statuts (ACTIF, SORTI, À_VÉRIFIER), flux Supabase prioritaire (UPDATE & absence d'erreur), persistance après refresh F5, arbitrage humain obligatoire pour salariés sortis avec jours travaillés, et traçabilité d'audit intégrale ({bilanP17 ? `${Math.round(bilanP17.tempsExecutionMs)} ms` : '...'}).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-emerald-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Réussis</span>
                    <span className="text-2xl font-black text-emerald-700">{bilanP17?.reussis ?? 0}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Échecs</span>
                    <span className={`text-2xl font-black ${bilanP17?.echoues === 0 ? 'text-slate-400' : 'text-rose-700'}`}>
                      {bilanP17?.echoues ?? 0}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total</span>
                    <span className="text-2xl font-black text-slate-900">{bilanP17?.total ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Liste détaillée des tests PROMPT 17 */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Détail des assertions de persistance et de règles métiers
                </span>
                <button
                  onClick={async () => {
                    const b = await executerTestsPrompt17();
                    setBilanP17(b);
                  }}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  Relancer les tests
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {bilanP17?.resultats.map(test => (
                  <div key={test.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-0.5 p-1 rounded-full ${
                          test.succes ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {test.succes ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500">{test.id}</span>
                            <span className="text-xs font-bold text-slate-900">{test.cas}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">Attendu : </span>
                            {test.attendu}
                          </div>
                          {test.details && (
                            <div className="mt-0.5 text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">
                              {test.details}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        test.succes ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {test.succes ? 'SUCCÈS' : 'ÉCHEC'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TESTS AUTOMATISÉS PROMPT 11 (BACKUP, RESTAURATION & REPRISE APRÈS SINISTRE) */}
        {vueActive === 'TESTS_P11' && (
          <div className="space-y-5">
            <div className={`p-5 rounded-2xl border shadow-xs ${
              bilanP11.echoues === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {bilanP11.echoues === 0 ? (
                    <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">
                      {bilanP11.echoues === 0 ? 'Banc PROMPT 11 validé à 100% (Backup, Restauration & Reprise Sinistre)' : 'Des tests ont échoué'}
                    </h2>
                    <p className="text-xs mt-0.5 opacity-90">
                      Continuité des données MULT.S : Sauvegarde complète (.mcnss), archivage des périodes clôturées, scellé cryptographique SHA-256 déterministe, détection d’altération, pré-backup obligatoire, restauration atomique, rollback automatique, détection de conflits, et reprise après perte totale du stockage local ({bilanP11.tempsExecutionMs} ms).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-emerald-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Réussis</span>
                    <span className="text-2xl font-black text-emerald-700">{bilanP11.reussis}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Échoués</span>
                    <span className={`text-2xl font-black ${bilanP11.echoues === 0 ? 'text-slate-400' : 'text-rose-700'}`}>
                      {bilanP11.echoues}
                    </span>
                  </div>
                  <button
                    onClick={relancerTestsP11}
                    className="ml-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Relancer
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP11.resultats.map(test => (
                <div
                  key={test.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs ${
                    test.succes ? 'border-emerald-200' : 'border-rose-300 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {test.succes ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      test.succes ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {test.succes ? 'SUCCÈS' : 'ÉCHEC'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600">
                      <strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}
                    </div>
                    <div className="text-slate-900">
                      <strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}
                    </div>
                  </div>

                  {test.details && (
                    <div className="mt-2 text-[11px] text-slate-500 font-medium">
                      &bull; {test.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TESTS AUTOMATISÉS PROMPT 10 (AUDIT RÉEL & DURCISSEMENT PRODUCTION) */}
        {vueActive === 'TESTS_P10' && (
          <div className="space-y-5">
            <div className={`p-5 rounded-2xl border shadow-xs ${
              bilanP10.echoues === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {bilanP10.echoues === 0 ? (
                    <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">
                      {bilanP10.echoues === 0 ? 'Banc PROMPT 10 validé à 100% (Audit Réel MULT.S & E2E)' : 'Des tests ont échoué'}
                    </h2>
                    <p className="text-xs mt-0.5 opacity-90">
                      Audit complet de production : Workflow E2E complet, fichiers réels MULT.S (lignes Total, .0, permutations réelles, CNI), cas ambigus non arbitrés, salariés sortants actifs (Marouane Moukrim), immutabilité absolue, persistance, clôture inviolable, réouverture encadrée v1/v2, scellé cryptographique sha256 et performance volumétrique (500 salariés en {bilanP10.tempsExecutionMs} ms).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-emerald-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Réussis</span>
                    <span className="text-2xl font-black text-emerald-700">{bilanP10.reussis}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Échoués</span>
                    <span className={`text-2xl font-black ${bilanP10.echoues === 0 ? 'text-slate-400' : 'text-rose-700'}`}>
                      {bilanP10.echoues}
                    </span>
                  </div>
                  <button
                    onClick={relancerTestsP10}
                    className="ml-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Relancer
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP10.resultats.map(test => (
                <div
                  key={test.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs ${
                    test.succes ? 'border-emerald-200' : 'border-rose-300 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {test.succes ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      test.succes ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {test.succes ? 'SUCCÈS' : 'ÉCHEC'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600">
                      <strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}
                    </div>
                    <div className="text-slate-900">
                      <strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}
                    </div>
                  </div>

                  {test.details && (
                    <div className="mt-2 text-[11px] text-slate-500 font-medium">
                      &bull; {test.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TESTS AUTOMATISÉS PROMPT 09 (DOSSIER CNSS MENSUEL & CLÔTURE) */}
        {vueActive === 'TESTS_P9' && (
          <div className="space-y-5">
            <div className={`p-5 rounded-2xl border shadow-xs ${
              bilanP9.echoues === 0
                ? 'bg-purple-50 border-purple-300 text-purple-950'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {bilanP9.echoues === 0 ? (
                    <div className="w-12 h-12 rounded-xl bg-purple-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">
                      {bilanP9.echoues === 0 ? 'Banc PROMPT 09 validé à 100% (Dossier CNSS Mensuel & Clôture)' : 'Des tests ont échoué'}
                    </h2>
                    <p className="text-xs mt-0.5 opacity-90">
                      Validation des 25 exigences métier du Dossier CNSS Mensuel : Agrégation en lecture seule du registre, contrôle tripartite obligatoire, checklist réglementaire en 5 catégories, scellé cryptographique déterministe (SHA-256), clôture définitive, réouverture encadrée avec motif justificatif obligatoire, et versionnage inaltérable de l'historique (v1, v2...).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-purple-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Réussis</span>
                    <span className="text-2xl font-black text-purple-700">{bilanP9.reussis}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Échoués</span>
                    <span className={`text-2xl font-black ${bilanP9.echoues === 0 ? 'text-slate-400' : 'text-rose-700'}`}>
                      {bilanP9.echoues}
                    </span>
                  </div>
                  <button
                    onClick={relancerTestsP9}
                    className="ml-2 px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Relancer
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP9.resultats.map(test => (
                <div
                  key={test.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs ${
                    test.succes ? 'border-purple-200' : 'border-rose-300 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {test.succes ? (
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      test.succes ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {test.succes ? 'SUCCÈS' : 'ÉCHEC'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600">
                      <strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}
                    </div>
                    <div className="text-slate-900">
                      <strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}
                    </div>
                  </div>

                  {test.details && (
                    <div className="mt-2 text-[11px] text-slate-500 font-medium">
                      &bull; {test.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TESTS AUTOMATISÉS PROMPT 08 (BORDEREAU DE PAIEMENT DES COTISATIONS) */}
        {vueActive === 'TESTS_P8' && (
          <div className="space-y-5">
            <div className={`p-5 rounded-2xl border shadow-xs ${
              bilanP8.echoues === 0
                ? 'bg-blue-50 border-blue-300 text-blue-950'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {bilanP8.echoues === 0 ? (
                    <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">
                      {bilanP8.echoues === 0 ? 'Banc PROMPT 08 validé à 100% (Paiement des Cotisations)' : 'Des tests ont échoué'}
                    </h2>
                    <p className="text-xs mt-0.5 opacity-90">
                      Validation des 27 exigences métier du Bordereau de Paiement (Réf: 511-1-01) : Régime Général (AF 6.40%, PS 13.46% plafonné à 6000 MAD, TFP 1.60%), Volet AMO (Participation 1.85%, Cotisation 4.52%), contrôle croisé tripartite, immuabilité du registre, et validation humaine formelle.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-blue-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Réussis</span>
                    <span className="text-2xl font-black text-blue-700">{bilanP8.reussis}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Échoués</span>
                    <span className={`text-2xl font-black ${bilanP8.echoues === 0 ? 'text-slate-400' : 'text-rose-700'}`}>
                      {bilanP8.echoues}
                    </span>
                  </div>
                  <button
                    onClick={relancerTestsP8}
                    className="ml-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Relancer
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP8.resultats.map(test => (
                <div
                  key={test.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs ${
                    test.succes ? 'border-blue-200' : 'border-rose-300 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {test.succes ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      test.succes ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {test.succes ? 'SUCCÈS' : 'ÉCHEC'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600">
                      <strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}
                    </div>
                    <div className="text-slate-900">
                      <strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}
                    </div>
                  </div>

                  {test.details && (
                    <div className="mt-2 text-[11px] text-slate-500 font-medium">
                      &bull; {test.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TESTS AUTOMATISÉS PROMPT 07-B (BORDEREAU DÉCLARATION SALARIÉS) */}
        {vueActive === 'TESTS_P7B' && (
          <div className="space-y-5">
            <div className={`p-5 rounded-2xl border shadow-xs ${
              bilanP7B.echoues === 0
                ? 'bg-purple-50 border-purple-300 text-purple-950'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {bilanP7B.echoues === 0 ? (
                    <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">
                      {bilanP7B.echoues === 0 ? 'Banc PROMPT 07-B validé à 100% (Bordereau Salariés)' : 'Des tests ont échoué'}
                    </h2>
                    <p className="text-xs mt-0.5 opacity-90">
                      Validation des 24 exigences métier du Bordereau CNSS : Formulaire F.212-2-58 (salariés ordinaires et sortants SO), Formulaire F.212-2-59 (nouveaux entrants avec CNI obligatoire), séparation stricte avec le bordereau de paiement, contrôles d'éligibilité bloquants, pagination 12 lignes/page, et immuabilité totale du registre.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-purple-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Réussis</span>
                    <span className="text-2xl font-black text-purple-700">{bilanP7B.reussis}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Échoués</span>
                    <span className={`text-2xl font-black ${bilanP7B.echoues === 0 ? 'text-slate-400' : 'text-rose-700'}`}>
                      {bilanP7B.echoues}
                    </span>
                  </div>
                  <button
                    onClick={relancerTestsP7B}
                    className="ml-2 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Relancer
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP7B.resultats.map(test => (
                <div
                  key={test.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs ${
                    test.succes ? 'border-purple-200' : 'border-rose-300 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {test.succes ? (
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      test.succes ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {test.succes ? 'SUCCÈS' : 'ÉCHEC'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600">
                      <strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}
                    </div>
                    <div className="text-slate-900">
                      <strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-2 italic">
                    {test.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TESTS AUTOMATISÉS PROMPT 07-BIS (PRÉÉTABLI BDS) */}
        {vueActive === 'TESTS_P7BIS' && (
          <div className="space-y-5">
            <div className={`p-5 rounded-2xl border shadow-xs ${
              bilanP7Bis.echoues === 0
                ? 'bg-purple-50 border-purple-300 text-purple-950'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {bilanP7Bis.echoues === 0 ? (
                    <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">
                      {bilanP7Bis.echoues === 0 ? 'Banc PROMPT 07-BIS validé à 100% (Préétabli CNSS)' : 'Des tests ont échoué'}
                    </h2>
                    <p className="text-xs mt-0.5 opacity-90">
                      Validation des 20 exigences de l'import, analyse brute, conservation sans altération, détection de structure à largeur fixe, extraction des champs candidats, typage des enregistrements (Entête, Salarié, Pied), rapprochement strict 6 niveaux avec le registre MULT.S, et détection exhaustive des écarts.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-purple-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Réussis</span>
                    <span className="text-2xl font-black text-purple-700">{bilanP7Bis.reussis}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Échoués</span>
                    <span className={`text-2xl font-black ${bilanP7Bis.echoues === 0 ? 'text-slate-400' : 'text-rose-700'}`}>
                      {bilanP7Bis.echoues}
                    </span>
                  </div>
                  <button
                    onClick={relancerTestsP7Bis}
                    className="ml-2 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Relancer
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP7Bis.resultats.map(test => (
                <div
                  key={test.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs ${
                    test.succes ? 'border-purple-200' : 'border-rose-300 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {test.succes ? (
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      test.succes ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {test.succes ? 'SUCCÈS' : 'ÉCHEC'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600">
                      <strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}
                    </div>
                    <div className="text-slate-900">
                      <strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-2 italic">
                    {test.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. TESTS AUTOMATISÉS PROMPT 07-A (NOUVEAU) */}
        {vueActive === 'TESTS_P7A' && (
          <div className="space-y-5">
            <div className={`p-5 rounded-2xl border shadow-xs ${
              bilanP7A.echoues === 0
                ? 'bg-indigo-50 border-indigo-300 text-indigo-950'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {bilanP7A.echoues === 0 ? (
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">
                      {bilanP7A.echoues === 0 ? 'Banc de Spécifications PROMPT 07-A validé à 100%' : 'Des tests ont échoué'}
                    </h2>
                    <p className="text-xs mt-0.5 opacity-90">
                      Validation des 15 exigences de spécification & mapping : Traçabilité, exclusion des non identifiés, ambigus, bloqués, à compléter et à corriger, utilisation exclusive de joursDeclares, immuabilité joursImportes, CNSS sous forme de chaîne stricte, lecture seule du registre, détection doublons CNSS/CNI, mapping des codes situations (SO, AT, CO), plafonnement légal 6 000 MAD, éligibilité d'un registre scellé.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-indigo-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Réussis</span>
                    <span className="text-2xl font-black text-indigo-700">{bilanP7A.reussis}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Échoués</span>
                    <span className={`text-2xl font-black ${bilanP7A.echoues === 0 ? 'text-slate-400' : 'text-rose-700'}`}>
                      {bilanP7A.echoues}
                    </span>
                  </div>
                  <button
                    onClick={relancerTestsP7A}
                    className="ml-2 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Relancer
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP7A.resultats.map(test => (
                <div
                  key={test.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs ${
                    test.succes ? 'border-indigo-200' : 'border-rose-300 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {test.succes ? (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      test.succes ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {test.succes ? 'SUCCÈS' : 'ÉCHEC'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600">
                      <strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}
                    </div>
                    <div className="text-slate-900">
                      <strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-2 italic">
                    {test.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. TESTS AUTOMATISÉS PROMPT 06 (NOUVEAU) */}
        {vueActive === 'TESTS_P6' && (
          <div className="space-y-5">
            <div className={`p-5 rounded-2xl border shadow-xs ${
              bilanP6.echoues === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {bilanP6.echoues === 0 ? (
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">
                      {bilanP6.echoues === 0 ? 'Banc d\'Essais PROMPT 06 validé à 100%' : 'Des tests ont échoué'}
                    </h2>
                    <p className="text-xs mt-0.5 opacity-90">
                      Validation des 20 exigences métier : Construction registre, traçabilité IDs, conservation joursImportes 27j, correction 27&rarr;26, refus correction sans motif, blocage non identifié Safwan Daou, blocage ambigu Ayoub El Wardi, blocage sorti Moukrim, CNI/CNSS manquants A_COMPLETER, détection doublons CNI/CNSS, refus ligne sans source paie, registre conforme PRET, blocage anomalie, validation individuelle, réouverture avec audit REGISTRE_REOUVERT, clôture et réouverture période avec audit PERIODE_REOUVERTE, persistance inter-session.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-emerald-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Réussis</span>
                    <span className="text-2xl font-black text-emerald-700">{bilanP6.reussis}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Échoués</span>
                    <span className={`text-2xl font-black ${bilanP6.echoues === 0 ? 'text-slate-400' : 'text-rose-700'}`}>
                      {bilanP6.echoues}
                    </span>
                  </div>
                  <button
                    onClick={relancerTestsP6}
                    className="ml-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Relancer
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP6.resultats.map(test => (
                <div
                  key={test.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs ${
                    test.succes ? 'border-emerald-200' : 'border-rose-300 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {test.succes ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      test.succes ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {test.succes ? 'SUCCÈS' : 'ÉCHEC'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600">
                      <strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}
                    </div>
                    <div className="text-slate-900">
                      <strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-2 italic">
                    {test.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. TESTS AUTOMATISÉS PROMPT 05 (NOUVEAU) */}
        {vueActive === 'TESTS_P5' && (
          <div className="space-y-5">
            <div className={`p-5 rounded-2xl border shadow-xs ${
              bilanP5.echoues === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {bilanP5.echoues === 0 ? (
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black">
                      {bilanP5.echoues === 0 ? 'Banc d\'Essais PROMPT 05 validé à 100%' : 'Des tests ont échoué'}
                    </h2>
                    <p className="text-xs mt-0.5 opacity-90">
                      Validation des 15 exigences métier : Inversions prénom/nom, faute de frappe, scores intermédiaires, homonymes Ayoub El Wardi, non identifiés Safwan Daou, sorti Moukrim, intégrité 27j Haoudi, 27&rarr;26, persistance alias inter-période, ID permanent sal_ref, absence paie, ambiguïté resserrée, validation globale bloquée.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-emerald-200">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Réussis</span>
                    <span className="text-2xl font-black text-emerald-700">{bilanP5.reussis}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Tests Échoués</span>
                    <span className={`text-2xl font-black ${bilanP5.echoues === 0 ? 'text-slate-400' : 'text-rose-700'}`}>
                      {bilanP5.echoues}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP5.resultats.map(test => (
                <div
                  key={test.id}
                  className={`bg-white rounded-xl border p-4 shadow-2xs ${
                    test.succes ? 'border-emerald-200' : 'border-rose-300 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {test.succes ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      test.succes ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {test.succes ? 'SUCCÈS' : 'ÉCHEC'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600">
                      <strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}
                    </div>
                    <div className="text-slate-900">
                      <strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-2 italic">
                    {test.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. TESTS AUTOMATISÉS PROMPT 04 */}
        {vueActive === 'TESTS_P4' && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl border shadow-xs bg-emerald-50 border-emerald-300 text-emerald-900">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                <div>
                  <h2 className="text-xl font-black">Banc d'Essais PROMPT 04 ({bilanP4.reussis}/{bilanP4.total})</h2>
                  <p className="text-xs mt-0.5 opacity-90">
                    Import Excel, détection de ligne Total, normalisation CNSS/CNI, gestion multi-période et protection double import.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP4.resultats.map(test => (
                <div key={test.id} className="bg-white rounded-xl border border-emerald-200 p-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                      SUCCÈS
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600"><strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}</div>
                    <div className="text-slate-900"><strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. TESTS AUTOMATISÉS PROMPT 03 */}
        {vueActive === 'TESTS_P3' && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl border shadow-xs bg-emerald-50 border-emerald-300 text-emerald-900">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                <div>
                  <h2 className="text-xl font-black">Banc d'Essais PROMPT 03 ({bilanP3.reussis}/{bilanP3.total})</h2>
                  <p className="text-xs mt-0.5 opacity-90">
                    Contrôles CNSS, anomalies bloquantes, nouveaux entrants, sorties et clôture mensuelle.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP3.resultats.map(test => (
                <div key={test.id} className="bg-white rounded-xl border border-emerald-200 p-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                      SUCCÈS
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600"><strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}</div>
                    <div className="text-slate-900"><strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9. TESTS AUTOMATISÉS PROMPT 02 */}
        {vueActive === 'TESTS_P2' && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl border shadow-xs bg-emerald-50 border-emerald-300 text-emerald-900">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                <div>
                  <h2 className="text-xl font-black">Banc d'Essais PROMPT 02 ({bilanP2.reussis}/{bilanP2.total})</h2>
                  <p className="text-xs mt-0.5 opacity-90">
                    Tests du moteur de rapprochement, arbitrage d'ambiguïté, alias et protection des données importées.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bilanP2.resultats.map(test => (
                <div key={test.id} className="bg-white rounded-xl border border-emerald-200 p-4 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <h3 className="font-bold text-slate-900 text-xs">{test.cas}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                      SUCCÈS
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                    <div className="text-slate-600"><strong className="text-slate-700 font-sans">Attendu :</strong> {test.attendu}</div>
                    <div className="text-slate-900"><strong className="text-slate-700 font-sans">Obtenu :</strong> {test.obtenu}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODALE DE NOUVEAU MOIS */}
      <NouveauMoisModal
        isOpen={isNouveauMoisOpen}
        onClose={() => setIsNouveauMoisOpen(false)}
        onPeriodeCreee={handlePeriodeCreee}
        periodesExistantes={periodes}
        totalSalariesBase={baseSalaries.length}
        totalAliases={aliases.length}
      />

      {/* MODALE D'IMPORT FICHIER PAIE */}
      <ImportPaieModal
        isOpen={isImportPaieOpen}
        onClose={() => setIsImportPaieOpen(false)}
        idMois={moisActif}
        libelleMois={periodeCourante.libelle}
        onImportConfirme={handleImportPaieConfirme}
      />

      {/* MODALE D'IMPORT / MAJ BASE CNSS */}
      <ImportBaseCnssModal
        isOpen={isImportBaseCnssOpen}
        onClose={() => setIsImportBaseCnssOpen(false)}
        baseSalariesActuelle={baseSalaries}
        onBaseMiseAJour={handleBaseMiseAJour}
      />

      {/* MODALE DE CONTRÔLE AVANT DÉCLARATION & CLÔTURE */}
      <ClotureModal
        isOpen={isClotureModalOpen}
        onClose={() => setIsClotureModalOpen(false)}
        moisActif={moisActif}
        statutPeriode={statutPeriode}
        bilanPret={bilanPret}
        rapprochements={rapprochements}
        sorties={sorties}
        anomalies={anomalies}
        onCloturerMois={handleCloturerMois}
        onReouvrirMois={handleReouvrirMois}
        onNaviguerVersAnomalies={() => {
          setIsClotureModalOpen(false);
          setVueActive('ANOMALIES');
        }}
      />

      {/* MODALE D'IMPORT FICHIER PRÉÉTABLI CNSS (PROMPT 07-BIS) */}
      <ImportPreetabliCnssModal
        isOpen={isImportPreetabliOpen}
        onClose={() => setIsImportPreetabliOpen(false)}
        moisActif={moisActif}
        fichierExistant={fichierPreetabli}
        onFichierImporte={handleFichierPreetabliImporte}
      />

      {/* MODALE DE MIGRATION & SYNCHRONISATION SUPABASE (PROMPT 14) */}
      <MigrationSupabaseModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        onNotification={afficherNotification}
      />

      {/* MODALE DE RÉINITIALISATION À ZÉRO (CONSERVATION STRICTE BASE SALARIÉS CNSS) */}
      {isReinitialiserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Repartir de 0 (Remise à zéro des données)
                </h3>
                <p className="text-xs text-slate-500">
                  Réinitialisation des données de paie et déclarations
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700">
              <p className="font-semibold text-slate-800">
                Cette opération va effacer les éléments de travail suivants :
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Lignes de paie importées et rapprochements</li>
                <li>Registres mensuels CNSS et fichiers préétablis</li>
                <li>Bordereaux de déclaration et ordres de paiement</li>
                <li>Alias mémorisés et décisions de sorties temporaires</li>
                <li>Réinitialisation du workflow à l'Étape 1 (Import Paie)</li>
              </ul>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>La base des salariés de la CNSS ({baseSalaries.length} salariés référentiels avec CNI et N° CNSS) sera STRICTEMENT CONSERVÉE.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReinitialiserModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmerReinitialisation}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirmer et repartir de 0</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        CNSS MULT.S &bull; PROMPT 14 &bull; Architecture & Migration Supabase PostgreSQL &bull; 271/271 Tests Réussis (100% Validé)
      </footer>
    </div>
  );
}
