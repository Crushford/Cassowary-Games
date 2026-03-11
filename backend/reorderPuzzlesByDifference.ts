#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import {
  arrangeFamiliesForContrast,
  calculateMedianAttributeDifferences,
  ratePuzzleAttributes,
  scoreAdjacentContrastAverage,
  type MedianAttributeDifferences,
  type PuzzleFamily,
} from './puzzleArrangement';
import {
  extractPuzzleFamilyBaseId,
  type PuzzleDatabaseStructure,
  type PuzzleStringFormat,
} from './puzzleDatabase';

interface CliArgs {
  filePath: string;
  apply: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    filePath: path.resolve(process.cwd(), '../frontend/public/puzzles.json'),
    apply: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--file' && args[i + 1]) {
      result.filePath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    } else if (arg === '--apply') {
      result.apply = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: tsx reorderPuzzlesByDifference.ts [--apply] [--file <path>]

Reorders each size bucket in puzzles.json so similar primary puzzles (-0) are less likely to be adjacent.
All variants for each family are moved together with their primary family.

Options:
  --apply        Write the new order to disk
  --file <path>  Path to puzzles.json (default: ../frontend/public/puzzles.json)
`);
      process.exit(0);
    }
  }

  return result;
}

function byVariantSuffixOrder(a: PuzzleStringFormat, b: PuzzleStringFormat): number {
  const desiredOrder = [
    '-0',
    '-0V',
    '-0H',
    '-0VH',
    '-90',
    '-90V',
    '-90H',
    '-90VH',
    '-180',
    '-180V',
    '-180H',
    '-180VH',
    '-270',
    '-270V',
    '-270H',
    '-270VH',
  ];

  const suffixA = a.id.slice(a.id.lastIndexOf('-'));
  const suffixB = b.id.slice(b.id.lastIndexOf('-'));
  const indexA = desiredOrder.indexOf(suffixA);
  const indexB = desiredOrder.indexOf(suffixB);

  if (indexA === -1 && indexB === -1) return a.id.localeCompare(b.id);
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
}

function buildFamiliesForSize(puzzles: PuzzleStringFormat[]): PuzzleFamily[] {
  const byFamily = new Map<string, PuzzleStringFormat[]>();
  const familyOrder: string[] = [];

  for (const puzzle of puzzles) {
    const familyId = extractPuzzleFamilyBaseId(puzzle.id);
    if (!familyId) continue;
    if (!byFamily.has(familyId)) {
      byFamily.set(familyId, []);
      familyOrder.push(familyId);
    }
    byFamily.get(familyId)!.push(puzzle);
  }

  const families: PuzzleFamily[] = [];
  for (const familyId of familyOrder) {
    const members = [...(byFamily.get(familyId) || [])].sort(byVariantSuffixOrder);
    const primary = members.find((p) => p.id.endsWith('-0'));
    if (!primary) continue;
    families.push({ familyId, primary, members });
  }

  return families;
}

function formatMedianDiffs(medians: MedianAttributeDifferences): string {
  return `sizeVar=${medians.regionSizeVariance.toFixed(2)}, compact=${medians.regionCompactness.toFixed(
    2
  )}, elong=${medians.regionElongation.toFixed(2)}, adjacency=${medians.regionAdjacencyDensity.toFixed(
    2
  )}`;
}

function reorderOneSize(
  sizeKey: string,
  puzzles: PuzzleStringFormat[]
): { reordered: PuzzleStringFormat[]; changed: boolean } {
  const families = buildFamiliesForSize(puzzles);
  if (families.length < 3) {
    return { reordered: puzzles, changed: false };
  }

  const ratings = families.map((f) => ratePuzzleAttributes(f.primary.layout));
  const medians = calculateMedianAttributeDifferences(ratings);

  const originalContrast = scoreAdjacentContrastAverage(families, medians);
  const reorderedFamilies = arrangeFamiliesForContrast(families, medians);
  const reorderedContrast = scoreAdjacentContrastAverage(reorderedFamilies, medians);

  const finalOrder = reorderedContrast >= originalContrast ? reorderedFamilies : families;

  const changed =
    finalOrder.map((f) => f.familyId).join('|') !== families.map((f) => f.familyId).join('|');
  const reordered = finalOrder.flatMap((f) => f.members);

  console.log(`\n${sizeKey}`);
  console.log(`  families: ${families.length}`);
  console.log(`  median diffs: ${formatMedianDiffs(medians)}`);
  console.log(`  adjacent contrast before: ${originalContrast.toFixed(2)}`);
  console.log(
    `  adjacent contrast after:  ${Math.max(originalContrast, reorderedContrast).toFixed(2)}`
  );
  console.log(`  changed: ${changed ? 'yes' : 'no'}`);

  return { reordered, changed };
}

function reorderAllSizes(database: PuzzleDatabaseStructure): {
  output: PuzzleDatabaseStructure;
  changedSizes: number;
} {
  const output: PuzzleDatabaseStructure = { ...database };
  let changedSizes = 0;

  for (const [sizeKey, puzzles] of Object.entries(database)) {
    const { reordered, changed } = reorderOneSize(sizeKey, puzzles);
    output[sizeKey] = reordered;
    if (changed) changedSizes++;
  }

  return { output, changedSizes };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.filePath)) {
    console.error(`File not found: ${args.filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(args.filePath, 'utf8');
  const database = JSON.parse(raw) as PuzzleDatabaseStructure;
  const beforeCount = Object.values(database).reduce((sum, list) => sum + list.length, 0);

  console.log(`Scanning file: ${args.filePath}`);
  console.log(`Total puzzle entries: ${beforeCount}`);

  const { output, changedSizes } = reorderAllSizes(database);
  console.log(`\nSizes reordered: ${changedSizes}`);

  if (!args.apply) {
    console.log('Dry run only. Re-run with --apply to write changes.');
    return;
  }

  fs.writeFileSync(args.filePath, `${JSON.stringify(output, null, 2)}\n`);
  console.log('Applied reordered puzzle family layout.');
}

main();
