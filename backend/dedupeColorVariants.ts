#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import {
  buildColorInvariantSignature,
  extractPuzzleFamilyBaseId,
  type PuzzleDatabaseStructure,
  type PuzzleStringFormat,
} from './puzzleDatabase';

type Args = {
  apply: boolean;
  filePath?: string;
};

type SignatureGroup = {
  signature: string;
  keepFamily: string;
  removeFamilies: string[];
};

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--file') {
      args.filePath = argv[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: tsx dedupeColorVariants.ts [--apply] [--file <path>]

Scans puzzles.json for same-size duplicate puzzle families that differ only by color labels.
Only families with original ids ending in "-0" are considered candidates.

Options:
  --apply        Write removals back to puzzles.json
  --file <path>  Path to puzzles.json (default: frontend/public/puzzles.json)
`);
      process.exit(0);
    }
  }

  return args;
}

function resolveDefaultFilePath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'frontend/public/puzzles.json'),
    path.resolve(process.cwd(), '../frontend/public/puzzles.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function stableFamilySort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

function findDuplicateColorGroups(puzzles: PuzzleStringFormat[]): SignatureGroup[] {
  const originals = puzzles.filter((p) => p.id.endsWith('-0'));
  const signatureToFamilies = new Map<string, Set<string>>();

  for (const puzzle of originals) {
    const family = extractPuzzleFamilyBaseId(puzzle.id);
    if (!family) {
      continue;
    }
    const signature = buildColorInvariantSignature(puzzle.layout, puzzle.queens);
    if (!signatureToFamilies.has(signature)) {
      signatureToFamilies.set(signature, new Set());
    }
    signatureToFamilies.get(signature)!.add(family);
  }

  const groups: SignatureGroup[] = [];
  for (const [signature, families] of signatureToFamilies) {
    if (families.size < 2) {
      continue;
    }
    const sortedFamilies = Array.from(families).sort(stableFamilySort);
    groups.push({
      signature,
      keepFamily: sortedFamilies[0],
      removeFamilies: sortedFamilies.slice(1),
    });
  }

  return groups.sort((a, b) => stableFamilySort(a.keepFamily, b.keepFamily));
}

function collectFamilyIdsToRemove(
  puzzles: PuzzleStringFormat[],
  familiesToRemove: Set<string>
): string[] {
  return puzzles
    .filter((puzzle) => {
      const family = extractPuzzleFamilyBaseId(puzzle.id);
      return !!family && familiesToRemove.has(family);
    })
    .map((p) => p.id);
}

function removeIdsFromSize(
  puzzles: PuzzleStringFormat[],
  idsToRemove: string[]
): PuzzleStringFormat[] {
  const idSet = new Set(idsToRemove);
  return puzzles.filter((p) => !idSet.has(p.id));
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const filePath = args.filePath
    ? path.resolve(process.cwd(), args.filePath)
    : resolveDefaultFilePath();

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as PuzzleDatabaseStructure;
  const beforeTotal = Object.values(data).reduce((sum, list) => sum + list.length, 0);
  let removedIdsTotal = 0;
  let removedFamiliesTotal = 0;

  console.log(`Scanning: ${filePath}`);
  console.log(`Total puzzles before scan: ${beforeTotal}`);

  for (const [sizeKey, puzzles] of Object.entries(data)) {
    const groups = findDuplicateColorGroups(puzzles);
    if (groups.length === 0) {
      continue;
    }

    const familiesToRemove = new Set(groups.flatMap((group) => group.removeFamilies));
    const idsToRemove = collectFamilyIdsToRemove(puzzles, familiesToRemove);

    removedFamiliesTotal += familiesToRemove.size;
    removedIdsTotal += idsToRemove.length;

    console.log(`\n${sizeKey}:`);
    console.log(`  duplicate color-signature groups: ${groups.length}`);
    console.log(`  families to remove: ${familiesToRemove.size}`);
    console.log(`  puzzle ids to remove: ${idsToRemove.length}`);
    for (const group of groups) {
      console.log(`  keep ${group.keepFamily}, remove ${group.removeFamilies.join(', ')}`);
    }

    if (args.apply) {
      data[sizeKey] = removeIdsFromSize(puzzles, idsToRemove);
    }
  }

  if (removedIdsTotal === 0) {
    console.log('\nNo duplicate color-only families found.');
    return;
  }

  console.log(`\nTotal families to remove: ${removedFamiliesTotal}`);
  console.log(`Total puzzle ids to remove: ${removedIdsTotal}`);

  if (!args.apply) {
    console.log('\nDry run only. Re-run with --apply to write changes.');
    return;
  }

  const afterTotal = Object.values(data).reduce((sum, list) => sum + list.length, 0);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`\nApplied changes. Total puzzles after: ${afterTotal}`);
}

main();
