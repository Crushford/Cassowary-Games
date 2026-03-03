import type { PuzzleStringFormat } from './puzzleDatabase'

export interface PuzzleAttributeRatings {
  regionSizeVariance: number
  regionCompactness: number
  regionElongation: number
  regionAdjacencyDensity: number
}

export interface MedianAttributeDifferences {
  regionSizeVariance: number
  regionCompactness: number
  regionElongation: number
  regionAdjacencyDensity: number
}

export interface PuzzleFamily {
  familyId: string
  primary: PuzzleStringFormat
  members: PuzzleStringFormat[]
}

const ATTRIBUTE_KEYS: Array<keyof PuzzleAttributeRatings> = [
  'regionSizeVariance',
  'regionCompactness',
  'regionElongation',
  'regionAdjacencyDensity'
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100
}

function puzzleSizeFromLayout(layout: string): number {
  const size = Math.sqrt(layout.length)
  if (!Number.isInteger(size)) {
    throw new Error('Puzzle layout must represent an NxN board')
  }
  return size
}

function getCell(layout: string, size: number, row: number, col: number): string {
  return layout[row * size + col]
}

type RegionStats = {
  area: number
  perimeter: number
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
}

function buildRegionStats(layout: string): Map<string, RegionStats> {
  const size = puzzleSizeFromLayout(layout)
  const regions = new Map<string, RegionStats>()

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const symbol = getCell(layout, size, row, col)
      if (!regions.has(symbol)) {
        regions.set(symbol, {
          area: 0,
          perimeter: 0,
          minRow: row,
          maxRow: row,
          minCol: col,
          maxCol: col
        })
      }

      const region = regions.get(symbol)!
      region.area++
      region.minRow = Math.min(region.minRow, row)
      region.maxRow = Math.max(region.maxRow, row)
      region.minCol = Math.min(region.minCol, col)
      region.maxCol = Math.max(region.maxCol, col)
    }
  }

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ] as const

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const symbol = getCell(layout, size, row, col)
      const region = regions.get(symbol)!

      for (const [dr, dc] of directions) {
        const nextRow = row + dr
        const nextCol = col + dc
        if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) {
          region.perimeter++
          continue
        }

        if (getCell(layout, size, nextRow, nextCol) !== symbol) {
          region.perimeter++
        }
      }
    }
  }

  return regions
}

function toScore0To100(value01: number): number {
  return roundTo2(clamp(value01, 0, 1) * 100)
}

