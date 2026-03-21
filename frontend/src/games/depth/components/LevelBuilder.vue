<template>
  <section
    class="rounded-3xl border border-app-border bg-depth-panel p-4 shadow-xl shadow-black/10"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-app-textMuted">
          Level Builder
        </p>
        <h2 class="mt-1 text-lg font-black text-app-text">Custom Draft</h2>
      </div>
      <button
        class="rounded-xl border border-app-border px-3 py-2 text-xs font-semibold text-app-textMuted transition-colors hover:bg-app-bg hover:text-app-text"
        @click="$emit('reset-draft')"
      >
        Reset
      </button>
    </div>

    <p class="mt-2 text-sm leading-relaxed text-app-textMuted">
      Edit a real <code>LevelInput</code> draft, then preview it in the Depth board.
    </p>

    <div class="mt-4 space-y-4">
      <SharedAccordion title="Metadata" :default-open="true">
        <div class="grid gap-3">
          <label class="builder-field">
            <span>Name</span>
            <input :value="modelValue.metadata.name" type="text" @input="updateName" />
          </label>
          <label class="builder-field">
            <span>Description</span>
            <textarea
              :value="modelValue.metadata.description ?? ''"
              rows="3"
              @input="updateDescription"
            />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="builder-field">
              <span>ID</span>
              <input
                :value="modelValue.metadata.id"
                type="number"
                min="1"
                @input="updateNumber('metadata.id', $event)"
              />
            </label>
            <label class="builder-field">
              <span>Draft</span>
              <select
                :value="modelValue.metadata.draft ? 'true' : 'false'"
                @change="updateDraftFlag"
              >
                <option value="false">Off</option>
                <option value="true">On</option>
              </select>
            </label>
          </div>
        </div>
      </SharedAccordion>

      <SharedAccordion title="Economy" :default-open="true">
        <div class="grid grid-cols-2 gap-3">
          <label v-for="field in economyFields" :key="field.key" class="builder-field">
            <span>{{ field.label }}</span>
            <input
              :value="readNumber(field.key)"
              type="number"
              min="1"
              @input="updateNumber(field.key, $event)"
            />
          </label>
        </div>
      </SharedAccordion>

      <SharedAccordion title="Board Shape" :default-open="true">
        <div class="grid grid-cols-3 gap-3">
          <label v-for="field in boardFields" :key="field.key" class="builder-field">
            <span>{{ field.label }}</span>
            <input
              :value="readNumber(field.key)"
              type="number"
              min="1"
              @input="updateBoardNumber(field.key, $event)"
            />
          </label>
        </div>
      </SharedAccordion>

      <SharedAccordion title="Deck Assignment" :default-open="true">
        <div class="space-y-3">
          <label class="builder-field">
            <span>Assignment mode</span>
            <select :value="modelValue.decks.mode" @change="updateDeckMode">
              <option value="uniform">Uniform</option>
              <option value="by-depth">By depth</option>
              <option value="by-row">By row</option>
              <option value="row-depth-matrix">Row-depth matrix</option>
            </select>
          </label>

          <template v-if="modelValue.decks.mode === 'uniform'">
            <label class="builder-field">
              <span>Deck</span>
              <select :value="modelValue.decks.deckId" @change="updateUniformDeck">
                <option v-for="deck in decks" :key="deck.id" :value="deck.id">
                  {{ deck.name }}
                </option>
              </select>
            </label>
          </template>

          <template v-else-if="modelValue.decks.mode === 'by-depth'">
            <div class="grid gap-3">
              <label
                v-for="(deckId, depthIndex) in modelValue.decks.depthDeckIds"
                :key="`depth-${depthIndex}`"
                class="builder-field"
              >
                <span>Depth {{ depthIndex + 1 }}</span>
                <select
                  :value="deckId"
                  @change="updateDepthDeck(depthIndex, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="deck in decks" :key="deck.id" :value="deck.id">
                    {{ deck.name }}
                  </option>
                </select>
              </label>
            </div>
          </template>

          <template v-else-if="modelValue.decks.mode === 'by-row'">
            <div class="grid gap-3">
              <label
                v-for="(deckId, rowIndex) in modelValue.decks.rowDeckIds"
                :key="`row-${rowIndex}`"
                class="builder-field"
              >
                <span>Row {{ rowIndex + 1 }}</span>
                <select
                  :value="deckId"
                  @change="updateRowDeck(rowIndex, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="deck in decks" :key="deck.id" :value="deck.id">
                    {{ deck.name }}
                  </option>
                </select>
              </label>
            </div>
          </template>

          <template v-else>
            <div class="space-y-3">
              <div
                v-for="(rowDecks, rowIndex) in modelValue.decks.matrix"
                :key="`matrix-row-${rowIndex}`"
                class="rounded-2xl border border-app-border bg-depth-baseSoft p-3"
              >
                <div
                  class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-app-textMuted"
                >
                  Row {{ rowIndex + 1 }}
                </div>
                <div
                  class="grid gap-2"
                  :style="{ gridTemplateColumns: `repeat(${rowDecks.length}, minmax(0, 1fr))` }"
                >
                  <label
                    v-for="(deckId, depthIndex) in rowDecks"
                    :key="`matrix-${rowIndex}-${depthIndex}`"
                    class="builder-field"
                  >
                    <span>Depth {{ depthIndex + 1 }}</span>
                    <select
                      :value="deckId"
                      @change="
                        updateMatrixDeck(
                          rowIndex,
                          depthIndex,
                          ($event.target as HTMLSelectElement).value
                        )
                      "
                    >
                      <option v-for="deck in decks" :key="deck.id" :value="deck.id">
                        {{ deck.name }}
                      </option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </template>
        </div>
      </SharedAccordion>

      <SharedAccordion title="Rules And Support">
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <label class="builder-field">
              <span>Turn rule</span>
              <select :value="modelValue.rules.turnRule" @change="updateTurnRule">
                <option value="basic-reveal">Basic reveal</option>
                <option value="column-choice-reveal">Column choice reveal</option>
                <option value="column-reveal">Column reveal</option>
                <option value="dealer-follow-up">Dealer follow-up</option>
              </select>
            </label>
            <label class="builder-field">
              <span>Support mode</span>
              <select
                :value="modelValue.support.supportMode ?? 'exact'"
                @change="updateSupportMode"
              >
                <option value="exact">Exact</option>
                <option value="row-summary">Row summary</option>
                <option value="board-summary">Board summary</option>
                <option value="debug">Debug</option>
              </select>
            </label>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <label class="builder-field">
              <span>Dealer enabled</span>
              <select
                :value="modelValue.rules.dealerEnabled ? 'true' : 'false'"
                @change="updateDealerEnabled"
              >
                <option value="false">Off</option>
                <option value="true">On</option>
              </select>
            </label>
            <label class="builder-field">
              <span>Dealer after player</span>
              <select
                :value="modelValue.rules.dealerAfterPlayer ? 'true' : 'false'"
                @change="updateDealerAfterPlayer"
              >
                <option value="false">Off</option>
                <option value="true">On</option>
              </select>
            </label>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <label class="builder-field toggle-field">
              <span>Exact values</span>
              <input
                :checked="modelValue.support.showExactRemainingValues ?? true"
                type="checkbox"
                @change="updateSupportToggle('showExactRemainingValues', $event)"
              />
            </label>
            <label class="builder-field toggle-field">
              <span>Row averages</span>
              <input
                :checked="modelValue.support.showRowAverages ?? false"
                type="checkbox"
                @change="updateSupportToggle('showRowAverages', $event)"
              />
            </label>
            <label class="builder-field toggle-field">
              <span>Board average</span>
              <input
                :checked="modelValue.support.showBoardAverage ?? false"
                type="checkbox"
                @change="updateSupportToggle('showBoardAverage', $event)"
              />
            </label>
          </div>
        </div>
      </SharedAccordion>

      <SharedAccordion title="Testing">
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <label class="builder-field toggle-field">
              <span>Debug logging</span>
              <input
                :checked="modelValue.testing?.debugLogging ?? false"
                type="checkbox"
                @change="updateTestingToggle('debugLogging', $event)"
              />
            </label>
            <label class="builder-field toggle-field">
              <span>Level inspector</span>
              <input
                :checked="modelValue.testing?.allowLevelInspector ?? false"
                type="checkbox"
                @change="updateTestingToggle('allowLevelInspector', $event)"
              />
            </label>
          </div>
          <label class="builder-field">
            <span>Shuffle seed</span>
            <input
              :value="modelValue.testing?.shuffleSeed ?? ''"
              type="text"
              placeholder="Optional deterministic seed"
              @input="updateShuffleSeed"
            />
          </label>
        </div>
      </SharedAccordion>
    </div>

    <div
      v-if="error"
      class="mt-4 rounded-2xl border border-edge-dangerSoft bg-feedback-dangerSubtle p-3 text-sm text-semantic-danger-200"
    >
      {{ error }}
    </div>

    <div class="mt-4 flex gap-2">
      <button
        class="flex-1 rounded-2xl border border-incremental-successBorderFaint bg-incremental-successBgMedium px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-semantic-success-600"
        @click="$emit('preview-draft')"
      >
        Preview Draft
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import SharedAccordion from '@/shared/components/Accordion.vue';
import type {
  DeckArchetype,
  DeckAssignmentMode,
  LevelInput,
  TurnRuleType,
} from '@/games/depth/game/types';

