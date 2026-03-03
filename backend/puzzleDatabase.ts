/**
 * Puzzle Database Management
 *
 * Handles compact puzzle string format storage and retrieval.
 * Puzzles are stored in puzzles.json organized by grid size for efficient access.
 */

import fs from 'fs'
import type { GridSquare, ColorName } from '../frontend/src/types/types'
import { COLOR_SYMBOLS } from '../frontend/src/utils/colorPalette'
import {
  calculateMedianAttributeDifferences,
  pickBestInsertionIndexForNewFamily,
  ratePuzzleAttributes,
  type PuzzleFamily
} from './puzzleArrangement'

// === Types ===
export interface PuzzleStringFormat {
  id: string // Unique alphanumeric identifier (e.g. 'pz-0012')
  layout: string // One character per tile representing groupColor
  queens: string // One character per tile: 'Q' for queen, '.' for empty
  name?: string // Optional user-provided name for the puzzle
}

export interface PuzzleDatabaseStructure {
  [sizeKey: string]: PuzzleStringFormat[] // e.g., "5x5", "6x6", "7x7"
}

const ID_VARIANT_SUFFIX_REGEX = /-(0|90|180|270)(VH|V|H)?$/

const SIGNATURE_SYMBOLS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Normalize color symbols so layouts that differ only by symbol labels compare equal.
 */
export function normalizeLayoutColors(layout: string): string {
  const remap = new Map<string, string>()
  let nextIndex = 0
  let normalized = ''

  for (const symbol of layout) {
    let mapped = remap.get(symbol)
    if (!mapped) {
      if (nextIndex >= SIGNATURE_SYMBOLS.length) {
        throw new Error('Too many unique layout symbols to normalize')
      }
      mapped = SIGNATURE_SYMBOLS[nextIndex]
      remap.set(symbol, mapped)
      nextIndex++
    }
    normalized += mapped
  }

  return normalized
}

/**
 * Build a color-invariant signature for duplicate detection.
 */
export function buildColorInvariantSignature(
  layout: string,
  queens: string
): string {
  return `${queens}|${normalizeLayoutColors(layout)}`
}

/**
 * Strip variant suffix (e.g. -0, -90V) and return family base id.
 */
export function extractPuzzleFamilyBaseId(id: string): string | null {
  if (!ID_VARIANT_SUFFIX_REGEX.test(id)) {
    return null
  }
  return id.replace(ID_VARIANT_SUFFIX_REGEX, '')
}

export class PuzzleDatabase {
  private puzzles: PuzzleDatabaseStructure = {}
  private readonly filePath: string
  private verbose: boolean = false

  constructor(filePath: string = '../frontend/public/puzzles.json') {
    this.filePath = filePath
    this.load()
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose
  }

  // === Core Database Operations ===

  /**
   * Load puzzles from file or create new database
   */
  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8')
        this.puzzles = JSON.parse(data) as PuzzleDatabaseStructure

