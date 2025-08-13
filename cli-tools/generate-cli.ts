#!/usr/bin/env tsx

/**
 * CLI wrapper for puzzle generation with command line argument support
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
function parseArgs(args: string[]) {
  let size = 8; // default size
  let batch = 1; // default batch size
  let command = 'generate';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--size' || arg === '-s') {
      const sizeValue = parseInt(args[i + 1]);
      if (isNaN(sizeValue) || sizeValue < 3 || sizeValue > 12) {
        console.error('Error: --size must be a number between 3 and 12');
        process.exit(1);
      }
      size = sizeValue;
      i++; // Skip next argument
    } else if (arg === '--batch' || arg === '-b') {
      const batchValue = parseInt(args[i + 1]);
      if (isNaN(batchValue) || batchValue < 1) {
        console.error('Error: --batch must be a positive number');
        process.exit(1);
      }
      batch = batchValue;
      i++; // Skip next argument
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Non-flag argument is treated as command
      command = arg;
    }
  }

  return { size, batch, command };
}

function showHelp() {
  console.log(`
Usage: yarn generate [command] [options]

Commands:
  generate              Generate puzzles (default)
  list                  List all puzzles in database
  stats                 Show database statistics
  export <puzzleId>     Export a specific puzzle
  delete <puzzleId>     Delete a puzzle from database

Options:
  --size, -s <number>   Puzzle grid size (3-12, default: 8)
  --batch, -b <number>  Number of puzzles to generate (default: 1)
  --help, -h            Show this help message

Examples:
  yarn generate                    # Generate 1 puzzle (8x8)
  yarn generate --size 6           # Generate 1 puzzle (6x6)
  yarn generate --batch 5          # Generate 5 puzzles (8x8)
  yarn generate --size 6 --batch 3 # Generate 3 puzzles (6x6)
  yarn generate list               # List all puzzles
  yarn generate stats              # Show database stats
`);
}

function main() {
  const args = process.argv.slice(2);
  const { size, batch, command } = parseArgs(args);

  console.log(`Configuration: size=${size}, batch=${batch}, command=${command}`);

  if (command === 'generate') {
    console.log(`Generating ${batch} puzzle(s) with size ${size}x${size}...`);

    // Call the original generate script with batch size and size
    const generateArgs = ['generate', batch.toString(), '--size', size.toString()];
    const child = spawn('tsx', ['generate.ts', ...generateArgs], {
      stdio: 'inherit',
      cwd: __dirname,
    });

    child.on('close', (code) => {
      process.exit(code || 0);
    });
  } else {
    // For other commands, just pass through to the original script
    const child = spawn('tsx', ['generate.ts', command, ...args], {
      stdio: 'inherit',
      cwd: __dirname,
    });

    child.on('close', (code) => {
      process.exit(code || 0);
    });
  }
}

main();
