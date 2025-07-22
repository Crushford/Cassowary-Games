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
      for (let col = 0; col < size; col++) {
        const cell = grid[row][col];

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

  /**
   * Rotate a grid 90 degrees clockwise
   */
  private rotateGrid90Degrees(grid: GridSquare[][]): GridSquare[][] {
    const size = grid.length;
    const rotated = Array(size)
      .fill(null)
      .map(() => Array(size).fill(null));

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        // Rotate 90 degrees clockwise: (row, col) -> (col, size-1-row)
        const newRow = col;
        const newCol = size - 1 - row;
        rotated[newRow][newCol] = {
          ...grid[row][col],
          position: { row: newRow, col: newCol },
        };
      }
    }

    return rotated;
  }

  /**
   * Mirror a grid horizontally
   */
  private mirrorGridHorizontally(grid: GridSquare[][]): GridSquare[][] {
    const size = grid.length;
    const mirrored = Array(size)
      .fill(null)
      .map(() => Array(size).fill(null));

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        // Mirror horizontally: (row, col) -> (row, size-1-col)
        const newRow = row;
        const newCol = size - 1 - col;
        mirrored[newRow][newCol] = {
          ...grid[row][col],
          position: { row: newRow, col: newCol },
        };
      }
    }

    return mirrored;
  }

  /**
   * Mirror a grid vertically
   */
  private mirrorGridVertically(grid: GridSquare[][]): GridSquare[][] {
    const size = grid.length;
    const mirrored = Array(size)
      .fill(null)
      .map(() => Array(size).fill(null));

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        // Mirror vertically: (row, col) -> (size-1-row, col)
        const newRow = size - 1 - row;
        const newCol = col;
        mirrored[newRow][newCol] = {
          ...grid[row][col],
          position: { row: newRow, col: newCol },
        };
      }
    }

    return mirrored;
  }

  /**
   * Generate all 16 variants of a puzzle (4 rotations + mirrors for each)
   */
  private generateAllVariants(grid: GridSquare[][]): GridSquare[][][] {
    // Original puzzle (0° rotation)
    const original = grid;

    // Horizontal mirror of original
    const originalH = this.mirrorGridHorizontally(original);

    // Vertical mirror of original
    const originalV = this.mirrorGridVertically(original);

    // Both mirrors of original
    const originalHV = this.mirrorGridVertically(this.mirrorGridHorizontally(original));

    // 90 degree rotation
    const rotation90 = this.rotateGrid90Degrees(grid);

    // Horizontal mirror of 90° rotation
    const rotation90H = this.mirrorGridHorizontally(rotation90);

    // Vertical mirror of 90° rotation
    const rotation90V = this.mirrorGridVertically(rotation90);

    // Both mirrors of 90° rotation
    const rotation90HV = this.mirrorGridVertically(this.mirrorGridHorizontally(rotation90));

    // 180 degree rotation
    const rotation180 = this.rotateGrid90Degrees(rotation90);

    // Horizontal mirror of 180° rotation
    const rotation180H = this.mirrorGridHorizontally(rotation180);

    // Vertical mirror of 180° rotation
    const rotation180V = this.mirrorGridVertically(rotation180);

    // Both mirrors of 180° rotation
    const rotation180HV = this.mirrorGridVertically(this.mirrorGridHorizontally(rotation180));

    // 270 degree rotation
    const rotation270 = this.rotateGrid90Degrees(rotation180);

    // Horizontal mirror of 270° rotation
    const rotation270H = this.mirrorGridHorizontally(rotation270);

    // Vertical mirror of 270° rotation
    const rotation270V = this.mirrorGridVertically(rotation270);

    // Both mirrors of 270° rotation
    const rotation270HV = this.mirrorGridVertically(this.mirrorGridHorizontally(rotation270));

    return [
      original,
      originalH,
      originalV,
      originalHV,
      rotation90,
      rotation90H,
      rotation90V,
      rotation90HV,
      rotation180,
      rotation180H,
      rotation180V,
      rotation180HV,
      rotation270,
      rotation270H,
      rotation270V,
      rotation270HV,
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
   * Add a puzzle to the database (including all 4 rotations)
   * Returns true if any new puzzles were added, false if all were duplicates
   */
  addPuzzle(grid: GridSquare[][]): boolean {
    const variants: GridSquare[][][] = this.generateAllVariants(grid);
    const baseId = this.generateNextId();
    const suffixes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    let addedCount = 0;

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const encoded = this.encodePuzzle(variant);

      // Check for duplicates
      if (this.isDuplicate(encoded)) {
        console.log(`Variant ${suffixes[i]} already exists, skipping.`);
        continue;
      }

      // Generate ID with suffix
      const id = `${baseId}-${suffixes[i]}`;

      // Create puzzle entry
      const puzzle: PuzzleStringFormat = {
        id,
        layout: encoded.layout,
        queens: encoded.queens,
        createdAt: new Date().toISOString(),
      };

      this.puzzles.push(puzzle);
      console.log(`Added puzzle ${id} to database`);
      addedCount++;
    }

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
