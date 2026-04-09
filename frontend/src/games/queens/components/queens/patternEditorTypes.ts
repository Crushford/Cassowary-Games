export interface PatternEditorCell {
  row: number;
  col: number;
  activeSquare?: boolean;
}

export interface PatternEditorFlag {
  row: number;
  col: number;
}

export interface PatternEditorDraft {
  id?: string;
  cost?: number;
  size: number;
  cells: PatternEditorCell[];
  outputFlags: PatternEditorFlag[];
}
