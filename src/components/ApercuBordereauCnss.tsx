/**
 * Composant de Prévisualisation & Impression du Bordereau Administratif CNSS
 * PROMPT 07-B — Rendu fidèle aux formulaires officiels CNSS Maroc :
 * - Formulaire F.212-2-58 (Bordereau de Déclaration des Salariés)
 * - Formulaire F.212-2-59 (Bordereau de Déclaration des Salariés Entrants)
 *
 * Supporte l'affichage bilingue (Français / Arabe), la pagination officielle
 * et l'impression directe au format A4 Paysage.
 */

import React, { useState } from 'react';
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  Download,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  FileText,
  X,
} from 'lucide-react';
import {
  DocumentBordereauCnss,
  PageBordereauOrdinaire,
  PageBordereauEntrant,
} from '../types/cnssBordereau';

interface ApercuBordereauCnssProps {
  document: DocumentBordereauCnss;
  onFermer?: () => void;
  onValiderBordereau?: () => void;
}

export const ApercuBordereauCnss: React.FC<ApercuBordereauCnssProps> = ({
  document: doc,
  onFermer,
  onValiderBordereau,
}) => {
  const [typeBordereau, setTypeBordereau] = useState<'ORDINAIRES' | 'ENTRANTS'>('ORDINAIRES');
  const [pageCouranteIdx, setPageCouranteIdx] = useState(0);

  const pagesOrdinaires = doc.bordereauOrdinaires.pages;
  const pagesEntrants = doc.bordereauEntrants.pages;

  const totalPagesActives =
    typeBordereau === 'ORDINAIRES' ? pagesOrdinaires.length : pagesEntrants.length;

  const pageOrdinaireCourante: PageBordereauOrdinaire | undefined =
    pagesOrdinaires[pageCouranteIdx] || pagesOrdinaires[0];

  const pageEntrantCourante: PageBordereauEntrant | undefined =
    pagesEntrants[pageCouranteIdx] || pagesEntrants[0];

  const changerType = (type: 'ORDINAIRES' | 'ENTRANTS') => {
    setTypeBordereau(type);
    setPageCouranteIdx(0);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900/90 fixed inset-0 z-50 overflow-y-auto flex flex-col items-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* BARRE D'OUTILS FLOTTANTE (Masquée à l'impression) */}
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl p-3 mb-3 shadow-xl flex flex-wrap items-center justify-between gap-3 print:hidden sticky top-2 z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-sm">
                Aperçu Administratif CNSS &bull; {doc.entreprise.raisonSociale}
              </h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                doc.statut === 'VALIDE'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {doc.statut === 'VALIDE' ? 'VERROUILLÉ & VALIDÉ' : 'BROUILLON CONFORME'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Période {doc.mois}/{doc.annee} &bull; Affilié {doc.entreprise.numeroAffiliation} &bull; Agence {doc.entreprise.agence}
            </p>
          </div>
        </div>

        {/* SÉLECTEUR DE TYPE DE BORDEREAU */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => changerType('ORDINAIRES')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              typeBordereau === 'ORDINAIRES'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Salariés Ordinaires ({doc.nombreSalariesOrdinaires})
          </button>
          <button
            onClick={() => changerType('ENTRANTS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              typeBordereau === 'ENTRANTS'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🆕 Entrants ({doc.nombreSalariesEntrants})
          </button>
        </div>

        {/* PAGINATION & ACTIONS */}
        <div className="flex items-center gap-2">
          {totalPagesActives > 1 && (
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <button
                disabled={pageCouranteIdx === 0}
                onClick={() => setPageCouranteIdx(p => Math.max(0, p - 1))}
                className="p-1 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                title="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {pageCouranteIdx + 1} / {totalPagesActives}
              </span>
              <button
                disabled={pageCouranteIdx >= totalPagesActives - 1}
                onClick={() => setPageCouranteIdx(p => Math.min(totalPagesActives - 1, p + 1))}
                className="p-1 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                title="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer</span>
          </button>

          {onValiderBordereau && doc.statut !== 'VALIDE' && (
            <button
              onClick={onValiderBordereau}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Valider</span>
            </button>
          )}

          {onFermer && (
            <button
              onClick={onFermer}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Fermer l'aperçu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* AVERTISSEMENT FORMAT INTERNE (Masqué à l'impression) */}
      <div className="w-full max-w-5xl mb-2 text-center text-[11px] text-slate-300 print:hidden">
        Document généré à partir du registre MULT.S — format administratif interne &bull; Conforme aux maquettes F.212-2-58 et F.212-2-59
      </div>

      {/* FEUILLE OFFICIELLE (SIMULATION A4 PAYSAGE IMPRIMABLE) */}
      <div className="w-full max-w-5xl bg-white border border-slate-400 p-6 sm:p-8 shadow-2xl rounded-sm text-slate-900 font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none">
        {typeBordereau === 'ORDINAIRES' ? (
          // =========================================================================
          // FORMULAIRE F.212-2-58 : BORDEREAU DE DÉCLARATION DES SALARIÉS
          // =========================================================================
          <div>
            {/* EN-TÊTE PRINCIPAL */}
            <div className="border border-slate-900">
              <div className="flex items-center justify-between p-2 border-b border-slate-900 bg-slate-50">
                <div className="text-left font-black text-sm tracking-tight">
                  BORDEREAU DE DÉCLARATION DES SALARIÉS
                </div>

                {/* LOGO CNSS TEXTUEL STYLISÉ */}
                <div className="text-center px-4">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    الضمان الإجتماعي
                  </div>
                  <div className="text-base font-black text-blue-900 tracking-widest -mt-0.5">
                    CNSS
                  </div>
                </div>

                <div className="text-right font-black text-sm" dir="rtl">
                  ورقة التصريح بالأجراء
                </div>
              </div>

              {/* LIGNE DATE ÉMISSION & RÉFÉRENCE STRUCTURÉE */}
              <div className="grid grid-cols-12 text-xs border-b border-slate-900">
                <div className="col-span-2 p-1.5 font-bold border-r border-slate-900 bg-slate-50">
                  EMIS LE
                </div>
                <div className="col-span-2 p-1.5 font-mono font-bold text-center border-r border-slate-900">
                  {doc.bordereauOrdinaires.dateEmission}
                </div>
                <div className="col-span-2 p-1.5 font-bold border-r border-slate-900 text-right" dir="rtl">
                  تاريخ الإصدار
                </div>
                <div className="col-span-3 p-1.5 font-bold border-r border-slate-900 bg-slate-50 flex items-center justify-between">
                  <span>Référence structurée</span>
                  <span dir="rtl">المرجع التركيبي</span>
                </div>
                <div className="col-span-3 p-1.5 font-mono font-bold text-center">
                  {doc.referenceStructuree}
                </div>
              </div>

              {/* COORDONNÉES ENTREPRISE */}
              <div className="p-2 border-b border-slate-900 space-y-0.5 text-xs">
                <div className="font-bold text-slate-950 uppercase">{doc.entreprise.raisonSociale}</div>
                <div className="text-slate-700">{doc.entreprise.adresse}</div>
                <div className="text-slate-700 font-semibold">{doc.entreprise.ville}</div>
              </div>

              {/* BLOC DONNÉES GESTION (N° Affilié, Agence, Mois, Année, Page) */}
              <div className="grid grid-cols-12 text-xs font-bold divide-x divide-slate-900 border-b border-slate-900 bg-slate-50">
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>N° Affilié</span>
                  <span dir="rtl">رقم المنخرط</span>
                </div>
                <div className="col-span-4 p-1.5 flex items-center justify-between">
                  <span>Agence</span>
                  <span dir="rtl">الوكالة</span>
                </div>
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>Mois</span>
                  <span dir="rtl">الشهر</span>
                </div>
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>Année</span>
                  <span dir="rtl">السنة</span>
                </div>
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>Page</span>
                  <span dir="rtl">الصفحة</span>
                </div>
              </div>

              {/* VALEURS BLOC GESTION */}
              <div className="grid grid-cols-12 text-xs font-mono font-bold divide-x divide-slate-900 border-b border-slate-900 text-center py-1.5 bg-white">
                <div className="col-span-2">{doc.entreprise.numeroAffiliation}</div>
                <div className="col-span-4 font-sans uppercase">{doc.entreprise.agence}</div>
                <div className="col-span-2">{doc.mois}</div>
                <div className="col-span-2">{doc.annee}</div>
                <div className="col-span-2">
                  {(pageOrdinaireCourante?.numeroPage || 1)} / {(pageOrdinaireCourante?.totalPages || 1)}
                </div>
              </div>

              {/* TABLEAU DES SALARIÉS (COLONNES BILINGUES) */}
              <div className="grid grid-cols-12 text-xs font-bold divide-x divide-slate-900 border-b border-slate-900 bg-slate-100">
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>N° immatriculé</span>
                  <span dir="rtl">رقم المسجل</span>
                </div>
                <div className="col-span-5 p-1.5 flex items-center justify-between">
                  <span>Nom et prénom</span>
                  <span dir="rtl">الإسم العائلي والشخصي</span>
                </div>
                <div className="col-span-3 p-1.5 flex items-center justify-between">
                  <span>Nombre de jours</span>
                  <span dir="rtl">عدد الأيام</span>
                </div>
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>Situation</span>
                  <span dir="rtl">الوضعية</span>
                </div>
              </div>

              {/* LIGNES SALARIÉS ORDINAIRES */}
              <div className="divide-y divide-slate-300 min-h-[360px] bg-white">
                {pageOrdinaireCourante?.lignes.map(ligne => (
                  <div key={ligne.ligneRegistreId} className="grid grid-cols-12 text-xs divide-x divide-slate-300 py-1.5 hover:bg-slate-50">
                    <div className="col-span-2 px-2 font-mono font-semibold text-slate-800">
                      {ligne.numeroImmatriculation}
                    </div>
                    <div className="col-span-5 px-2 font-bold text-slate-950 uppercase truncate">
                      {ligne.nomPrenom}
                    </div>
                    <div className="col-span-3 px-2 font-mono text-center font-bold">
                      {ligne.nombreJours}
                    </div>
                    <div className="col-span-2 px-2 font-mono text-center font-bold text-rose-700">
                      {ligne.situation || '-'}
                    </div>
                  </div>
                ))}

                {/* LIGNES VIDES POUR COMPLÉTER LE FORMULAIRE SI MOINS DE 12 LIGNES */}
                {Array.from({
                  length: Math.max(0, 12 - (pageOrdinaireCourante?.lignes.length || 0)),
                }).map((_, i) => (
                  <div key={`empty_${i}`} className="grid grid-cols-12 text-xs divide-x divide-slate-200 py-1.5 opacity-20">
                    <div className="col-span-2 px-2">&nbsp;</div>
                    <div className="col-span-5 px-2">&nbsp;</div>
                    <div className="col-span-3 px-2">&nbsp;</div>
                    <div className="col-span-2 px-2">&nbsp;</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BAS DE PAGE (SIGNATURE ET CUMULS) */}
            <div className="grid grid-cols-12 border-x border-b border-slate-900 text-xs mt-1">
              <div className="col-span-5 p-2 border-r border-slate-900 space-y-3">
                <div className="flex items-center justify-between font-bold">
                  <span>Signature et cachet de l'employeur</span>
                  <span dir="rtl">طابع و امضاء المشغل</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 flex items-center justify-between">
                  <span>A ................................. le .................................</span>
                  <span dir="rtl">بتاريخ</span>
                </div>
              </div>

              <div className="col-span-7 p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between font-bold border-b border-slate-300 pb-1">
                  <span>TOTAL CUMULÉ DE LA PAGE ET DES PAGES PRÉCÉDENTES</span>
                  <span dir="rtl">مجموع الصفحة والصفحات السابقة</span>
                </div>
                <div className="flex items-center justify-end gap-6 pt-1 font-mono text-xs">
                  <span className="text-slate-500">
                    Page : <strong>{pageOrdinaireCourante?.totalJoursPage || 0} j</strong>
                  </span>
                  <span className="text-slate-500">
                    Cumul précédent : <strong>{pageOrdinaireCourante?.totalJoursCumulePrecedents || 0} j</strong>
                  </span>
                  <span className="text-slate-900 font-bold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                    Cumul Global : <strong>{pageOrdinaireCourante?.totalJoursCumuleGlobal || 0} j</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* MENTION LÉGALE DE BAS DE FORMULAIRE */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
              <span>NB: pour de plus amples informations se referer aux instructions de</span>
              <span className="font-mono font-bold">F.212-2-58</span>
            </div>
          </div>
        ) : (
          // =========================================================================
          // FORMULAIRE F.212-2-59 : BORDEREAU DES SALARIÉS ENTRANTS
          // =========================================================================
          <div>
            <div className="border border-slate-900">
              <div className="flex items-center justify-between p-2 border-b border-slate-900 bg-slate-50">
                <div className="text-left font-black text-sm tracking-tight">
                  BORDEREAU DE DÉCLARATION DES SALARIÉS ENTRANTS
                </div>

                <div className="text-center px-4">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    الضمان الإجتماعي
                  </div>
                  <div className="text-base font-black text-blue-900 tracking-widest -mt-0.5">
                    CNSS
                  </div>
                </div>

                <div className="text-right font-black text-sm" dir="rtl">
                  ورقة التصريح بالأجراء الجدد
                </div>
              </div>

              {/* COORDONNÉES ENTREPRISE & N° AFFILIÉ */}
              <div className="p-2 border-b border-slate-900 space-y-0.5 text-xs">
                <div className="font-bold text-slate-950 uppercase">{doc.entreprise.raisonSociale}</div>
                <div className="font-mono text-slate-700">{doc.entreprise.numeroAffiliation}</div>
                <div className="text-slate-700 font-semibold">{doc.entreprise.ville}</div>
              </div>

              {/* BLOC DONNÉES GESTION (N° Affilié, Agence, Mois, Année, Page) */}
              <div className="grid grid-cols-12 text-xs font-bold divide-x divide-slate-900 border-b border-slate-900 bg-slate-50">
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>N° Affilié</span>
                  <span dir="rtl">رقم المنخرط</span>
                </div>
                <div className="col-span-4 p-1.5 flex items-center justify-between">
                  <span>Agence</span>
                  <span dir="rtl">الوكالة</span>
                </div>
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>Mois</span>
                  <span dir="rtl">الشهر</span>
                </div>
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>Année</span>
                  <span dir="rtl">السنة</span>
                </div>
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>Page</span>
                  <span dir="rtl">الصفحة</span>
                </div>
              </div>

              {/* VALEURS BLOC GESTION */}
              <div className="grid grid-cols-12 text-xs font-mono font-bold divide-x divide-slate-900 border-b border-slate-900 text-center py-1.5 bg-white">
                <div className="col-span-2">{doc.entreprise.numeroAffiliation}</div>
                <div className="col-span-4 font-sans uppercase">{doc.entreprise.agence}</div>
                <div className="col-span-2">{doc.mois}</div>
                <div className="col-span-2">{doc.annee}</div>
                <div className="col-span-2">
                  {(pageEntrantCourante?.numeroPage || 1)} / {(pageEntrantCourante?.totalPages || 1)}
                </div>
              </div>

              {/* TABLEAU DES SALARIÉS ENTRANTS (AVEC COLONNE CNI) */}
              <div className="grid grid-cols-12 text-xs font-bold divide-x divide-slate-900 border-b border-slate-900 bg-slate-100">
                <div className="col-span-2 p-1.5 flex items-center justify-between">
                  <span>N° immatriculé</span>
                  <span dir="rtl">رقم المسجل</span>
                </div>
                <div className="col-span-4 p-1.5 flex items-center justify-between">
                  <span>Nom et prénom</span>
                  <span dir="rtl">الإسم العائلي والشخصي</span>
                </div>
                <div className="col-span-3 p-1.5 flex items-center justify-between">
                  <span>CNI</span>
                  <span dir="rtl">بطاقة التعريف الوطنية</span>
                </div>
                <div className="col-span-3 p-1.5 flex items-center justify-between">
                  <span>Nbre de jours</span>
                  <span dir="rtl">عدد الأيام</span>
                </div>
              </div>

              {/* LIGNES ENTRANTS */}
              <div className="divide-y divide-slate-300 min-h-[360px] bg-white">
                {pageEntrantCourante?.lignes.map(ligne => (
                  <div key={ligne.ligneRegistreId} className="grid grid-cols-12 text-xs divide-x divide-slate-300 py-1.5 hover:bg-slate-50">
                    <div className="col-span-2 px-2 font-mono font-semibold text-slate-800">
                      {ligne.numeroImmatriculation}
                    </div>
                    <div className="col-span-4 px-2 font-bold text-slate-950 uppercase truncate">
                      {ligne.nomPrenom}
                    </div>
                    <div className="col-span-3 px-2 font-mono font-bold text-purple-900">
                      {ligne.cni}
                    </div>
                    <div className="col-span-3 px-2 font-mono text-center font-bold">
                      {ligne.nombreJours}
                    </div>
                  </div>
                ))}

                {/* LIGNES VIDES */}
                {Array.from({
                  length: Math.max(0, 12 - (pageEntrantCourante?.lignes.length || 0)),
                }).map((_, i) => (
                  <div key={`empty_ent_${i}`} className="grid grid-cols-12 text-xs divide-x divide-slate-200 py-1.5 opacity-20">
                    <div className="col-span-2 px-2">&nbsp;</div>
                    <div className="col-span-4 px-2">&nbsp;</div>
                    <div className="col-span-3 px-2">&nbsp;</div>
                    <div className="col-span-3 px-2">&nbsp;</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BAS DE PAGE */}
            <div className="grid grid-cols-12 border-x border-b border-slate-900 text-xs mt-1">
              <div className="col-span-5 p-2 border-r border-slate-900 space-y-3">
                <div className="flex items-center justify-between font-bold">
                  <span>Signature et cachet de l'employeur</span>
                  <span dir="rtl">طابع و امضاء المشغل</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 flex items-center justify-between">
                  <span>A ................................. le .................................</span>
                  <span dir="rtl">بتاريخ</span>
                </div>
              </div>

              <div className="col-span-7 p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between font-bold border-b border-slate-300 pb-1">
                  <span>TOTAL CUMULÉ DE LA PAGE ET DES PAGES</span>
                  <span dir="rtl">مجموع الصفحة والصفحات السابقة</span>
                </div>
                <div className="flex items-center justify-end gap-6 pt-1 font-mono text-xs">
                  <span className="text-slate-500">
                    Page : <strong>{pageEntrantCourante?.totalJoursPage || 0} j</strong>
                  </span>
                  <span className="text-slate-500">
                    Cumul précédent : <strong>{pageEntrantCourante?.totalJoursCumulePrecedents || 0} j</strong>
                  </span>
                  <span className="text-slate-900 font-bold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                    Cumul Global : <strong>{pageEntrantCourante?.totalJoursCumuleGlobal || 0} j</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
              <span>NB: pour de plus amples informations se referer aux instructions de</span>
              <span className="font-mono font-bold">F.212-2-59</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
