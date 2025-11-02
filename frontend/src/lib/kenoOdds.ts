// src/lib/kenoOdds.ts

export const N = 25; // total squares

export const W = 5; // winning squares

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let num = 1,
    den = 1;
  for (let i = 1; i <= k; i++) {
    num *= n - (k - i);
    den *= i;
  }
  return num / den;
}

// P(exactly k matches) for g selections
export function probExactK(g: number, k: number, Ntot = N, Wwin = W): number {
  return (comb(Wwin, k) * comb(Ntot - Wwin, g - k)) / comb(Ntot, g);
}

// probabilities for k = 0..min(g, W)
export function probsForGuesses(g: number, Ntot = N, Wwin = W): number[] {
  const maxK = Math.min(g, Wwin);
  const out: number[] = [];
  for (let k = 0; k <= maxK; k++) out.push(probExactK(g, k, Ntot, Wwin));
  return out;
}

// FAIR payouts (to-1) = 1 / p, or 0 when p = 0
export function fairPayoutsTo1ForGuesses(g: number, Ntot = N, Wwin = W): number[] {
  const ps = probsForGuesses(g, Ntot, Wwin);
  return ps.map((p) => (p > 0 ? 1 / p : 0));
}

// --- NEW: Integer fair payouts (to-1), floored. k=0 always 0.
export function fairPayoutsTo1Integer(g: number, Ntot = N, Wwin = W): number[] {
  const ps = probsForGuesses(g, Ntot, Wwin);
  return ps.map((p, k) => {
    if (k === 0) return 0; // 0 matches always pays 0
    if (p <= 0) return 0;
    const fair = 1 / p;
    const floored = Math.floor(fair);
    return floored > 0 ? floored : 0;
  });
}

// Row builder for UI tables
export function buildOddsRows(g: number, Ntot = N, Wwin = W) {
  const ps = probsForGuesses(g, Ntot, Wwin);
  return ps.map((p, k) => ({
    k,
    probability: p,
    oneIn: p > 0 ? 1 / p : Infinity,
    fairPayoutTo1: p > 0 ? 1 / p : 0,
  }));
}

// --- UPDATED: rows for UI using integer payouts
export function buildOddsRowsInteger(g: number, Ntot = N, Wwin = W) {
  const ps = probsForGuesses(g, Ntot, Wwin);
  const payouts = fairPayoutsTo1Integer(g, Ntot, Wwin);
  return ps
    .map((p, k) => ({
      k,
      probability: p,
      oneIn: p > 0 ? 1 / p : Infinity,
      fairPayoutTo1: payouts[k], // integer, floored, 0 for k=0
    }))
    .filter((row) => row.k > 0); // Remove k=0 row
}
