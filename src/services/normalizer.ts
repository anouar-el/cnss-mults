/**
 * Service de normalisation des noms et identifiants - PROMPT 01
 * Conforme à la règle : la normalisation ne modifie jamais les données originales.
 */

/**
 * Normalise une chaîne de nom ou prénom selon les règles :
 * - majuscules
 * - suppression des accents
 * - suppression des espaces inutiles
 * - remplacement des tirets par des espaces
 * - suppression de la ponctuation
 * - normalisation des apostrophes
 */
export function normaliserNom(texte: string): string {
  if (!texte) return '';

  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques et accents
    .toUpperCase()
    .replace(/['’`]/g, ' ')           // Apostrophes converties en espaces
    .replace(/[-_.,;:/?!\\()\[\]{}*+&=]/g, ' ') // Tirets et ponctuations en espaces
    .replace(/\s+/g, ' ')             // Réduction des espaces multiples
    .trim();
}

/**
 * Extrait et trie alphabétiquement les tokens pour comparaison indépendante de l'ordre
 * Exemple : "IMRAN SAAD" -> ["IMRAN", "SAAD"]
 * Exemple : "SAAD IMRAN" -> ["IMRAN", "SAAD"]
 */
export function extraireTokensTries(texte: string): string[] {
  const norm = normaliserNom(texte);
  if (!norm) return [];

  return norm
    .split(' ')
    .filter(token => token.length > 0)
    .sort();
}

/**
 * Normalise une chaîne CNI marocaine (ex: " WA335382 " -> "WA335382")
 */
export function normaliserCni(cni?: string | null): string {
  if (!cni) return '';
  return String(cni).toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

/**
 * Normalise un numéro d'immatriculation CNSS (ex: "101455267.0" -> "101455267")
 */
export function normaliserCnss(cnss?: string | number | null): string {
  if (cnss === undefined || cnss === null) return '';
  let val = String(cnss).trim();
  if (val.endsWith('.0')) {
    val = val.slice(0, -2);
  }
  return val.replace(/[^0-9]/g, '');
}

/**
 * Distance de Levenshtein
 */
export function distanceLevenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Score de similarité Levenshtein entre 0 et 100
 */
export function scoreLevenshtein(a: string, b: string): number {
  const normA = normaliserNom(a);
  const normB = normaliserNom(b);
  if (normA === normB) return 100;
  if (!normA || !normB) return 0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 100;

  const dist = distanceLevenshtein(normA, normB);
  return Math.round(Math.max(0, ((maxLen - dist) / maxLen) * 100));
}

/**
 * Score Token Sort (compare les tokens triés)
 * Exemple: "ZAGOURI ACHRAF" vs "ACHRAF ZAGOURI" -> 100
 */
export function scoreTokenSort(a: string, b: string): number {
  const tokensA = extraireTokensTries(a).join(' ');
  const tokensB = extraireTokensTries(b).join(' ');

  if (tokensA === tokensB) return 100;
  return scoreLevenshtein(tokensA, tokensB);
}

/**
 * Compresse les lettres doublées consécutives (chadda/alif phonétique fréquent dans la transcription arabe)
 * Exemple: "AATLATI" -> "ATLATI", "ELATLLATI" -> "ELATLATI"
 */
export function compresserDoubles(texte: string): string {
  return normaliserNom(texte).replace(/([A-Z])\1+/g, '$1');
}

/**
 * Score de similarité avancé combinant Token-Sort, Levenshtein, préfixes et compression des doubles
 */
export function scoreSimilariteAvancee(a: string, b: string): number {
  const normA = normaliserNom(a);
  const normB = normaliserNom(b);
  if (normA === normB) return 100;
  if (!normA || !normB) return 0;

  // 1. Token Sort
  const sTS = scoreTokenSort(a, b);

  // 2. Levenshtein standard
  const sLev = scoreLevenshtein(normA, normB);

  // 3. Variante avec préfixes accolés (EL, BEN, AIT)
  const normPrefA = normA.replace(/\b(EL|BEN|AIT)\s+/g, '$1');
  const normPrefB = normB.replace(/\b(EL|BEN|AIT)\s+/g, '$1');
  const sPref = scoreLevenshtein(normPrefA, normPrefB);

  // 4. Variante phonétique avec compression des consonnes/voyelles doubles
  const normCompA = compresserDoubles(normPrefA);
  const normCompB = compresserDoubles(normPrefB);
  const sComp = scoreLevenshtein(normCompA, normCompB);

  return Math.max(sTS, sLev, sPref, Math.round(sComp * 0.96));
}

/**
 * Comparaison intelligente de préfixes marocains fréquents (EL, BEN, AIT)
 * Exemple: "EL AOUACHY OUSSAMA" vs "ELAOUACHY OUSSAMA"
 */
export function correspondAvecVariantePrefixe(a: string, b: string): boolean {
  const normA = normaliserNom(a).replace(/\b(EL|BEN|AIT)\s+/g, '$1');
  const normB = normaliserNom(b).replace(/\b(EL|BEN|AIT)\s+/g, '$1');

  if (normA === normB) return true;

  const tokensA = extraireTokensTries(normA).join(' ');
  const tokensB = extraireTokensTries(normB).join(' ');
  return tokensA === tokensB;
}
