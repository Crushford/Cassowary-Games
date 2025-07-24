/**
 * Puzzle Database Management
 *
 * Handles compact puzzle string format storage and retrieval.
 * Puzzles are stored in puzzles.json using efficient string encoding.
 */

import fs from 'fs';
import type { GridSquare } from '../src/types/types';

// === Types ===
export interface PuzzleStringFormat {
  id: string; // Unique alphanumeric identifier (e.g. 'pz-0012')
  layout: string; // One character per tile representing groupColor
  queens: string; // One character per tile: 'Q' for queen, '.' for empty
  createdAt: string; // ISO timestamp when the puzzle was generated
}

// === Variant Transform System Type ===
type CoordinateTransform = (row: number, column: number) => [number, number];

export class PuzzleDatabase {
  private puzzles: PuzzleStringFormat[] = [];
  private readonly filePath: string;

  constructor(filePath: string = '../public/puzzles.json') {
    this.filePath = filePath;
    this.load();
  }

  // === Core Database Operations ===

  /**
   * Load puzzles from file or create new database
   */
  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        this.puzzles = JSON.parse(data) as PuzzleStringFormat[];
        console.log(`Loaded ${this.puzzles.length} existing puzzles`);
      } else {
        console.log('Creating new puzzle database');
        this.puzzles = [];
      }
    } catch (error) {
      console.warn(`Error loading puzzles: ${error}. Creating new database.`);
      this.puzzles = [];
    }
  }

  /**
   * Save puzzles to file
   */
  private save(): void {
    try {
      const json = JSON.stringify(this.puzzles, null, 2);
      fs.writeFileSync(this.filePath, json);
      console.log(`Saved ${this.puzzles.length} puzzles to database`);
    } catch (error) {
      console.error(`Error saving puzzles: ${error}`);
      throw error;
    }
  }

  /**
   * Generate next unique ID
   */
  private generateNextId(): string {
    if (this.puzzles.length === 0) {
      return 'pz-0001';
    }

    // Extract numeric suffixes from existing IDs
    const numericSuffixes = this.puzzles
      .map((p) => p.id)
      .filter((id) => id.startsWith('pz-'))
      .map((id) => {
        const match = id.match(/pz-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });

    const maxSuffix = Math.max(...numericSuffixes, 0);
    const nextSuffix = maxSuffix + 1;

    return `pz-${nextSuffix.toString().padStart(4, '0')}`;
  }

  // === Puzzle Encoding/Decoding ===

  /**
   * Encode a grid into compact string format
   */
  private encodePuzzle(grid: GridSquare[][]): { layout: string; queens: string } {
    const size = grid.length;
    let layout = '';
    let queens = '';

    // Create color mapping for this puzzle
    const colorToLetter = new Map<string, string>();
    let nextLetter = 'A';

    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        const cell = grid[row][column];

        // Encode queen position
        queens += cell.isSolutionQueen ? 'Q' : '.';

        // Encode color
        if (cell.groupColor) {
          if (!colorToLetter.has(cell.groupColor)) {
            colorToLetter.set(cell.groupColor, nextLetter);
            nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
          }
          layout += colorToLetter.get(cell.groupColor);
        } else {
          layout += '.'; // No color assigned
        }
      }
    }

    return { layout, queens };
  }

  // === Variant Transform System (Refactored) ===

  private transformGrid(
    originalGrid: GridSquare[][],
    transform: CoordinateTransform
  ): GridSquare[][] {
    const gridSize = originalGrid.length;
    const newGrid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

    for (let row = 0; row < gridSize; row++) {
      for (let column = 0; column < gridSize; column++) {
        const [newRow, newColumn] = transform(row, column);
        newGrid[newRow][newColumn] = {
          ...originalGrid[row][column],
          position: { row: newRow, col: newColumn },
        };
      }
    }

    return newGrid;
  }

  /**
   * Generate all 16 variants of a puzzle (4 rotations + mirrors for each), with descriptive suffixes
   * Returns: Array of [variantGrid, suffix]
   */
  private generateAllVariants(grid: GridSquare[][]): [GridSquare[][], string][] {
    const size = grid.length;

    // Single rotate90 function
    const rotate90 = (input: GridSquare[][]): GridSquare[][] => {
      const newGrid = Array.from({ length: size }, () => Array(size).fill(null));
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          newGrid[col][size - 1 - row] = {
            ...input[row][col],
            position: { row: col, col: size - 1 - row },
          };
        }
      }
      return newGrid;
    };

    // Mirror functions
    const mirrorVertical = (input: GridSquare[][]): GridSquare[][] => {
      return input.map((row, rowIdx) =>
        row.map((cell, colIdx) => ({
          ...input[size - 1 - rowIdx][colIdx],
          position: { row: rowIdx, col: colIdx },
        }))
      );
    };
    const mirrorHorizontal = (input: GridSquare[][]): GridSquare[][] => {
      return input.map((row, rowIdx) =>
        row.map((cell, colIdx) => ({
          ...input[rowIdx][size - 1 - colIdx],
          position: { row: rowIdx, col: colIdx },
        }))
      );
    };

    // Rotations
    const original = grid;
    const rot90 = rotate90(original);
    const rot180 = rotate90(rot90);
    const rot270 = rotate90(rot180);

    // Helper to generate all 4 mirror variants for a given grid and base name
    const variantsFor = (baseGrid: GridSquare[][], baseName: string) =>
      [
        [baseGrid, baseName],
        [mirrorVertical(baseGrid), baseName + 'V'],
        [mirrorHorizontal(baseGrid), baseName + 'H'],
        [mirrorHorizontal(mirrorVertical(baseGrid)), baseName + 'VH'],
      ] as [GridSquare[][], string][];

    // Collect all variants
    return [
      ...variantsFor(original, '0'),
      ...variantsFor(rot90, '90'),
      ...variantsFor(rot180, '180'),
      ...variantsFor(rot270, '270'),
    ];
  }

  /**
   * Check if a puzzle is a duplicate
   */
  private isDuplicate(puzzle: { layout: string; queens: string }): boolean {
    return this.puzzles.some(
      (existing) => existing.layout === puzzle.layout && existing.queens === puzzle.queens
    );
  }

  // === Public API ===

  /**
   * Add a puzzle to the database (including all 16 variants)
   * Returns true if any new puzzles were added, false if all were duplicates
   */
  addPuzzle(grid: GridSquare[][]): boolean {
    const variants: [GridSquare[][], string][] = this.generateAllVariants(grid);
    const baseId = this.generateNextId();
    let addedCount = 0;
    let skippedCount = 0;
    console.log(`[DEBUG] Generating ${variants.length} variants for baseId ${baseId}`);

    for (let i = 0; i < variants.length; i++) {
      const [variant, suffix] = variants[i];
      const encoded = this.encodePuzzle(variant);

      // Check for duplicates
      const duplicate = this.puzzles.find(
        (existing) => existing.layout === encoded.layout && existing.queens === encoded.queens
      );
      if (duplicate) {
        console.log(`[DEBUG] Skipped variant ${suffix} (duplicate)`);
        console.log(`  layout: ${encoded.layout}`);
        console.log(`  queens: ${encoded.queens}`);
        console.log(`  matched existing id: ${duplicate.id}`);
        skippedCount++;
        continue;
      }

      // Generate ID with descriptive suffix
      const id = `${baseId}-${suffix}`;

      // Create puzzle entry
      const puzzle: PuzzleStringFormat = {
        id,
        layout: encoded.layout,
        queens: encoded.queens,
        createdAt: new Date().toISOString(),
      };

      this.puzzles.push(puzzle);
      console.log(`[DEBUG] Added puzzle ${id} to database`);
      addedCount++;
    }

    console.log(`[DEBUG] Variants added: ${addedCount}, skipped (duplicates): ${skippedCount}`);

    if (addedCount > 0) {
      // Save to file
      this.save();
      console.log(`Added ${addedCount} new puzzle variants to database`);
      return true;
    } else {
      console.log('All variants already exist, no new puzzles added.');
      return false;
    }
  }

  /**
   * Get all puzzles
   */
  getAllPuzzles(): PuzzleStringFormat[] {
    return [...this.puzzles];
  }

  /**
   * Get puzzle by ID
   */
  getPuzzle(id: string): PuzzleStringFormat | undefined {
    return this.puzzles.find((p) => p.id === id);
  }

  /**
   * Delete puzzle by ID
   * Returns true if deleted, false if not found
   */
  deletePuzzle(id: string): boolean {
    const index = this.puzzles.findIndex((p) => p.id === id);
    if (index === -1) {
      console.log(`Puzzle ${id} not found in database`);
      return false;
    }

    this.puzzles.splice(index, 1);
    console.log(`Deleted puzzle ${id} from database`);
    this.save();
    return true;
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalPuzzles: number;
    gridSizes: number[];
    uniqueLayouts: number;
    dateRange?: { start: string; end: string };
  } {
    if (this.puzzles.length === 0) {
      return {
        totalPuzzles: 0,
        gridSizes: [],
        uniqueLayouts: 0,
      };
    }

    const gridSizes = this.puzzles.map((p) => Math.sqrt(p.layout.length));
    const uniqueSizes = [...new Set(gridSizes)];
    const uniqueLayouts = new Set(this.puzzles.map((p) => p.layout)).size;

    let dateRange: { start: string; end: string } | undefined;
    if (this.puzzles.length > 1) {
      const dates = this.puzzles.map((p) => new Date(p.createdAt)).sort();
      dateRange = {
        start: dates[0].toISOString(),
        end: dates[dates.length - 1].toISOString(),
      };
    }

    return {
      totalPuzzles: this.puzzles.length,
      gridSizes: uniqueSizes,
      uniqueLayouts,
      dateRange,
    };
  }

  /**
   * Export puzzle to separate file
   */
  exportPuzzle(id: string): void {
    const puzzle = this.getPuzzle(id);
    if (!puzzle) {
      console.log(`Puzzle ${id} not found in database`);
      return;
    }

    const exportData = {
      puzzle: puzzle,
      exportDate: new Date().toISOString(),
      exportSource: this.filePath,
    };

    const filename = `puzzle-${id}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`Exported puzzle ${id} to ${filename}`);
  }

  /**
   * List all puzzles with details
   */
  listPuzzles(): void {
    console.log('\n=== Puzzle Database ===');
    console.log(`Total puzzles: ${this.puzzles.length}`);

    if (this.puzzles.length === 0) {
      console.log('No puzzles in database');
      return;
    }

    console.log('\nPuzzles:');
    this.puzzles.forEach((puzzle, index) => {
      const gridSize = Math.sqrt(puzzle.layout.length);
      console.log(`${index + 1}. ${puzzle.id}`);
      console.log(`   Created: ${puzzle.createdAt}`);
      console.log(`   Grid size: ${gridSize}x${gridSize}`);
      console.log(`   Layout: ${puzzle.layout}`);
      console.log(`   Queens: ${puzzle.queens}`);
      console.log('');
    });
  }

  /**
   * Display database statistics
   */
  showStats(): void {
    const stats = this.getStats();

    if (stats.totalPuzzles === 0) {
      console.log('No puzzles in database for statistics');
      return;
    }

    console.log('\n=== Database Statistics ===');
    console.log(`Total puzzles: ${stats.totalPuzzles}`);
    console.log(`Grid sizes: ${stats.gridSizes.join(', ')}`);
    console.log(`Unique layouts: ${stats.uniqueLayouts}`);

    if (stats.dateRange) {
      console.log(`Date range: ${stats.dateRange.start} to ${stats.dateRange.end}`);
    }
  }
}
