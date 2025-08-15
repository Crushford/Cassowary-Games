import fs from 'fs';
import path from 'path';
import type { GridSquare, MarkType } from '../src/types/types';
import { createEmptyGrid } from '../src/stores/gridUtils';
import { validatePuzzleHasSingleSolution } from '../src/utils/validatePuzzleHasSingleSolution';

interface PuzzleData {
  gridSize: number;
  grid: GridSquare[][];
  solution: GridSquare[][];
  timestamp: string;
}

interface GenerationOptions {
  gridSize: number;
  maxPuzzles: number;
  maxAttempts: number;
  outputFile: string;
}

// Function to generate a random puzzle
function generateRandomPuzzle(gridSize: number): GridSquare[][] {
  const grid = createEmptyGrid(gridSize);
  // TODO: Implement random puzzle generation logic
  // This should use the existing game logic to generate a valid puzzle
  return grid;
}

class PuzzleGenerator {
  private gridSize: number;
  private maxPuzzles: number;
  private maxAttempts: number;
  private outputFile: string;
  private existingPuzzles: PuzzleData[] = [];

  constructor(options: GenerationOptions) {
    this.gridSize = options.gridSize;
    this.maxPuzzles = options.maxPuzzles;
    this.maxAttempts = options.maxAttempts;
    this.outputFile = options.outputFile;
    this.loadExistingPuzzles();
  }

  private loadExistingPuzzles() {
    try {
      if (fs.existsSync(this.outputFile)) {
        const data = fs.readFileSync(this.outputFile, 'utf-8');
        this.existingPuzzles = JSON.parse(data);
        console.log(`Loaded ${this.existingPuzzles.length} existing puzzles`);
      }
    } catch (error) {
      console.error('Error loading existing puzzles:', error);
      this.existingPuzzles = [];
    }
  }

  private savePuzzles() {
    try {
      fs.writeFileSync(this.outputFile, JSON.stringify(this.existingPuzzles, null, 2));
      console.log(`Saved ${this.existingPuzzles.length} puzzles to ${this.outputFile}`);
    } catch (error) {
      console.error('Error saving puzzles:', error);
    }
  }

  public async generate() {
    console.log(`Starting puzzle generation for ${this.gridSize}x${this.gridSize} grid`);
    console.log(`Target: ${this.maxPuzzles} puzzles, Max attempts: ${this.maxAttempts}`);

    let attempts = 0;
    let puzzlesGenerated = 0;

    while (puzzlesGenerated < this.maxPuzzles && attempts < this.maxAttempts) {
      attempts++;

      if (attempts % 10 === 0) {
        console.log(
          `Attempt ${attempts}/${this.maxAttempts}, Generated: ${puzzlesGenerated}/${this.maxPuzzles}`
        );
      }

      try {
        // 1. Generate a random puzzle
        const puzzle = generateRandomPuzzle(this.gridSize);

        if (validatePuzzleHasSingleSolution(puzzle)) {
          const puzzleData: PuzzleData = {
            gridSize: this.gridSize,
            grid: puzzle,
            solution: [], // TODO: Store the solution
            timestamp: new Date().toISOString(),
          };

          this.existingPuzzles.push(puzzleData);
          puzzlesGenerated++;

          // Save after each successful generation
          this.savePuzzles();

          console.log(`✅ Generated puzzle ${puzzlesGenerated}/${this.maxPuzzles}`);
        }
      } catch (error) {
        console.error(`Error in attempt ${attempts}:`, error);
      }
    }

    console.log('\nGeneration complete:');
    console.log(`- Attempts: ${attempts}`);
    console.log(`- Puzzles generated: ${puzzlesGenerated}`);
    console.log(`- Total puzzles in file: ${this.existingPuzzles.length}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: GenerationOptions = {
  gridSize: parseInt(args[0]) || 6,
  maxPuzzles: parseInt(args[1]) || 10,
  maxAttempts: parseInt(args[2]) || 1000,
  outputFile: path.join(
    process.cwd(),
    'public/puzzles',
    `puzzles_${args[0] || 6}x${args[0] || 6}.json`
  ),
};

// Run the generator
const generator = new PuzzleGenerator(options);
generator.generate().catch(console.error);
