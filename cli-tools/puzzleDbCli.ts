#!/usr/bin/env ts-node

/**
 * Puzzle Database CLI Tool
 *
 * Command-line interface for managing the puzzle database.
 * Usage: yarn puzzle-db <command> [args]
 */

import { PuzzleDatabase } from './puzzleDatabase.ts';

function showHelp(): void {
  console.log(`
Puzzle Database CLI Tool

Usage: yarn puzzle-db <command> [args]

Commands:
  list                    List all puzzles in database
  stats                   Show database statistics
  export <puzzleId>       Export a specific puzzle to file
  delete <puzzleId>       Delete a puzzle from database
  help                    Show this help message

Examples:
  yarn puzzle-db list
  yarn puzzle-db stats
  yarn puzzle-db export pz-0001
  yarn puzzle-db delete pz-0001
`);
}

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  // Initialize database
  const db = new PuzzleDatabase();

  switch (command) {
    case 'list':
      db.listPuzzles();
      break;

    case 'stats':
      db.showStats();
      break;

    case 'export':
      if (!args[1]) {
        console.error('Error: Puzzle ID required for export command');
        console.log('Usage: yarn puzzle-db export <puzzleId>');
        process.exit(1);
      }
      db.exportPuzzle(args[1]);
      break;

    case 'delete':
      if (!args[1]) {
        console.error('Error: Puzzle ID required for delete command');
        console.log('Usage: yarn puzzle-db delete <puzzleId>');
        process.exit(1);
      }
      db.deletePuzzle(args[1]);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
