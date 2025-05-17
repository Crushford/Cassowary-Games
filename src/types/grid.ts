export interface GridSquare {
  position: { row: number; col: number };
  state: 'empty' | 'queen' | 'flag' | 'invalid';
  groupColor?: string;
  playerMark?: 'queen' | 'flag';
}
