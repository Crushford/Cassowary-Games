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
  let size: number | null = null; // null means size was not explicitly set
  let batch = 1; // default batch size
  let command = 'generate';
  let verbose = false;

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
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Check if it's a number - if so and command is 'generate', treat as batch size
      const numValue = parseInt(arg);
      if (!isNaN(numValue) && numValue > 0 && command === 'generate' && batch === 1) {
        // Only treat as batch if we haven't already set a batch size
        batch = numValue;
      } else if (isNaN(numValue) || command !== 'generate') {
        // Non-flag, non-number argument is treated as command
        command = arg;
      }
    }
  }

  return { size, batch, command, verbose };
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
  --size, -s <number>   Puzzle grid size (3-12). If not specified, auto-selects
                        the size with the lowest number of existing puzzles.
  --batch, -b <number>  Number of puzzles to generate (default: 1)
  --verbose, -v         Show detailed logging (default: quiet mode)
  --help, -h            Show this help message

Examples:
  yarn generate                    # Generate 1 puzzle (auto-selects size with lowest count)
  yarn generate --size 6           # Generate 1 puzzle (6x6)
  yarn generate --batch 5          # Generate 5 puzzles (auto-selects size)
  yarn generate --size 6 --batch 3 # Generate 3 puzzles (6x6)
  yarn generate list               # List all puzzles
  yarn generate stats              # Show database stats
`);
}

function main() {
  const args = process.argv.slice(2);
  const { size, batch, command, verbose } = parseArgs(args);

  if (verbose) {
    if (size === null) {
      console.log(`Configuration: size=auto (lowest count), batch=${batch}, command=${command}`);
    } else {
      console.log(`Configuration: size=${size}, batch=${batch}, command=${command}`);
    }
  }

  if (command === 'generate') {
    if (verbose) {
      if (size === null) {
        console.log(`Generating ${batch} puzzle(s) (size will be auto-selected)...`);
      } else {
        console.log(`Generating ${batch} puzzle(s) with size ${size}x${size}...`);
      }
    }

    // Call the original generate script with batch size
    // Only pass --size if it was explicitly set
    const generateArgs = ['generate', batch.toString()];
    if (size !== null) {
      generateArgs.push('--size', size.toString());
    }
    if (verbose) {
      generateArgs.push('--verbose');
    }

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