        const totalPuzzles = this.getTotalPuzzleCount()
        if (this.verbose) {
          console.log(
            `Loaded ${totalPuzzles} existing puzzles organized by size`
          )
        }
      } else {
        if (this.verbose) {
          console.log('Creating new puzzle database')
        }
        this.puzzles = {}
      }
    } catch (error) {
      console.warn(`Error loading puzzles: ${error}. Creating new database.`)
      this.puzzles = {}
    }
  }

  /**
   * Save puzzles to file
   */
  private save(): void {
    try {
      const json = JSON.stringify(this.puzzles, null, 2)
      fs.writeFileSync(this.filePath, json)
      if (this.verbose) {
        const totalPuzzles = this.getTotalPuzzleCount()
        console.log(`Saved ${totalPuzzles} puzzles to database`)
      }
    } catch (error) {
      console.error(`Error saving puzzles: ${error}`)
      throw error
    }
  }

  /**
   * Get total number of puzzles across all sizes
   */
  private getTotalPuzzleCount(): number {
    return Object.values(this.puzzles).reduce(
      (total, sizePuzzles) => total + sizePuzzles.length,
      0
    )
  }

  /**
   * Generate next unique ID
   */
  private generateNextId(): string {
    const allPuzzles = this.getAllPuzzles()

    if (allPuzzles.length === 0) {
      return 'pz-0001'
    }

    // Extract numeric suffixes from existing IDs
    const numericSuffixes = allPuzzles
      .map(p => p.id)
      .filter(id => id.startsWith('pz-'))
      .map(id => {
        const match = id.match(/pz-(\d+)/)
        return match ? parseInt(match[1], 10) : 0
      })

    const maxSuffix = Math.max(...numericSuffixes, 0)
    const nextSuffix = maxSuffix + 1

    return `pz-${nextSuffix.toString().padStart(4, '0')}`
  }

  // === Puzzle Encoding/Decoding ===

  /**
   * Encode a grid into compact string format
   */
  private encodePuzzle(grid: GridSquare[][]): {
    layout: string
    queens: string
  } {
    const size = grid.length
    let layout = ''
    let queens = ''

    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        const cell = grid[row][column]

        // Encode queen position
        queens += cell.isSolutionQueen ? 'Q' : '.'

        // Encode color using COLOR_SYMBOLS mapping
        if (cell.groupColor) {
          layout += COLOR_SYMBOLS[cell.groupColor as ColorName]
        } else {
          layout += COLOR_SYMBOLS['undefined']
        }
      }
    }

    return { layout, queens }
  }

  /**
   * Generate all 16 variants of a puzzle (4 rotations + mirrors for each), with descriptive suffixes
   * Returns: Array of [variantGrid, suffix]
   */
  private generateAllVariants(
    grid: GridSquare[][]
  ): [GridSquare[][], string][] {
    const size = grid.length

    // Single rotate90 function
    const rotate90 = (input: GridSquare[][]): GridSquare[][] => {
      const newGrid = Array.from({ length: size }, () => Array(size).fill(null))
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          newGrid[col][size - 1 - row] = {
            ...input[row][col],
            position: { row: col, col: size - 1 - row }
          }
        }
      }
      return newGrid
    }

    // Mirror functions
    const mirrorVertical = (input: GridSquare[][]): GridSquare[][] => {
      return input.map((row, rowIdx) =>
        row.map((cell, colIdx) => ({
          ...input[size - 1 - rowIdx][colIdx],
          position: { row: rowIdx, col: colIdx }
        }))
      )
    }
    const mirrorHorizontal = (input: GridSquare[][]): GridSquare[][] => {
      return input.map((row, rowIdx) =>
        row.map((cell, colIdx) => ({
          ...input[rowIdx][size - 1 - colIdx],
          position: { row: rowIdx, col: colIdx }
        }))
      )
    }

    // Rotations
    const original = grid
    const rot90 = rotate90(original)
    const rot180 = rotate90(rot90)
    const rot270 = rotate90(rot180)

    // Helper to generate all 4 mirror variants for a given grid and base name
    const variantsFor = (baseGrid: GridSquare[][], baseName: string) =>
      [
        [baseGrid, baseName],
        [mirrorVertical(baseGrid), baseName + 'V'],
        [mirrorHorizontal(baseGrid), baseName + 'H'],
        [mirrorHorizontal(mirrorVertical(baseGrid)), baseName + 'VH']
      ] as [GridSquare[][], string][]

    // Collect all variants
    return [
      ...variantsFor(original, '0'),
      ...variantsFor(rot90, '90'),
      ...variantsFor(rot180, '180'),
      ...variantsFor(rot270, '270')
    ]
  }

  // === Public API ===

  /**
   * Add a puzzle to the database (including all 16 variants)
   * Returns true if any new puzzles were added, false if all were duplicates
   */
  addPuzzle(grid: GridSquare[][], name?: string): boolean {
    const variants: [GridSquare[][], string][] = this.generateAllVariants(grid)
    const baseId = this.generateNextId()
    let addedCount = 0
    let skippedCount = 0
    const size = grid.length
    const sizeKey = `${size}x${size}`
    const puzzlesOfSameSize = this.puzzles[sizeKey] || []
    const signatureToPuzzleId = new Map<string, string>(
      puzzlesOfSameSize.map(existing => [
        buildColorInvariantSignature(existing.layout, existing.queens),
        existing.id
      ])
    )
    const newlyAddedFamilyMembers: PuzzleStringFormat[] = []

    if (this.verbose) {
      console.log(
        `[DEBUG] Generating ${variants.length} variants for baseId ${baseId}`
      )
    }

    for (let i = 0; i < variants.length; i++) {
      const [variant, suffix] = variants[i]
      const encoded = this.encodePuzzle(variant)
      // Check for duplicates within the same size (color-invariant)
      const encodedSignature = buildColorInvariantSignature(
        encoded.layout,
        encoded.queens
      )
      const duplicateId = signatureToPuzzleId.get(encodedSignature)
      if (duplicateId) {
        if (this.verbose) {
          console.log(`[DEBUG] Skipped variant ${suffix} (duplicate)`)
          console.log(`  layout: ${encoded.layout}`)
          console.log(`  queens: ${encoded.queens}`)
          console.log(`  matched existing id: ${duplicateId}`)
        }
        skippedCount++
        continue
      }

      // Generate ID with descriptive suffix
      const id = `${baseId}-${suffix}`

      // Create puzzle entry
      const puzzle: PuzzleStringFormat = {
        id,
        layout: encoded.layout,
        queens: encoded.queens,
        name: name || undefined
      }

      if (!this.puzzles[sizeKey]) {
        this.puzzles[sizeKey] = []
      }
      newlyAddedFamilyMembers.push(puzzle)
      signatureToPuzzleId.set(encodedSignature, id)
      if (this.verbose) {
        console.log(`[DEBUG] Added puzzle ${id} to database`)
      }
      addedCount++
    }

    if (this.verbose) {
      console.log(
        `[DEBUG] Variants added: ${addedCount}, skipped (duplicates): ${skippedCount}`
      )
    }

    if (addedCount > 0) {
      this.puzzles[sizeKey] = this.insertNewFamilyByContrast(
        sizeKey,
        newlyAddedFamilyMembers
      )
      // Save to file
      this.save()
      if (this.verbose) {
        console.log(`Added ${addedCount} new puzzle variants to database`)
      }
      return true
    } else {
      if (this.verbose) {
        console.log('All variants already exist, no new puzzles added.')
      }
      return false
    }
  }

  private buildFamiliesFromPuzzleList(puzzles: PuzzleStringFormat[]): PuzzleFamily[] {
    const familyOrder: string[] = []
    const membersByFamily = new Map<string, PuzzleStringFormat[]>()

    for (const puzzle of puzzles) {
      const familyId = extractPuzzleFamilyBaseId(puzzle.id)
      if (!familyId) {
        continue
      }
      if (!membersByFamily.has(familyId)) {
        membersByFamily.set(familyId, [])
        familyOrder.push(familyId)
      }
      membersByFamily.get(familyId)!.push(puzzle)
    }

    const families: PuzzleFamily[] = []
    for (const familyId of familyOrder) {
      const members = membersByFamily.get(familyId) || []
      const primary = members.find(member => member.id.endsWith('-0'))
      if (!primary) {
        continue
      }
      families.push({
        familyId,
        primary,
        members
      })
    }
    return families
  }

  private insertNewFamilyByContrast(
    sizeKey: string,
    newFamilyMembers: PuzzleStringFormat[]
  ): PuzzleStringFormat[] {
    const existing = this.puzzles[sizeKey] || []
    if (existing.length === 0) {
      return newFamilyMembers
    }

    const primary = newFamilyMembers.find(member => member.id.endsWith('-0'))
    if (!primary) {
      return [...existing, ...newFamilyMembers]
    }

    const familyId = extractPuzzleFamilyBaseId(primary.id) || primary.id
    const newFamily: PuzzleFamily = {
      familyId,
      primary,
      members: newFamilyMembers
    }

    const existingFamilies = this.buildFamiliesFromPuzzleList(existing)
    if (existingFamilies.length === 0) {
      return [...existing, ...newFamilyMembers]
    }

    const medians = calculateMedianAttributeDifferences(
      existingFamilies.map(family => ratePuzzleAttributes(family.primary.layout))
    )
    const insertionIndex = pickBestInsertionIndexForNewFamily(
      existingFamilies,
      newFamily,
      medians
    )

    const newFamilyOrder = [...existingFamilies]
    newFamilyOrder.splice(insertionIndex, 0, newFamily)

    return newFamilyOrder.flatMap(family => family.members)
  }

  /**
   * Get all puzzles
   */
  getAllPuzzles(): PuzzleStringFormat[] {
    return Object.values(this.puzzles).flat()
  }

  /**
   * Get puzzle by ID
   */
  getPuzzle(id: string): PuzzleStringFormat | undefined {
    for (const sizeGroup of Object.values(this.puzzles)) {
      const puzzle = sizeGroup.find(p => p.id === id)
      if (puzzle) {
        return puzzle
      }
    }
    return undefined
  }

  /**
   * Delete puzzle by ID
   * Returns true if deleted, false if not found
   */
  deletePuzzle(id: string): boolean {
    let deleted = false
    for (const sizeGroup of Object.values(this.puzzles)) {
      const index = sizeGroup.findIndex(p => p.id === id)
      if (index !== -1) {
        sizeGroup.splice(index, 1)
        deleted = true
        console.log(`Deleted puzzle ${id} from database`)
        break // Found and deleted, no need to check other sizes
      }
    }
    if (!deleted) {
      console.log(`Puzzle ${id} not found in database`)
      return false
    }
    this.save()
    return true
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalPuzzles: number
    gridSizes: number[]
    uniqueLayouts: number
    dateRange?: { start: string; end: string }
  } {
    const totalPuzzles = this.getTotalPuzzleCount()
    if (totalPuzzles === 0) {
      return {
        totalPuzzles: 0,
        gridSizes: [],
        uniqueLayouts: 0
      }
    }

    const gridSizes = Object.keys(this.puzzles).map(key => {
      const sizeMatch = key.match(/(\d+)x(\d+)/)
      if (sizeMatch) {
        return parseInt(sizeMatch[1], 10)
      }
      return 0 // Should not happen if keys are consistent
    })
    const uniqueSizes = [...new Set(gridSizes)]
    const uniqueLayouts = new Set(this.getAllPuzzles().map(p => p.layout)).size

    return {
      totalPuzzles: this.getTotalPuzzleCount(),
      gridSizes: uniqueSizes,
      uniqueLayouts
    }
  }

  /**
   * Export puzzle to separate file
   */
  exportPuzzle(id: string): void {
    const puzzle = this.getPuzzle(id)
    if (!puzzle) {
      console.log(`Puzzle ${id} not found in database`)
      return
    }

    const exportData = {
      puzzle: puzzle,
      exportDate: new Date().toISOString(),
      exportSource: this.filePath
    }

    const filename = `puzzle-${id}.json`
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2))
    console.log(`Exported puzzle ${id} to ${filename}`)
  }

  /**
   * List all puzzles with details
   */
  listPuzzles(): void {
    console.log('\n=== Puzzle Database ===')
    const totalPuzzles = this.getTotalPuzzleCount()
    console.log(`Total puzzles: ${totalPuzzles}`)

    if (totalPuzzles === 0) {
      console.log('No puzzles in database')
      return
    }

    console.log('\nPuzzles:')
    Object.entries(this.puzzles).forEach(([sizeKey, puzzles]) => {
      const size = sizeKey.match(/(\d+)x(\d+)/)
      if (size) {
        const gridSize = parseInt(size[1], 10)
        console.log(`\nGrid Size: ${gridSize}x${gridSize}`)
        puzzles.forEach((puzzle, index) => {
          console.log(`${index + 1}. ${puzzle.id}`)
          console.log(`   Layout: ${puzzle.layout}`)
          console.log(`   Queens: ${puzzle.queens}`)
          console.log('')
        })
      }
    })
  }

  /**
   * Get puzzle counts by size
   */
  getSizeCounts(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const [sizeKey, puzzles] of Object.entries(this.puzzles)) {
      counts[sizeKey] = puzzles.length
    }
    return counts
  }

  /**
   * Display database statistics
   */
  showStats(): void {
    const stats = this.getStats()

    if (stats.totalPuzzles === 0) {
      console.log('No puzzles in database for statistics')
      return
    }

    console.log('\n=== Database Statistics ===')
    console.log(`Total puzzles: ${stats.totalPuzzles}`)
    console.log(`Grid sizes: ${stats.gridSizes.join(', ')}`)
    console.log(`Unique layouts: ${stats.uniqueLayouts}`)

    if (stats.dateRange) {
      console.log(
        `Date range: ${stats.dateRange.start} to ${stats.dateRange.end}`
      )
    }
  }

  // === Size-based Access Methods ===

  /**
   * Get all available grid sizes
   */
  getAvailableSizes(): number[] {
    return Object.keys(this.puzzles)
      .map(key => {
        const sizeMatch = key.match(/(\d+)x(\d+)/)
        return sizeMatch ? parseInt(sizeMatch[1], 10) : 0
      })
      .filter(size => size > 0)
      .sort((a, b) => a - b)
  }

  /**
   * Get all puzzles for a specific grid size
   */
  getPuzzlesBySize(size: number): PuzzleStringFormat[] {
    const sizeKey = `${size}x${size}`
    return this.puzzles[sizeKey] || []
  }

  /**
   * Get a random puzzle for a specific grid size
   */
  getRandomPuzzleBySize(size: number): PuzzleStringFormat | undefined {
    const puzzles = this.getPuzzlesBySize(size)
    if (puzzles.length === 0) {
      return undefined
    }
    const randomIndex = Math.floor(Math.random() * puzzles.length)
    return puzzles[randomIndex]
  }

  /**
   * Get puzzle count for a specific grid size
   */
  getPuzzleCountBySize(size: number): number {
    return this.getPuzzlesBySize(size).length
  }

  /**
   * Find the grid size with the lowest number of puzzles
   * Returns the size that should be generated next to balance puzzle distribution
   * @param validSizes Array of valid sizes to consider (default: 4-9, excluding 3 as it's too difficult, 10+ as they're too slow, and 11-12 as there aren't enough colors)
   * @returns The size with the lowest puzzle count, preferring smaller sizes when counts are equal
   */
  getSizeWithLowestCount(validSizes: number[] = [4, 5, 6, 7, 8, 9]): number {
    if (validSizes.length === 0) {
      return 8 // Default fallback
    }

    // Get counts for all valid sizes
    const sizeCounts = validSizes.map(size => ({
      size,
      count: this.getPuzzleCountBySize(size)
    }))

    // Sort by count (ascending), then by size (ascending) for tie-breaking
    // This prefers smaller sizes when counts are equal, which are faster to generate
    sizeCounts.sort((a, b) => {
      if (a.count !== b.count) {
        return a.count - b.count
      }
      return a.size - b.size // Prefer smaller sizes when counts are equal (faster generation)
    })

    return sizeCounts[0].size
  }
}