const props = defineProps<{
  modelValue: LevelInput;
  decks: DeckArchetype[];
  error: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: LevelInput): void;
  (event: 'preview-draft'): void;
  (event: 'reset-draft'): void;
}>();

const economyFields = [
  { key: 'economy.startingBank', label: 'Starting bank' },
  { key: 'economy.rounds', label: 'Rounds' },
  { key: 'economy.minBet', label: 'Min bet' },
  { key: 'economy.maxBet', label: 'Max bet' },
] as const;

const boardFields = [
  { key: 'board.rows', label: 'Rows' },
  { key: 'board.columns', label: 'Columns' },
  { key: 'board.depth', label: 'Depth' },
] as const;

function cloneDraft(): LevelInput {
  return structuredClone(props.modelValue);
}

function emitDraft(next: LevelInput): void {
  emit('update:modelValue', normalizeDraft(next));
}

function readNumber(path: string): number {
  const [group, key] = path.split('.') as [keyof LevelInput, string];
  const source = props.modelValue[group] as Record<string, number>;
  return source[key];
}

function firstDeckId(): string {
  return props.decks[0]?.id ?? 'blue-starter';
}

function normalizeDraft(draft: LevelInput): LevelInput {
  const rows = Math.min(5, Math.max(1, Math.floor(draft.board.rows)));
  const columns = Math.min(5, Math.max(1, Math.floor(draft.board.columns)));
  const depth = Math.min(10, Math.max(1, Math.floor(draft.board.depth)));

  draft.board.rows = rows;
  draft.board.depth = depth;
  draft.board.columns = columns;
  draft.economy.startingBank = Math.max(1, Math.floor(draft.economy.startingBank));
  draft.economy.rounds = Math.max(1, Math.floor(draft.economy.rounds));
  draft.economy.minBet = Math.max(1, Math.floor(draft.economy.minBet));
  draft.economy.maxBet = Math.max(draft.economy.minBet, Math.floor(draft.economy.maxBet));
  draft.metadata.id = Math.max(1, Math.floor(draft.metadata.id));

  const fallbackDeck = firstDeckId();

  switch (draft.decks.mode) {
    case 'uniform':
      draft.decks.deckId = draft.decks.deckId || fallbackDeck;
      break;
    case 'by-depth': {
      const deckAssignment = draft.decks;
      deckAssignment.depthDeckIds = Array.from({ length: depth }, (_, index) => {
        return deckAssignment.depthDeckIds[index] ?? fallbackDeck;
      });
      break;
    }
    case 'by-row': {
      const deckAssignment = draft.decks;
      deckAssignment.rowDeckIds = Array.from({ length: rows }, (_, index) => {
        return deckAssignment.rowDeckIds[index] ?? fallbackDeck;
      });
      break;
    }
    case 'row-depth-matrix': {
      const deckAssignment = draft.decks;
      deckAssignment.matrix = Array.from({ length: rows }, (_, rowIndex) =>
        Array.from({ length: depth }, (_, depthIndex) => {
          return deckAssignment.matrix[rowIndex]?.[depthIndex] ?? fallbackDeck;
        })
      );
      break;
    }
  }

  return draft;
}

