/**
 * Client-facing proposal URLs: /proposals/{client-slug}/{created-date}/{cartId}
 * Slug + date + cartId are verified against the cart when loading via the "slug" API route.
 */

/** URL-safe slug from client display name (lowercase, hyphens). */
export function slugifyClientNameForProposal(name: string): string {
    const raw = (name || '').trim().toLowerCase();
    if (!raw) return 'client';
    const s = raw
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return s || 'client';
}

/** Cart created date in UTC as YYYY-MM-DD (for stable links). */
export function formatCartCreatedDateForProposalUrl(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/**
 * Full URL for the client proposal app (e.g. https://www.ampli5.ai/proposals/acme/2026-04-01/{cartId}).
 */
export function buildProposalClientUrl(
    baseUrl: string,
    clientName: string,
    cartCreatedAt: Date,
    cartId: string,
): string {
    const base = baseUrl.replace(/\/$/, '');
    const slug = slugifyClientNameForProposal(clientName);
    const date = formatCartCreatedDateForProposalUrl(cartCreatedAt);
    return `${base}/proposals/${slug}/${date}/${cartId}`;
}
