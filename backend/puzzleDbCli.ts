#!/usr/bin/env ts-node

/**
 * Puzzle Database CLI Tool
 *
 * Command-line interface for managing the puzzle database.
 * Usage: yarn puzzle-db <command> [args]
 */

import { PuzzleDatabase } from './puzzleDatabase.ts'

function showHelp(): void {
  console.log(`
Puzzle Database CLI Tool

Usage: yarn puzzle-db <command> [args]

Commands:
  list                    List all puzzles in database (organized by size)
  stats                   Show database statistics
  sizes                   List all available grid sizes
  by-size <size>          List all puzzles for a specific grid size
  random <size>           Get a random puzzle for a specific grid size
  export <puzzleId>       Export a specific puzzle to file
  delete <puzzleId>       Delete a puzzle from database
  help                    Show this help message

Examples:
  yarn puzzle-db list
  yarn puzzle-db stats
  yarn puzzle-db sizes
  yarn puzzle-db by-size 5
  yarn puzzle-db random 6
  yarn puzzle-db export pz-0001-0
  yarn puzzle-db delete pz-0001-0
`)
}

function main(): void {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === 'help') {
    showHelp()
    return
  }

  // Initialize database
  const db = new PuzzleDatabase()

  switch (command) {
    case 'list':
      db.listPuzzles()
      break

    case 'stats':
      db.showStats()
      break

    case 'sizes':
      const sizes = db.getAvailableSizes()
      console.log('\n=== Available Grid Sizes ===')
      if (sizes.length === 0) {
        console.log('No puzzles in database')
      } else {
        sizes.forEach(size => {
          const count = db.getPuzzleCountBySize(size)
          console.log(`${size}x${size}: ${count} puzzles`)
        })
      }
      break

    case 'by-size':
      if (!args[1]) {
        console.error('Error: Grid size required for by-size command')
        console.log('Usage: yarn puzzle-db by-size <size>')
        process.exit(1)
      }
      const size = parseInt(args[1], 10)
      if (isNaN(size) || size <= 0) {
        console.error('Error: Invalid grid size. Must be a positive number.')
        process.exit(1)
      }

      const puzzles = db.getPuzzlesBySize(size)
      console.log(`\n=== ${size}x${size} Puzzles ===`)
      if (puzzles.length === 0) {
        console.log(`No ${size}x${size} puzzles found`)
      } else {
        puzzles.forEach((puzzle, index) => {
          console.log(`${index + 1}. ${puzzle.id}`)
          console.log(`   Layout: ${puzzle.layout}`)
          console.log(`   Queens: ${puzzle.queens}`)
          console.log('')
        })
      }
      break

    case 'random':
      if (!args[1]) {
        console.error('Error: Grid size required for random command')
        console.log('Usage: yarn puzzle-db random <size>')
        process.exit(1)
      }
      const randomSize = parseInt(args[1], 10)
      if (isNaN(randomSize) || randomSize <= 0) {
        console.error('Error: Invalid grid size. Must be a positive number.')
        process.exit(1)
      }

      const randomPuzzle = db.getRandomPuzzleBySize(randomSize)
      if (!randomPuzzle) {
        console.log(`No ${randomSize}x${randomSize} puzzles found`)
      } else {
        console.log(`\n=== Random ${randomSize}x${randomSize} Puzzle ===`)
        console.log(`ID: ${randomPuzzle.id}`)
        console.log(`Layout: ${randomPuzzle.layout}`)
        console.log(`Queens: ${randomPuzzle.queens}`)
      }
      break

    case 'export':
      if (!args[1]) {
        console.error('Error: Puzzle ID required for export command')
        console.log('Usage: yarn puzzle-db export <puzzleId>')
        process.exit(1)
      }
      db.exportPuzzle(args[1])
      break

    case 'delete':
      if (!args[1]) {
        console.error('Error: Puzzle ID required for delete command')
        console.log('Usage: yarn puzzle-db delete <puzzleId>')
        process.exit(1)
      }
      db.deletePuzzle(args[1])
      break

    default:
      console.error(`Unknown command: ${command}`)
      showHelp()
      process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
