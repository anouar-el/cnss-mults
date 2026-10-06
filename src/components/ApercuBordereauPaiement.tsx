/**
 * Composant de Prévisualisation & Impression Officielle du Bordereau de Paiement CNSS
 * PROMPT 08 — Formulaire Administratif Réf: 511-1-01 (Indice 03)
 * Volet 1 : Régime Général
 * Volet 2 : Assurance Maladie Obligatoire (AMO)
 *
 * Rendu bilingue officiel (Français / Arabe) conforme aux documents CNSS du Maroc.
 */

import React, { useState } from 'react';
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
  AlertCircle,
} from 'lucide-react';
import { DocumentBordereauPaiementCnss } from '../types/cnssPaiement';
import { cnssPaiementService } from '../services/cnssPaiementService';

interface ApercuBordereauPaiementProps {
  document: DocumentBordereauPaiementCnss;
  onFermer?: () => void;
  onValider?: () => void;
}

export const ApercuBordereauPaiement: React.FC<ApercuBordereauPaiementProps> = ({
  document: doc,
  onFermer,
  onValider,
}) => {
  const [voletActif, setVoletActif] = useState<'REGIME_GENERAL' | 'AMO' | 'DEUX_VOLETS'>('DEUX_VOLETS');

  const handlePrint = () => {
    window.print();
  };

  const handleTelechargerCsv = () => {
    const csvContent = cnssPaiementService.exporterPaiementCsv(doc);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CNSS_Bordereau_Paiement_${doc.mois}_${doc.annee}.csv`);
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
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl p-3 mb-3 shadow-xl flex flex-wrap items-center justify-between gap-3 print:hidden sticky top-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-sm">
                Aperçu Officiel &bull; Bordereau de Paiement CNSS (Réf: 511-1-01)
              </h3>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  doc.statut === 'VALIDE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {doc.statut === 'VALIDE' ? 'VERROUILLÉ & VALIDÉ' : 'BROUILLON CONFORME'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {doc.raisonSociale} &bull; Affilié {doc.numeroAffiliation} &bull; Agence {doc.agence} &bull; Période {doc.mois}/{doc.annee}
            </p>
          </div>
        </div>

        {/* Sélecteur de volet */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setVoletActif('DEUX_VOLETS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              voletActif === 'DEUX_VOLETS'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Les 2 Volets (Complet)
          </button>
          <button
            onClick={() => setVoletActif('REGIME_GENERAL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              voletActif === 'REGIME_GENERAL'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Régime Général
          </button>
          <button
            onClick={() => setVoletActif('AMO')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              voletActif === 'AMO'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Volet AMO
          </button>
        </div>

        {/* Actions d'impression & export */}
        <div className="flex items-center gap-2">
          {doc.statut !== 'VALIDE' && onValider && (
            <button
              onClick={onValider}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valider formellement
            </button>
          )}

          <button
            onClick={handleTelechargerCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV Administratif
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimer (A4)
          </button>

          {onFermer && (
            <button
              onClick={onFermer}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Fermer la prévisualisation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ZONE D'AFFICHAGE DU DOCUMENT OFFICIEL */}
      <div className="w-full max-w-5xl space-y-6 print:space-y-0 print:max-w-none print:w-full">
        {/* =========================================================================
            PAGE 1 : RÉGIME GÉNÉRAL (Réf: 511-1-01 Indice 03)
           ========================================================================= */}
        {(voletActif === 'DEUX_VOLETS' || voletActif === 'REGIME_GENERAL') && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:break-after-page">
            {/* EN-TÊTE OFFICIEL BILINGUE */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between text-slate-900">
                <div className="text-left font-serif">
                  <div className="text-[11px] font-bold tracking-wider">ROYAUME DU MAROC</div>
                  <div className="text-xs font-extrabold tracking-tight">CAISSE NATIONALE DE SÉCURITÉ SOCIALE</div>
                </div>

                <div className="text-center px-4">
                  <div className="text-sm font-black tracking-wide uppercase">
                    Bordereau de Paiement des Cotisations
                  </div>
                  <div className="text-xs font-bold text-slate-700 font-serif" dir="rtl">
                    ورقة أداء الإشتراكات &bull; نظام الضمان الاجتماعي
                  </div>
                  <div className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded mt-0.5 inline-block">
                    RÉGIME GÉNÉRAL &bull; Réf: 511-1-01 (Page 1)
                  </div>
                </div>

                <div className="text-right font-serif" dir="rtl">
                  <div className="text-[11px] font-bold">المملكة المغربية</div>
                  <div className="text-xs font-extrabold">الصندوق الوطني للضمان الإجتماعي</div>
                </div>
              </div>
            </div>

            {/* CADRES IDENTIFICATION & ENTREPRISE */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-xs font-mono">
              {/* Cadre de gauche : Informations Période et Affiliation */}
              <div className="border border-slate-400 rounded-lg p-3 bg-slate-50/50 space-y-1.5">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600 font-sans font-medium">Référence structurée :</span>
                  <span className="font-bold text-slate-900">{doc.voletRegimeGeneral.referenceStructuree}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600 font-sans font-medium">N° Affilié :</span>
                  <span className="font-extrabold text-blue-900 text-sm">{doc.numeroAffiliation}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600 font-sans font-medium">Agence CNSS :</span>
                  <span className="font-bold text-slate-900">{doc.agence}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600 font-sans font-medium">Mois de versement :</span>
                  <span className="font-bold text-slate-900 uppercase">{doc.voletRegimeGeneral.moisVersement}</span>
                </div>
                <div className="flex justify-between text-red-800">
                  <span className="font-sans font-medium">À régulariser avant le :</span>
                  <span className="font-black bg-red-100 px-1 rounded">{doc.voletRegimeGeneral.aRegulariserAvantLe}</span>
                </div>
              </div>

              {/* Cadre de droite : Entreprise débitrice */}
              <div className="border border-slate-400 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Affilié Débiteur
                  </div>
                  <div className="font-black text-slate-900 text-sm font-sans">{doc.raisonSociale}</div>
                  <div className="text-xs text-slate-700 font-sans mt-1">{doc.voletRegimeGeneral.agence} &bull; MAROC</div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px]">
                  <span className="text-slate-600 font-sans">Date émission :</span>
                  <span className="font-bold text-slate-800">{doc.voletRegimeGeneral.dateEmission}</span>
                </div>
              </div>
            </div>

            {/* SYNTHÈSE DES MASSES SALARIALES */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 mb-4 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-600 block text-[10px]">Effectif déclaré :</span>
                <span className="font-black text-slate-900 text-sm">{doc.nombreSalariesDeclares} salariés</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px]">Masse salariale totale (déplafonnée) :</span>
                <span className="font-black text-blue-900 text-sm font-mono">
                  {formatDevise(doc.voletRegimeGeneral.masseSalarialeDeclaree)} MAD
                </span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px]">Masse cotisable plafonnée (6 000 MAD/sal) :</span>
                <span className="font-black text-blue-900 text-sm font-mono">
                  {formatDevise(doc.voletRegimeGeneral.masseSalarialePlafonnee)} MAD
                </span>
              </div>
            </div>

            {/* TABLEAU CENTRAL DES CASES OFFICIELLES (RÉGIME GÉNÉRAL) */}
            <div className="border-2 border-slate-900 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px]">
                    <th className="py-1.5 px-2 border-r border-slate-700 text-center w-12">Case</th>
                    <th className="py-1.5 px-3 border-r border-slate-700 text-left">
                      Désignation de la Cotisation / Rubrique
                    </th>
                    <th className="py-1.5 px-3 border-r border-slate-700 text-right w-28">Assiette (MAD)</th>
                    <th className="py-1.5 px-2 border-r border-slate-700 text-center w-20">Taux</th>
                    <th className="py-1.5 px-3 text-right w-36">Montant (MAD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-sans">
                  {/* Case 1 : Allocations Familiales */}
                  {doc.voletRegimeGeneral.lignes
                    .filter(l => l.caseNumero === 1)
                    .map(l => (
                      <tr key={l.codeRubrique} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-center font-mono font-bold bg-slate-100 border-r border-slate-300">
                          1
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300">
                          <div className="font-bold text-slate-900">{l.libelleFr}</div>
                          <div className="text-[10px] text-slate-500 font-serif" dir="rtl">
                            {l.libelleAr}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono border-r border-slate-300">
                          {formatDevise(l.assietteRetenue)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-blue-900 border-r border-slate-300">
                          {l.taux.toFixed(2)} %
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatDevise(l.montantArrondi)}
                        </td>
                      </tr>
                    ))}

                  {/* Case 2 : Prestations Sociales */}
                  {doc.voletRegimeGeneral.lignes
                    .filter(l => l.caseNumero === 2)
                    .map(l => (
                      <tr key={l.codeRubrique} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-center font-mono font-bold bg-slate-100 border-r border-slate-300">
                          2
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300">
                          <div className="font-bold text-slate-900">{l.libelleFr}</div>
                          <div className="text-[10px] text-slate-500 font-serif" dir="rtl">
                            {l.libelleAr} &bull; Plafonné à 6 000 MAD / salarié
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono border-r border-slate-300">
                          {formatDevise(l.assietteRetenue)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-blue-900 border-r border-slate-300">
                          {l.taux.toFixed(2)} %
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatDevise(l.montantArrondi)}
                        </td>
                      </tr>
                    ))}

                  {/* Case 3 : Total cotisations versées (1 + 2) */}
                  <tr className="bg-slate-100 font-bold">
                    <td className="py-2 px-2 text-center font-mono font-black border-r border-slate-300">3</td>
                    <td className="py-2 px-3 border-r border-slate-300">
                      <div>Total des cotisations versées (Case 1 + Case 2)</div>
                      <div className="text-[10px] text-slate-600 font-serif" dir="rtl">
                        مجموع الإشتراكات المؤداة
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 border-r border-slate-300">-</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-300">-</td>
                    <td className="py-2 px-3 text-right font-mono font-black text-blue-900">
                      {formatDevise(doc.voletRegimeGeneral.totalCotisationsVersees)}
                    </td>
                  </tr>

                  {/* Case 4 : Pénalités sur cotisations */}
                  <tr className="text-slate-500">
                    <td className="py-1 px-2 text-center font-mono bg-slate-50 border-r border-slate-300">4</td>
                    <td className="py-1 px-3 border-r border-slate-300 text-[11px]">
                      Pénalités sur cotisations (دعائر الإشتراكات)
                    </td>
                    <td className="py-1 px-3 text-right font-mono border-r border-slate-300">-</td>
                    <td className="py-1 px-2 text-center font-mono border-r border-slate-300">-</td>
                    <td className="py-1 px-3 text-right font-mono">0,00</td>
                  </tr>

                  {/* Case 5 : AF reversées */}
                  <tr className="text-slate-500">
                    <td className="py-1 px-2 text-center font-mono bg-slate-50 border-r border-slate-300">5</td>
                    <td className="py-1 px-3 border-r border-slate-300 text-[11px]">
                      Montant des allocations familiales reversées (مبالغ التعويضات العائلية المرجعة)
                    </td>
                    <td className="py-1 px-3 text-right font-mono border-r border-slate-300">-</td>
                    <td className="py-1 px-2 text-center font-mono border-r border-slate-300">-</td>
                    <td className="py-1 px-3 text-right font-mono">0,00</td>
                  </tr>

                  {/* Case 6 : Astreintes */}
                  <tr className="text-slate-500">
                    <td className="py-1 px-2 text-center font-mono bg-slate-50 border-r border-slate-300">6</td>
                    <td className="py-1 px-3 border-r border-slate-300 text-[11px]">
                      Astreintes (غرامات التأخير)
                    </td>
                    <td className="py-1 px-3 text-right font-mono border-r border-slate-300">-</td>
                    <td className="py-1 px-2 text-center font-mono border-r border-slate-300">-</td>
                    <td className="py-1 px-3 text-right font-mono">0,00</td>
                  </tr>

                  {/* Case 8 : Taxe Formation Professionnelle */}
                  {doc.voletRegimeGeneral.lignes
                    .filter(l => l.caseNumero === 8)
                    .map(l => (
                      <tr key={l.codeRubrique} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-center font-mono font-bold bg-slate-100 border-r border-slate-300">
                          8
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300">
                          <div className="font-bold text-slate-900">{l.libelleFr}</div>
                          <div className="text-[10px] text-slate-500 font-serif" dir="rtl">
                            {l.libelleAr}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono border-r border-slate-300">
                          {formatDevise(l.assietteRetenue)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-blue-900 border-r border-slate-300">
                          {l.taux.toFixed(2)} %
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatDevise(l.montantArrondi)}
                        </td>
                      </tr>
                    ))}

                  {/* Case 9 : Pénalités TFP */}
                  <tr className="text-slate-500">
                    <td className="py-1 px-2 text-center font-mono bg-slate-50 border-r border-slate-300">9</td>
                    <td className="py-1 px-3 border-r border-slate-300 text-[11px]">
                      Pénalités sur taxe de formation professionnelle (دعائر ضريبة التكوين المهني)
                    </td>
                    <td className="py-1 px-3 text-right font-mono border-r border-slate-300">-</td>
                    <td className="py-1 px-2 text-center font-mono border-r border-slate-300">-</td>
                    <td className="py-1 px-3 text-right font-mono">0,00</td>
                  </tr>

                  {/* Case 10 : Montant Global Régime Général */}
                  <tr className="bg-blue-900 text-white font-black text-sm">
                    <td className="py-2.5 px-2 text-center font-mono border-r border-blue-800">10</td>
                    <td className="py-2.5 px-3 border-r border-blue-800">
                      <div>MONTANT GLOBAL DU VERSEMENT RÉGIME GÉNÉRAL (Case 3 + Case 8)</div>
                      <div className="text-xs font-serif opacity-90 font-normal" dir="rtl">
                        المبلغ الإجمالي للأداء &bull; نظام الضمان الاجتماعي
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-blue-800 opacity-80">-</td>
                    <td className="py-2.5 px-2 text-center font-mono border-r border-blue-800 opacity-80">-</td>
                    <td className="py-2.5 px-3 text-right font-mono text-base font-black">
                      {formatDevise(doc.voletRegimeGeneral.montantGlobalVersement)} MAD
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* BAS DE PAGE OFFICIEL RÉGIME GÉNÉRAL */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans border border-slate-300 rounded-lg p-3">
              <div>
                <div className="font-bold text-slate-800 mb-1">Mode de règlement :</div>
                <div className="space-y-1 text-slate-600">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked readOnly className="rounded text-blue-600" />
                    <span>Virement Bancaire (Réf CNSS: {doc.voletRegimeGeneral.referenceStructuree})</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" disabled className="rounded text-slate-400" />
                    <span>Chèque bancaire barré</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" disabled className="rounded text-slate-400" />
                    <span>Prélèvement automatique CNSS</span>
                  </label>
                </div>
              </div>

              <div className="border-l border-slate-300 pl-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="text-[11px] font-bold text-slate-700">Cachet & Signature de l'Affilié :</div>
                  <div className="text-[10px] text-slate-500 font-mono">Date : {doc.dateCreation.slice(0, 10)}</div>
                </div>
                <div className="h-14 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-[11px] bg-slate-50/50">
                  Cachet de la Société STE MULT.S
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PAGE 2 : ASSURANCE MALADIE OBLIGATOIRE - AMO (Réf: 511-1-01 Page 2)
           ========================================================================= */}
        {(voletActif === 'DEUX_VOLETS' || voletActif === 'AMO') && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:break-before-page">
            {/* EN-TÊTE OFFICIEL BILINGUE AMO */}
            <div className="border-b-2 border-emerald-900 pb-3 mb-4">
              <div className="flex items-center justify-between text-slate-900">
                <div className="text-left font-serif">
                  <div className="text-[11px] font-bold tracking-wider">ROYAUME DU MAROC</div>
                  <div className="text-xs font-extrabold tracking-tight">CAISSE NATIONALE DE SÉCURITÉ SOCIALE</div>
                </div>

                <div className="text-center px-4">
                  <div className="text-sm font-black tracking-wide uppercase text-emerald-950">
                    Bordereau de Paiement des Cotisations
                  </div>
                  <div className="text-xs font-bold text-emerald-800 font-serif" dir="rtl">
                    ورقة أداء الإشتراكات &bull; التأمين الإجباري الأساسي عن المرض (AMO)
                  </div>
                  <div className="text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded mt-0.5 inline-block">
                    ASSURANCE MALADIE OBLIGATOIRE &bull; Réf: 511-1-01 (Page 2)
                  </div>
                </div>

                <div className="text-right font-serif" dir="rtl">
                  <div className="text-[11px] font-bold">المملكة المغربية</div>
                  <div className="text-xs font-extrabold">الصندوق الوطني للضمان الإجتماعي</div>
                </div>
              </div>
            </div>

            {/* CADRES IDENTIFICATION & ENTREPRISE AMO */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-xs font-mono">
              <div className="border border-slate-400 rounded-lg p-3 bg-emerald-50/20 space-y-1.5">
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600 font-sans font-medium">Référence structurée AMO :</span>
                  <span className="font-bold text-emerald-900">{doc.voletAmo.referenceStructuree}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600 font-sans font-medium">N° Affilié :</span>
                  <span className="font-extrabold text-emerald-900 text-sm">{doc.numeroAffiliation}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600 font-sans font-medium">Agence CNSS :</span>
                  <span className="font-bold text-slate-900">{doc.agence}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="text-slate-600 font-sans font-medium">Mois de versement :</span>
                  <span className="font-bold text-slate-900 uppercase">{doc.voletAmo.moisVersement}</span>
                </div>
                <div className="flex justify-between text-red-800">
                  <span className="font-sans font-medium">À régulariser avant le :</span>
                  <span className="font-black bg-red-100 px-1 rounded">{doc.voletAmo.aRegulariserAvantLe}</span>
                </div>
              </div>

              <div className="border border-slate-400 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Affilié Débiteur
                  </div>
                  <div className="font-black text-slate-900 text-sm font-sans">{doc.raisonSociale}</div>
                  <div className="text-xs text-slate-700 font-sans mt-1">{doc.voletAmo.agence} &bull; MAROC</div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px]">
                  <span className="text-slate-600 font-sans">Date émission :</span>
                  <span className="font-bold text-slate-800">{doc.voletAmo.dateEmission}</span>
                </div>
              </div>
            </div>

            {/* SYNTHÈSE ASSIETTE AMO */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 mb-4 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-600 block text-[10px]">Effectif déclaré soumis AMO :</span>
                <span className="font-black text-slate-900 text-sm">{doc.nombreSalariesDeclares} salariés</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px]">Masse salariale totale soumise (déplafonnée) :</span>
                <span className="font-black text-emerald-950 text-sm font-mono">
                  {formatDevise(doc.voletAmo.masseSalarialeDeclaree)} MAD
                </span>
              </div>
            </div>

            {/* TABLEAU CENTRAL DES CASES OFFICIELLES (AMO) */}
            <div className="border-2 border-emerald-900 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-900 text-white font-bold text-[11px]">
                    <th className="py-1.5 px-2 border-r border-emerald-800 text-center w-12">Case</th>
                    <th className="py-1.5 px-3 border-r border-emerald-800 text-left">
                      Désignation de la Cotisation / Rubrique AMO
                    </th>
                    <th className="py-1.5 px-3 border-r border-emerald-800 text-right w-28">Assiette (MAD)</th>
                    <th className="py-1.5 px-2 border-r border-emerald-800 text-center w-20">Taux</th>
                    <th className="py-1.5 px-3 text-right w-36">Montant (MAD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-sans">
                  {/* Case 1 : Participation AMO (1.85%) */}
                  {doc.voletAmo.lignes
                    .filter(l => l.caseNumero === 1)
                    .map(l => (
                      <tr key={l.codeRubrique} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-center font-mono font-bold bg-slate-100 border-r border-slate-300">
                          1
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300">
                          <div className="font-bold text-slate-900">{l.libelleFr}</div>
                          <div className="text-[10px] text-slate-500 font-serif" dir="rtl">
                            {l.libelleAr} &bull; Part patronale exclusive
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono border-r border-slate-300">
                          {formatDevise(l.assietteRetenue)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-900 border-r border-slate-300">
                          {l.taux.toFixed(2)} %
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatDevise(l.montantArrondi)}
                        </td>
                      </tr>
                    ))}

                  {/* Case 2 : Cotisation AMO (4.52%) */}
                  {doc.voletAmo.lignes
                    .filter(l => l.caseNumero === 2)
                    .map(l => (
                      <tr key={l.codeRubrique} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-center font-mono font-bold bg-slate-100 border-r border-slate-300">
                          2
                        </td>
                        <td className="py-2 px-3 border-r border-slate-300">
                          <div className="font-bold text-slate-900">{l.libelleFr}</div>
                          <div className="text-[10px] text-slate-500 font-serif" dir="rtl">
                            {l.libelleAr} &bull; Patronale (2,26%) + Salariale (2,26%)
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono border-r border-slate-300">
                          {formatDevise(l.assietteRetenue)}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-900 border-r border-slate-300">
                          {l.taux.toFixed(2)} %
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatDevise(l.montantArrondi)}
                        </td>
                      </tr>
                    ))}

                  {/* Case 3 : Total cotisations versées AMO */}
                  <tr className="bg-emerald-50 font-bold">
                    <td className="py-2 px-2 text-center font-mono font-black border-r border-slate-300">3</td>
                    <td className="py-2 px-3 border-r border-slate-300">
                      <div>Total des cotisations versées AMO (Case 1 + Case 2)</div>
                      <div className="text-[10px] text-emerald-800 font-serif" dir="rtl">
                        مجموع الإشتراكات المؤداة ت.ص.إ.
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 border-r border-slate-300">-</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-300">-</td>
                    <td className="py-2 px-3 text-right font-mono font-black text-emerald-950">
                      {formatDevise(doc.voletAmo.totalCotisationsAmo)}
                    </td>
                  </tr>

                  {/* Case 4 : Pénalités AMO */}
                  <tr className="text-slate-500">
                    <td className="py-1 px-2 text-center font-mono bg-slate-50 border-r border-slate-300">4</td>
                    <td className="py-1 px-3 border-r border-slate-300 text-[11px]">
                      Pénalités sur cotisations AMO (دعائر ت.ص.إ.)
                    </td>
                    <td className="py-1 px-3 text-right font-mono border-r border-slate-300">-</td>
                    <td className="py-1 px-2 text-center font-mono border-r border-slate-300">-</td>
                    <td className="py-1 px-3 text-right font-mono">0,00</td>
                  </tr>

                  {/* Case 10 : Montant Global AMO */}
                  <tr className="bg-emerald-900 text-white font-black text-sm">
                    <td className="py-2.5 px-2 text-center font-mono border-r border-emerald-800">10</td>
                    <td className="py-2.5 px-3 border-r border-emerald-800">
                      <div>MONTANT GLOBAL DU VERSEMENT ASSURANCE MALADIE OBLIGATOIRE (AMO)</div>
                      <div className="text-xs font-serif opacity-90 font-normal" dir="rtl">
                        المبلغ الإجمالي للأداء &bull; التأمين الإجباري الأساسي عن المرض
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-emerald-800 opacity-80">-</td>
                    <td className="py-2.5 px-2 text-center font-mono border-r border-emerald-800 opacity-80">-</td>
                    <td className="py-2.5 px-3 text-right font-mono text-base font-black">
                      {formatDevise(doc.voletAmo.montantGlobalVersementAmo)} MAD
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* RECAPITULATIF CONSOLIDÉ GÉNÉRAL & SIGNATURES */}
            <div className="bg-slate-900 text-white rounded-xl p-4 mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-300 font-bold">
                    CHARGE GLOBALE DE COTISATIONS DUE À LA CNSS (RÉGIME GÉNÉRAL + AMO)
                  </div>
                  <div className="text-[11px] text-slate-300 font-serif mt-0.5">
                    RG ({formatDevise(doc.totalCotisationsRegimeGeneral)} MAD) + AMO ({formatDevise(doc.totalCotisationsAmo)} MAD)
                  </div>
                  <div className="text-xs text-amber-300 font-serif italic mt-1">
                    Arrêté à la somme de : {doc.montantEnToutesLettres}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {formatDevise(doc.totalGlobalAPayer)} MAD
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Hash : {doc.hash.slice(0, 24)}...
                  </div>
                </div>
              </div>
            </div>

            {/* BAS DE PAGE OFFICIEL AMO */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans border border-slate-300 rounded-lg p-3">
              <div>
                <div className="font-bold text-slate-800 mb-1">Mode de règlement :</div>
                <div className="space-y-1 text-slate-600">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked readOnly className="rounded text-emerald-600" />
                    <span>Virement Bancaire (Réf CNSS: {doc.voletAmo.referenceStructuree})</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" disabled className="rounded text-slate-400" />
                    <span>Chèque bancaire barré</span>
                  </label>
                </div>
              </div>

              <div className="border-l border-slate-300 pl-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="text-[11px] font-bold text-slate-700">Cachet & Signature de l'Affilié :</div>
                  <div className="text-[10px] text-slate-500 font-mono">Date : {doc.dateCreation.slice(0, 10)}</div>
                </div>
                <div className="h-14 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-[11px] bg-slate-50/50">
                  Cachet de la Société STE MULT.S
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