function setValue(mutator: (draft: LevelInput) => void): void {
  const next = cloneDraft();
  mutator(next);
  emitDraft(next);
}

function updateName(event: Event): void {
  setValue((draft) => {
    draft.metadata.name = (event.target as HTMLInputElement).value;
  });
}

function updateDescription(event: Event): void {
  setValue((draft) => {
    draft.metadata.description = (event.target as HTMLTextAreaElement).value;
  });
}

function updateDraftFlag(event: Event): void {
  setValue((draft) => {
    draft.metadata.draft = (event.target as HTMLSelectElement).value === 'true';
  });
}

function updateNumber(path: string, event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);

  setValue((draft) => {
    const [group, key] = path.split('.') as [keyof LevelInput, string];
    (draft[group] as Record<string, number>)[key] = value;
  });
}

function updateBoardNumber(path: string, event: Event): void {
  updateNumber(path, event);
}

function buildDeckAssignment(mode: DeckAssignmentMode): LevelInput['decks'] {
  const rows = Math.max(1, Math.floor(props.modelValue.board.rows));
  const depth = Math.max(1, Math.floor(props.modelValue.board.depth));
  const fallbackDeck = firstDeckId();

  switch (mode) {
    case 'uniform':
      return { mode, deckId: fallbackDeck };
    case 'by-depth':
      return {
        mode,
        depthDeckIds: Array.from({ length: depth }, () => fallbackDeck),
      };
    case 'by-row':
      return {
        mode,
        rowDeckIds: Array.from({ length: rows }, () => fallbackDeck),
      };
    case 'row-depth-matrix':
      return {
        mode,
        matrix: Array.from({ length: rows }, () =>
          Array.from({ length: depth }, () => fallbackDeck)
        ),
      };
  }
}

