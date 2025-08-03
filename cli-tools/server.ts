import express from 'express';
import cors from 'cors';
import { PuzzleDatabase } from './puzzleDatabase';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const db = new PuzzleDatabase();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Puzzle API server is running' });
});

app.get('/api/puzzles', (req, res) => {
  try {
    const puzzles = db.getAllPuzzles();
    res.json({ puzzles });
  } catch (error) {
    console.error('Error fetching puzzles:', error);
    res.status(500).json({ error: 'Failed to fetch puzzles' });
  }
});

app.get('/api/puzzles/size/:size', (req, res) => {
  try {
    const size = parseInt(req.params.size, 10);
    if (isNaN(size) || size <= 0) {
      return res.status(400).json({ error: 'Invalid grid size' });
    }

    const allPuzzles = db.getPuzzlesBySize(size);
    const validPuzzles = allPuzzles.filter((puzzle) =>
      isValidPuzzle(puzzle.layout, puzzle.queens, size)
    );

    res.json({ puzzles: validPuzzles, size, total: allPuzzles.length, valid: validPuzzles.length });
  } catch (error) {
    console.error('Error fetching puzzles by size:', error);
    res.status(500).json({ error: 'Failed to fetch puzzles' });
  }
});

app.get('/api/puzzles/random/:size', (req, res) => {
  try {
    const size = parseInt(req.params.size, 10);
    if (isNaN(size) || size <= 0) {
      return res.status(400).json({ error: 'Invalid grid size' });
    }

    // Get all puzzles for this size and filter out invalid ones
    const allPuzzles = db.getPuzzlesBySize(size);
    const validPuzzles = allPuzzles.filter((puzzle) =>
      isValidPuzzle(puzzle.layout, puzzle.queens, size)
    );

    if (validPuzzles.length === 0) {
      return res.status(404).json({ error: `No valid ${size}x${size} puzzles found` });
    }

    // Pick a random valid puzzle
    const randomIndex = Math.floor(Math.random() * validPuzzles.length);
    const puzzle = validPuzzles[randomIndex];

    res.json({ puzzle });
  } catch (error) {
    console.error('Error fetching random puzzle:', error);
    res.status(500).json({ error: 'Failed to fetch random puzzle' });
  }
});

app.post('/api/puzzles/save', (req, res) => {
  try {
    const { layout, queens, gridSize } = req.body;

    if (!layout || !queens || !gridSize) {
      return res.status(400).json({
        error: 'Missing required fields: layout, queens, gridSize',
      });
    }

    // Validate grid size
    const size = parseInt(gridSize, 10);
    if (isNaN(size) || size <= 0) {
      return res.status(400).json({ error: 'Invalid grid size' });
    }

    // Validate layout and queens strings
    const expectedLength = size * size;
    if (layout.length !== expectedLength || queens.length !== expectedLength) {
      return res.status(400).json({
        error: `Invalid string lengths. Expected ${expectedLength} characters for ${size}x${size} grid`,
      });
    }

    // Validate puzzle content
    if (!isValidPuzzle(layout, queens, size)) {
      return res.status(400).json({
        error: 'Invalid puzzle: must have exactly gridSize queens and sufficient color groups',
      });
    }

    // Create puzzle data in the format expected by the database
    const puzzleData = {
      id: `user-${Date.now()}`,
      layout,
      queens,
      createdAt: new Date().toISOString(),
    };

    // Convert string format to grid format for database storage
    const grid = convertStringToGrid(layout, queens, size);

    // Add to database
    const success = db.addPuzzle(grid);

    if (success) {
      res.json({
        success: true,
        message: 'Puzzle saved successfully',
        puzzle: puzzleData,
      });
    } else {
      res.status(409).json({
        error: 'Puzzle already exists in database',
      });
    }
  } catch (error) {
    console.error('Error saving puzzle:', error);
    res.status(500).json({ error: 'Failed to save puzzle' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Helper function to validate puzzle data
function isValidPuzzle(layout: string, queens: string, gridSize: number): boolean {
  // Check if queens string has exactly gridSize queens
  const queenCount = (queens.match(/Q/g) || []).length;
  if (queenCount !== gridSize) {
    return false;
  }

  // Check if layout has at least gridSize different colors (one per queen)
  const colors = new Set(layout.replace(/\./g, ''));
  if (colors.size < gridSize) {
    return false;
  }

  return true;
}

// Helper function to convert string format to grid format
function convertStringToGrid(layout: string, queens: string, gridSize: number) {
  const grid = Array(gridSize)
    .fill(null)
    .map((_, row) =>
      Array(gridSize)
        .fill(null)
        .map((_, col) => ({
          position: { row, col },
          groupColor: undefined as string | undefined,
          base: null as 'honey' | 'ant' | null,
        }))
    );

  // Create reverse mapping from symbols to color names
  const COLOR_SYMBOLS = {
    undefined: '.',
    red: 'R',
    blue: 'B',
    green: 'G',
    yellow: 'Y',
    purple: 'P',
    orange: 'O',
    pink: 'I',
    teal: 'T',
    indigo: 'N',
    amber: 'A',
  };

  const SYMBOL_TO_COLOR: Record<string, string> = Object.entries(COLOR_SYMBOLS).reduce(
    (acc, [color, symbol]) => {
      if (color !== 'undefined') {
        acc[symbol] = color;
      }
      return acc;
    },
    {} as Record<string, string>
  );

  // Parse layout (color groups)
  for (let i = 0; i < layout.length; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const symbol = layout[i];

    if (symbol !== '.') {
      const colorName = SYMBOL_TO_COLOR[symbol];
      if (colorName) {
        grid[row][col].groupColor = colorName;
      }
    }
  }

  // Parse queens (honey pot positions)
  for (let i = 0; i < queens.length; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;

    if (queens[i] === 'Q') {
      grid[row][col].base = 'honey';
    }
  }

  return grid;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Puzzle API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
