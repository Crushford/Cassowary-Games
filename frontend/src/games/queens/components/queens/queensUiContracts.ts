export type QueensPlacementMode = 'auto' | 'flag' | 'queen';

export interface QueensToolSelectorController {
  placementMode: QueensPlacementMode;
  autoFlagging: boolean;
  isTutorialMode: boolean;
  highlightToolSelector: boolean;
  setPlacementMode(mode: QueensPlacementMode): void;
  setAutoFlagging(enabled: boolean): void;
}

export interface QueensActionMenuAction {
  label: string;
  onClick: () => void;
  class?: string;
  disabled?: boolean;
  visible?: boolean;
}