function updateDeckMode(event: Event): void {
  const mode = (event.target as HTMLSelectElement).value as DeckAssignmentMode;
  setValue((draft) => {
    draft.decks = buildDeckAssignment(mode);
  });
}

function updateUniformDeck(event: Event): void {
  setValue((draft) => {
    if (draft.decks.mode === 'uniform') {
      draft.decks.deckId = (event.target as HTMLSelectElement).value;
    }
  });
}

function updateDepthDeck(index: number, deckId: string): void {
  setValue((draft) => {
    if (draft.decks.mode === 'by-depth') {
      draft.decks.depthDeckIds[index] = deckId;
    }
  });
}

function updateRowDeck(index: number, deckId: string): void {
  setValue((draft) => {
    if (draft.decks.mode === 'by-row') {
      draft.decks.rowDeckIds[index] = deckId;
    }
  });
}

function updateMatrixDeck(rowIndex: number, depthIndex: number, deckId: string): void {
  setValue((draft) => {
    if (draft.decks.mode === 'row-depth-matrix') {
      draft.decks.matrix[rowIndex][depthIndex] = deckId;
    }
  });
}

function updateTurnRule(event: Event): void {
  const rule = (event.target as HTMLSelectElement).value as TurnRuleType;
  setValue((draft) => {
    draft.rules.turnRule = rule;
    if (rule === 'dealer-follow-up') {
      draft.rules.dealerEnabled = true;
      draft.rules.dealerAfterPlayer = true;
    }
  });
}

function updateSupportMode(event: Event): void {
  setValue((draft) => {
    draft.support.supportMode = (event.target as HTMLSelectElement)
      .value as LevelInput['support']['supportMode'];
  });
}

function updateDealerEnabled(event: Event): void {
  setValue((draft) => {
    draft.rules.dealerEnabled = (event.target as HTMLSelectElement).value === 'true';
  });
}

function updateDealerAfterPlayer(event: Event): void {
  setValue((draft) => {
    draft.rules.dealerAfterPlayer = (event.target as HTMLSelectElement).value === 'true';
  });
}

function updateSupportToggle(
  key: 'showExactRemainingValues' | 'showRowAverages' | 'showBoardAverage',
  event: Event
): void {
  setValue((draft) => {
    draft.support[key] = (event.target as HTMLInputElement).checked;
  });
}

function updateTestingToggle(key: 'debugLogging' | 'allowLevelInspector', event: Event): void {
  setValue((draft) => {
    draft.testing ??= {};
    draft.testing[key] = (event.target as HTMLInputElement).checked;
  });
}

function updateShuffleSeed(event: Event): void {
  setValue((draft) => {
    draft.testing ??= {};
    draft.testing.shuffleSeed = (event.target as HTMLInputElement).value || undefined;
  });
}

defineOptions({
  name: 'LevelBuilder',
});
</script>

<style scoped>
.builder-field {
  display: grid;
  gap: 0.5rem;
  color: var(--color-text-muted, #9ca3af);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.builder-field input,
.builder-field select,
.builder-field textarea {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 13, 18, 0.8);
  color: #f5f7fb;
  padding: 0.7rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: none;
  letter-spacing: normal;
}

.builder-field textarea {
  resize: vertical;
}

.toggle-field {
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 13, 18, 0.8);
  padding: 0.85rem;
}

.toggle-field input {
  width: 1rem;
  height: 1rem;
  padding: 0;
}
</style>
