// scripts/printOddsTables.ts
import { buildOddsRowsInteger } from '../src/lib/kenoOdds';

for (let g = 1; g <= 5; g++) {
  const rows = buildOddsRowsInteger(g);
  console.log(`### Selections: ${g}`);
  console.log('| k | probability | 1 in X | fair payout (to-1, integer) |');
  console.log('|---:|---:|---:|---:|');
  for (const r of rows) {
    const prob = r.probability.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
    const oneIn = Number.isFinite(r.oneIn) ? r.oneIn.toFixed(4) : '∞';
    console.log(`| ${r.k} | ${prob} | ${oneIn} | ${r.fairPayoutTo1} |`);
  }
  console.log('');
}

