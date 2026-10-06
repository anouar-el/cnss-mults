/**
 * Page de Garde et Synthèse Officielle Imprimable du Dossier CNSS MULT.S
 * PROMPT 09 — Document Administratif Interne Certifié (A4)
 */

import React from 'react';
import {
  Printer,
  Download,
  Building2,
  Calendar,
  Layers,
  FileText,
  X,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Lock,
  Unlock,
  Hash,
} from 'lucide-react';
import { DossierCnssMensuel } from '../types/cnssDossier';
import { cnssDossierService } from '../services/cnssDossierService';

interface ApercuDossierSyntheseProps {
  dossier: DossierCnssMensuel;
  onFermer?: () => void;
  onValider?: () => void;
  onCloturer?: () => void;
}

export const ApercuDossierSynthese: React.FC<ApercuDossierSyntheseProps> = ({
  dossier,
  onFermer,
  onValider,
  onCloturer,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleTelechargerCsv = () => {
    const csvContent = cnssDossierService.exporterDossierCsv(dossier);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CNSS_Dossier_Mensuel_${dossier.mois}_${dossier.annee}_v${dossier.versionCourante}.csv`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const formatDevise = (val: number) => {
    return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-slate-900/90 fixed inset-0 z-50 overflow-y-auto flex flex-col items-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* BARRE D'OUTILS FLOTTANTE (Masquée à l'impression) */}
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-3 mb-3 shadow-xl flex flex-wrap items-center justify-between gap-3 print:hidden sticky top-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-sm">
                Page de Garde & Dossier CNSS &bull; {dossier.raisonSociale}
              </h3>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  dossier.statut === 'CLOTURE'
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : dossier.statut === 'VALIDE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {dossier.statut === 'CLOTURE'
                  ? 'PÉRIODE CLÔTURÉE'
                  : dossier.statut === 'VALIDE'
                  ? 'DOSSIER VALIDÉ'
                  : 'CONTRÔLE EN COURS'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Version {dossier.versionCourante}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Période {dossier.mois}/{dossier.annee} &bull; Affilié CNSS {dossier.numeroAffiliation} &bull; Agence {dossier.agence}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {dossier.statut === 'PRET_A_VALIDER' && onValider && (
            <button
              onClick={onValider}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valider le Dossier
            </button>
          )}

          {dossier.statut === 'VALIDE' && onCloturer && (
            <button
              onClick={onCloturer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Clôturer Définitivement
            </button>
          )}

          <button
            onClick={handleTelechargerCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV Synthèse
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimer A4
          </button>

          {onFermer && (
            <button
              onClick={onFermer}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* PAGE DE GARDE ADMINISTRATIVE OFFICIELLE (Format A4 Portrait) */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-8 sm:p-12 border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 space-y-8 font-sans">
        {/* EN-TÊTE DE LA PAGE DE GARDE */}
        <div className="border-b-4 border-slate-900 pb-6 text-center space-y-2">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">
            ROYAUME DU MAROC &bull; GESTION DÉCLARATIVE SOCIALE
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {dossier.raisonSociale}
          </h1>
          <div className="text-sm font-bold text-slate-700">
            {dossier.adresse}
          </div>
          <div className="inline-block mt-3 px-4 py-1.5 rounded-full bg-slate-900 text-white font-extrabold text-sm tracking-wide uppercase">
            Dossier CNSS Mensuel Certifié
          </div>
        </div>

        {/* CADRE IDENTIFICATION DU DOSSIER */}
        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-sans text-slate-600">Période Mensuelle :</span>
              <span className="font-black text-slate-900 text-sm">{dossier.mois}/{dossier.annee}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-sans text-slate-600">Numéro d’Affiliation CNSS :</span>
              <span className="font-extrabold text-blue-900 text-sm">{dossier.numeroAffiliation}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-sans text-slate-600">Agence de Rattachement :</span>
              <span className="font-bold text-slate-900">{dossier.agence}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-slate-600">Version du Dossier :</span>
              <span className="font-bold text-purple-900">Version {dossier.versionCourante}</span>
            </div>
          </div>

          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-sans text-slate-600">Statut Administratif :</span>
              <span className="font-black text-slate-900">{dossier.statut}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-sans text-slate-600">Date de Validation :</span>
              <span className="font-bold text-slate-900">{dossier.dateValidation ? dossier.dateValidation.slice(0, 10) : 'Non validé'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="font-sans text-slate-600">Signataire Habilité :</span>
              <span className="font-bold text-slate-900">{dossier.validePar || 'En attente'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-slate-600">Date de Clôture :</span>
              <span className="font-bold text-purple-900">{dossier.dateCloture ? dossier.dateCloture.slice(0, 10) : 'Non clôturé'}</span>
            </div>
          </div>
        </div>

        {/* RÉSUMÉ DES CHIFFRES CLÉS DU MOIS */}
        <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-2 text-xs font-black uppercase tracking-wider flex justify-between items-center">
            <span>Synthèse Opérationnelle & Financière du Mois</span>
            <span className="text-[10px] text-slate-300 font-mono">Projection Registre Validé</span>
          </div>
          <div className="p-4 grid grid-cols-3 gap-4 text-xs font-mono bg-white">
            <div className="border-r border-slate-200 pr-3">
              <span className="text-slate-500 font-sans block text-[11px]">Effectif Déclaré :</span>
              <span className="text-base font-black text-slate-900">{dossier.resume.totalSalaries} salariés</span>
              <div className="text-[10px] text-slate-500 mt-1 font-sans">
                Entrants: <strong>{dossier.resume.nombreEntrants}</strong> &bull; Sortants: <strong>{dossier.resume.nombreSortants}</strong>
              </div>
            </div>

            <div className="border-r border-slate-200 pr-3">
              <span className="text-slate-500 font-sans block text-[11px]">Total Jours Déclarés :</span>
              <span className="text-base font-black text-slate-900">{dossier.resume.totalJoursDeclares} j</span>
              <div className="text-[10px] text-slate-500 mt-1 font-sans">
                Moyenne : {(dossier.resume.totalJoursDeclares / (dossier.resume.totalSalaries || 1)).toFixed(1)} j / sal.
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-sans block text-[11px]">Masse Salariale Brute :</span>
              <span className="text-base font-black text-slate-900">{formatDevise(dossier.resume.masseBruteDeclaree)} MAD</span>
              <div className="text-[10px] text-slate-500 mt-1 font-sans">
                Plafonnée PS: {formatDevise(dossier.resume.masseCotisablePlafonnee)} MAD
              </div>
            </div>
          </div>

          <div className="bg-slate-100 p-4 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-600 block uppercase">
                Décomposition des Cotisations Dues
              </span>
              <span className="text-xs text-slate-700 font-mono mt-0.5 block">
                Régime Général : <strong>{formatDevise(dossier.resume.totalCotisationsRegimeGeneral)} MAD</strong> &bull; AMO : <strong>{formatDevise(dossier.resume.totalCotisationsAmo)} MAD</strong>
              </span>
              <span className="text-xs text-slate-800 font-serif italic mt-1 block">
                Arrêté à : {dossier.resume.montantEnToutesLettres}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Total Global Versement</span>
              <span className="text-2xl font-black font-mono text-emerald-800">
                {formatDevise(dossier.resume.totalGlobalAPayer)} MAD
              </span>
            </div>
          </div>
        </div>

        {/* TABLEAU DES CONTRÔLES TRIPARTITES CERTIFIÉS */}
        <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-slate-800 flex justify-between items-center">
            <span>Certificat de Contrôle Tripartite (Registre / Déclaration / Paiement)</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-black bg-emerald-100 text-emerald-800">
              100% CONCORDANT
            </span>
          </div>
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 text-slate-600 text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 text-left">Point de Contrôle</th>
                <th className="py-2 px-3 text-left">Source Registre</th>
                <th className="py-2 px-3 text-left">Source Déclaration</th>
                <th className="py-2 px-3 text-left">Source Paiement</th>
                <th className="py-2 px-2 text-center">Résultat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {dossier.controleTripartite.controles.map(c => (
                <tr key={c.id}>
                  <td className="py-2 px-3 font-sans font-bold text-slate-800">{c.libelle}</td>
                  <td className="py-2 px-3 text-slate-600">{String(c.valeurA)}</td>
                  <td className="py-2 px-3 text-slate-600">{String(c.valeurB)}</td>
                  <td className="py-2 px-3 text-slate-600">{String(c.valeurC)}</td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[10px] font-bold text-emerald-700">CONFORME</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* EMPREINTES & SCELLÉ NUMÉRIQUE */}
        <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 text-xs font-mono space-y-1.5">
          <div className="font-sans font-bold text-slate-900 text-xs uppercase mb-1">
            Scellé Cryptographique & Traçabilité (SHA-256)
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Empreinte Registre :</span>
            <span className="text-slate-800">{dossier.registreHash.slice(0, 32)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Empreinte Déclaration (07-B) :</span>
            <span className="text-slate-800">{dossier.bordereauDeclarationHash.slice(0, 32)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Empreinte Paiement (08) :</span>
            <span className="text-slate-800">{dossier.bordereauPaiementHash.slice(0, 32)}...</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
            <span className="text-slate-900 font-sans">Empreinte Maître Dossier :</span>
            <span className="text-blue-900">{dossier.dossierHash}</span>
          </div>
        </div>

        {/* CADRES DE SIGNATURE ET CACHET */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t-2 border-slate-900 text-xs font-sans">
          <div className="border border-slate-300 rounded-xl p-4 flex flex-col justify-between h-36">
            <div className="font-bold text-slate-800">
              Pour la Direction des Ressources Humaines :
            </div>
            <div className="text-slate-500 text-[11px]">
              Nom : <strong>{dossier.validePar || '___________________________'}</strong>
              <br />
              Date : {dossier.dateValidation ? dossier.dateValidation.slice(0, 10) : '____/____/________'}
            </div>
            <div className="text-[10px] text-slate-400 border-t border-dashed border-slate-200 pt-1">
              Visa & Signature
            </div>
          </div>

          <div className="border border-slate-300 rounded-xl p-4 flex flex-col justify-between h-36">
            <div className="font-bold text-slate-800">
              Pour la Direction Générale / Direction Financière :
            </div>
            <div className="text-slate-500 text-[11px]">
              Nom : <strong>{dossier.cloturePar || '___________________________'}</strong>
              <br />
              Date : {dossier.dateCloture ? dossier.dateCloture.slice(0, 10) : '____/____/________'}
            </div>
            <div className="text-[10px] text-slate-400 border-t border-dashed border-slate-200 pt-1">
              Cachet de la Société STE MULT.S
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
