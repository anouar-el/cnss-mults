/**
 * Utilitaires de protection et de masquage des données sensibles
 * PROMPT 15 — Application CNSS MULT.S (Conformité CNDP / RGPD)
 */

export function masquerCni(cni?: string | null): string {
  if (!cni || cni.trim() === '') return '-';
  const c = cni.trim().toUpperCase();
  if (c.length <= 4) return c;
  return `${c.slice(0, 2)}***${c.slice(-2)}`;
}

export function masquerCnss(cnss?: string | null): string {
  if (!cnss || cnss.trim() === '') return '-';
  const c = cnss.trim();
  if (c.length <= 5) return c;
  return `${c.slice(0, 3)}***${c.slice(-3)}`;
}

export function tronquerHash(hash?: string | null): string {
  if (!hash || hash.trim() === '') return '-';
  const h = hash.trim();
  if (h.length <= 20) return h;
  return `${h.slice(0, 10)}...${h.slice(-6)}`;
}
