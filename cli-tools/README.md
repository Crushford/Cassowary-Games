# CLI Tools for Honey Pot Ant Puzzles

This folder contains command-line tools for generating and managing honey pot ant puzzles.

## 🚀 Quick Start

```bash
# Install dependencies
yarn install

# Generate puzzles
yarn generate                    # Generate 1 puzzle
yarn generate generate 5         # Generate 5 puzzles

# Manage database
yarn puzzle-db list             # List all puzzles
yarn puzzle-db stats            # Show statistics
yarn puzzle-db export pz-0001   # Export puzzle
yarn puzzle-db delete pz-0001   # Delete puzzle
```

## 📁 Files

- `generate.ts` - Main puzzle generator
- `puzzleDatabase.ts` - Database management class
- `puzzleDb.ts` - CLI tool for database operations
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## 🔧 Development

### Running from parent directory

The main project's package.json includes scripts that run these tools:

```bash
# From project root
yarn generate
yarn puzzle-db list
```

### Running directly

```bash
# From cli-tools directory
cd cli-tools
yarn generate
yarn puzzle-db list
```

## 📊 Database

Puzzles are stored in `../public/puzzles.json` (relative to cli-tools folder).
This location makes the database accessible to the frontend game.

## 🔗 Dependencies

- Uses types from `../src/types/types.ts`
- Node.js built-in modules (fs)
- TypeScript for type safety

## 🛠️ Building

```bash
yarn build  # Compile TypeScript
```

## 📝 Notes

- This folder is self-contained but references the main project's types
- Database file is stored in the parent directory for easy access
- All tools are designed to run from the command line