export function ratePuzzleAttributes(layout: string): PuzzleAttributeRatings {
  const size = puzzleSizeFromLayout(layout)
  const regions = buildRegionStats(layout)

  const regionSizes = Array.from(regions.values()).map(region => region.area)
  const meanSize =
    regionSizes.reduce((sum, value) => sum + value, 0) / Math.max(regionSizes.length, 1)
  const variance =
    regionSizes.reduce((sum, value) => sum + (value - meanSize) ** 2, 0) /
    Math.max(regionSizes.length, 1)
  const normalizedStd = clamp(Math.sqrt(variance) / Math.max(1, size * size), 0, 1)

  const compactnessValues = Array.from(regions.values()).map(region => {
    if (region.perimeter === 0) return 0
    return clamp((4 * Math.PI * region.area) / (region.perimeter * region.perimeter), 0, 1)
  })
  const compactnessMean =
    compactnessValues.reduce((sum, value) => sum + value, 0) /
    Math.max(compactnessValues.length, 1)

  const elongationValues = Array.from(regions.values()).map(region => {
    const width = region.maxCol - region.minCol + 1
    const height = region.maxRow - region.minRow + 1
    const stretchRatio = Math.max(width / Math.max(1, height), height / Math.max(1, width))
    return clamp((stretchRatio - 1) / Math.max(1, size - 1), 0, 1)
  })
  const elongationMean =
    elongationValues.reduce((sum, value) => sum + value, 0) /
    Math.max(elongationValues.length, 1)

  const touchingRegionPairs = new Set<string>()
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const here = getCell(layout, size, row, col)
      if (col + 1 < size) {
        const right = getCell(layout, size, row, col + 1)
        if (here !== right) {
          touchingRegionPairs.add([here, right].sort().join('|'))
        }
      }
      if (row + 1 < size) {
        const down = getCell(layout, size, row + 1, col)
        if (here !== down) {
          touchingRegionPairs.add([here, down].sort().join('|'))
        }
      }
    }
  }
  const regionCount = regions.size
  const maxPossibleTouchPairs = (regionCount * (regionCount - 1)) / 2
  const adjacencyDensity =
    maxPossibleTouchPairs === 0 ? 0 : touchingRegionPairs.size / maxPossibleTouchPairs

  return {
    regionSizeVariance: toScore0To100(normalizedStd),
    regionCompactness: toScore0To100(compactnessMean),
    regionElongation: toScore0To100(elongationMean),
    regionAdjacencyDensity: toScore0To100(adjacencyDensity)
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

export function calculateMedianAttributeDifferences(
  ratings: PuzzleAttributeRatings[]
): MedianAttributeDifferences {
  const diffsByKey: Record<keyof PuzzleAttributeRatings, number[]> = {
    regionSizeVariance: [],
    regionCompactness: [],
    regionElongation: [],
    regionAdjacencyDensity: []
  }

  for (let i = 0; i < ratings.length; i++) {
    for (let j = i + 1; j < ratings.length; j++) {
      for (const key of ATTRIBUTE_KEYS) {
        diffsByKey[key].push(Math.abs(ratings[i][key] - ratings[j][key]))
      }
    }
  }

  return {
    regionSizeVariance: median(diffsByKey.regionSizeVariance),
    regionCompactness: median(diffsByKey.regionCompactness),
    regionElongation: median(diffsByKey.regionElongation),
    regionAdjacencyDensity: median(diffsByKey.regionAdjacencyDensity)
  }
}

export function differenceByAttribute(
  left: PuzzleAttributeRatings,
  right: PuzzleAttributeRatings
): PuzzleAttributeRatings {
  return {
    regionSizeVariance: Math.abs(left.regionSizeVariance - right.regionSizeVariance),
    regionCompactness: Math.abs(left.regionCompactness - right.regionCompactness),
    regionElongation: Math.abs(left.regionElongation - right.regionElongation),
    regionAdjacencyDensity: Math.abs(
      left.regionAdjacencyDensity - right.regionAdjacencyDensity
    )
  }
}

export function scorePuzzleDifference(
  left: PuzzleAttributeRatings,
  right: PuzzleAttributeRatings,
  medianDiffs: MedianAttributeDifferences
): number {
  const diffs = differenceByAttribute(left, right)
  const normalizedValues = ATTRIBUTE_KEYS.map(key => {
    const baseline = Math.max(medianDiffs[key], 1)
    return diffs[key] / baseline
  })

  const average = normalizedValues.reduce((sum, value) => sum + value, 0) / normalizedValues.length
  return roundTo2(average * 100)
}

export function scoreAdjacentContrastAverage(
  families: PuzzleFamily[],
  medianDiffs: MedianAttributeDifferences
): number {
  if (families.length < 2) return 0
  const ratings = new Map<string, PuzzleAttributeRatings>(
    families.map(family => [family.familyId, ratePuzzleAttributes(family.primary.layout)])
  )
  const scores: number[] = []
  for (let i = 0; i < families.length - 1; i++) {
    const left = ratings.get(families[i].familyId)!
    const right = ratings.get(families[i + 1].familyId)!
    scores.push(scorePuzzleDifference(left, right, medianDiffs))
  }
  return roundTo2(scores.reduce((sum, value) => sum + value, 0) / scores.length)
}

export function arrangeFamiliesForContrast(
  families: PuzzleFamily[],
  medianDiffs: MedianAttributeDifferences
): PuzzleFamily[] {
  if (families.length <= 2) return [...families]

  const ratingsByFamily = new Map<string, PuzzleAttributeRatings>(
    families.map(family => [family.familyId, ratePuzzleAttributes(family.primary.layout)])
  )

  const distance = (a: PuzzleFamily, b: PuzzleFamily): number =>
    scorePuzzleDifference(
      ratingsByFamily.get(a.familyId)!,
      ratingsByFamily.get(b.familyId)!,
      medianDiffs
    )

  const unplaced = new Map<string, PuzzleFamily>(families.map(f => [f.familyId, f]))
  const averageDistanceByFamily = families.map(family => {
    const distances = families
      .filter(other => other.familyId !== family.familyId)
      .map(other => distance(family, other))
    const avg = distances.reduce((sum, value) => sum + value, 0) / Math.max(1, distances.length)
    return { family, avg }
  })

  averageDistanceByFamily.sort((a, b) => b.avg - a.avg)
  const ordered: PuzzleFamily[] = [averageDistanceByFamily[0].family]
  unplaced.delete(averageDistanceByFamily[0].family.familyId)

  while (unplaced.size > 0) {
    const current = ordered[ordered.length - 1]
    const next = Array.from(unplaced.values()).sort(
      (a, b) => distance(current, b) - distance(current, a)
    )[0]
    ordered.push(next)
    unplaced.delete(next.familyId)
  }

  return ordered
}

export function pickBestInsertionIndexForNewFamily(
  existingFamiliesInOrder: PuzzleFamily[],
  newFamily: PuzzleFamily,
  medianDiffs: MedianAttributeDifferences
): number {
  if (existingFamiliesInOrder.length === 0) return 0

  const ratingsByFamily = new Map<string, PuzzleAttributeRatings>(
    existingFamiliesInOrder.map(family => [family.familyId, ratePuzzleAttributes(family.primary.layout)])
  )
  const newRatings = ratePuzzleAttributes(newFamily.primary.layout)

  const contrastWith = (family: PuzzleFamily): number =>
    scorePuzzleDifference(newRatings, ratingsByFamily.get(family.familyId)!, medianDiffs)

  let bestIndex = 0
  let bestScore = -Infinity

  for (let index = 0; index <= existingFamiliesInOrder.length; index++) {
    const left = index > 0 ? existingFamiliesInOrder[index - 1] : null
    const right = index < existingFamiliesInOrder.length ? existingFamiliesInOrder[index] : null

    let score = 0
    if (left) score += contrastWith(left)
    if (right) score += contrastWith(right)

    if (left && right) {
      // Prefer true "between two puzzles" placement when possible.
      score += 5
    }

    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  }

  return bestIndex
}
