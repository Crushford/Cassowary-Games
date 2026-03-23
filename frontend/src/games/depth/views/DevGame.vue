<template>
  <div
    class="min-h-dvh bg-[radial-gradient(120%_120%_at_50%_-15%,var(--tw-gradient-from)_0%,var(--tw-gradient-to)_58%)] from-depth-gradientStart to-app-bgAlt text-app-text"
    data-game="depth"
  >
    <div class="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col px-4 py-4 lg:px-6">
      <header
        class="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-app-border bg-depth-panelSoft px-5 py-4 shadow-xl shadow-black/10 backdrop-blur"
      >
        <div class="flex items-center gap-4">
          <router-link
            to="/"
            class="text-sm font-medium text-app-textMuted transition-colors hover:text-app-text"
            aria-label="Back to home"
          >
            ← Home
          </router-link>
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.35em] text-app-textMuted">
              Probability Table
            </p>
            <h1 class="text-2xl font-black uppercase tracking-[0.2em] text-depth-title">Depth</h1>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <div class="hud-pill">
            <span>Source</span>
            <strong>{{ store.levelSource === 'catalog' ? 'Preset' : 'Custom' }}</strong>
          </div>
          <div class="hud-pill">
            <span>Level</span>
            <strong>{{ store.level.name }}</strong>
          </div>
          <div class="hud-pill">
            <span>Round</span>
            <strong>{{ store.currentRound }}/{{ store.roundsPerLevel }}</strong>
          </div>
          <div class="hud-pill hud-pill--bank">
            <span>Bank</span>
            <strong>🪙 {{ store.bank }}</strong>
          </div>
        </div>
      </header>

      <div class="mt-4 grid flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside class="space-y-4 xl:max-h-[calc(100dvh-10rem)] xl:overflow-y-auto xl:pr-1">
          <LevelSelector
            :levels="presetLevels"
            :current-level-id="store.currentLevel"
            :current-source="store.levelSource"
            @select-level="selectPresetLevel"
            @use-template="loadTemplateIntoBuilder"
          />

          <LevelBuilder
            v-model="builderDraft"
            :decks="availableDecks"
            :error="builderError"
            @preview-draft="previewDraftLevel"
            @reset-draft="resetBuilderDraft"
          />
        </aside>

        <main class="space-y-4 xl:max-h-[calc(100dvh-10rem)] xl:overflow-y-auto xl:pl-1">
          <section
            class="rounded-[2rem] border border-app-border bg-depth-panel p-5 shadow-xl shadow-black/10"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.35em] text-app-textMuted">
                  {{ phaseLabel }}
                </p>
                <h2 class="mt-1 text-3xl font-black text-app-text">
                  {{ store.level.name }}
                </h2>
                <p class="mt-2 max-w-3xl text-sm leading-relaxed text-app-textMuted">
                  {{ store.level.description || defaultDescription }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="meta-chip"
                  >{{ store.level.rows }}×{{ store.level.columns }}×{{ store.level.depth }}</span
                >
                <span class="meta-chip">{{ store.level.turnRule }}</span>
                <span class="meta-chip">{{ store.supportMode }}</span>
              </div>
            </div>

            <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div class="summary-card">
                <span>Starting bank</span>
                <strong>{{ store.level.startingBank }}</strong>
              </div>
              <div class="summary-card">
                <span>Bet range</span>
                <strong>{{ store.level.minBet }}-{{ store.level.maxBet }}</strong>
              </div>
              <div class="summary-card">
                <span>Board average</span>
                <strong>{{ boardAverageLabel }}</strong>
              </div>
              <div class="summary-card">
                <span>Selectable stacks</span>
                <strong>{{ store.accessiblePositions.length }}</strong>
              </div>
            </div>
          </section>

          <section
            v-if="store.phase === 'deck-preview'"
            class="rounded-[2rem] border border-app-border bg-depth-panel p-5 shadow-xl shadow-black/10"
          >
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.35em] text-app-textMuted">
                  Preview
                </p>
                <h3 class="mt-1 text-xl font-black text-app-text">Study the level before play</h3>
              </div>
              <div class="flex gap-2">
                <button class="secondary-button" @click="store.restartLevel()">Reset Level</button>
                <button class="primary-button" @click="store.beginRound()">Begin Round</button>
              </div>
            </div>

            <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
              <div class="space-y-4">
                <div class="rounded-3xl border border-app-border bg-depth-baseFaint p-4">
                  <div class="mb-3 flex items-center justify-between">
                    <div>
                      <p
                        class="text-[11px] font-semibold uppercase tracking-[0.3em] text-app-textMuted"
                      >
                        Board Preview
                      </p>
                      <h4 class="mt-1 text-sm font-bold text-app-text">
                        Selectable stacks and depth
                      </h4>
                    </div>
                    <span
                      class="rounded-full border border-app-border px-3 py-1 text-xs text-app-textMuted"
                    >
                      {{ store.accessiblePositions.length }} live positions
                    </span>
                  </div>

                  <Board
                    v-if="store.board"
                    :board="store.board"
                    :selected-position="store.round.selectedPosition"
                    :show-exact-values="showExactValues"
                    @select-position="store.selectPosition"
                  />
                </div>
              </div>

              <div class="space-y-4">
                <div class="rounded-3xl border border-app-border bg-depth-baseFaint p-4">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.3em] text-app-textMuted"
                  >
                    Deck Matrix
                  </p>
                  <div class="mt-3 space-y-3">
                    <div
                      v-for="(rowDecks, rowIndex) in store.deckMatrix"
                      :key="`preview-row-${rowIndex}`"
                      class="rounded-2xl border border-app-border bg-depth-panelMuted p-3"
                    >
                      <div
                        class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-app-textMuted"
                      >
                        Row {{ rowIndex + 1 }}
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <span
                          v-for="(deckColor, depthIndex) in rowDecks"
                          :key="`${rowIndex}-${depthIndex}`"
                          class="deck-chip"
                        >
                          D{{ depthIndex + 1 }} · {{ deckName(deckColor) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rounded-3xl border border-app-border bg-depth-baseFaint p-4">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.3em] text-app-textMuted"
                  >
                    Available Decks
                  </p>
                  <div class="mt-3 grid gap-3">
                    <div
                      v-for="deckColor in decksUsedByLevel"
                      :key="deckColor"
                      class="rounded-2xl border border-app-border bg-depth-panelMuted p-3"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <h4 class="text-sm font-bold text-app-text">{{ deckName(deckColor) }}</h4>
                          <p class="text-xs text-app-textMuted">
                            {{ getDeckArchetype(deckColor).riskProfile }} risk
                          </p>
                        </div>
                        <span
                          class="rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.25em]"
                          :class="deckColorClass(deckColor)"
                        >
                          {{ deckColor }}
                        </span>
                      </div>
                      <div class="mt-3 flex flex-wrap gap-2">
                        <span
                          v-for="(value, index) in getDeckArchetype(deckColor).cards"
                          :key="`${deckColor}-${index}`"
                          class="rounded-xl border border-app-border bg-app-bg px-2 py-1 text-xs font-bold"
                          :class="cardValueTextClass(value)"
                        >
                          {{ value }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            v-else-if="displayPhase === 'playing'"
            class="rounded-[2rem] border border-app-border bg-depth-panel p-5 shadow-xl shadow-black/10"
          >
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.35em] text-app-textMuted">
                  Live Round
                </p>
                <h3 class="mt-1 text-xl font-black text-app-text">
                  Pick a stack and resolve the turn
                </h3>
              </div>
              <div class="flex gap-2">
                <button class="secondary-button" @click="store.restartLevel()">
                  Restart Level
                </button>
                <button class="primary-button" :disabled="!store.canReveal" @click="handleReveal()">
                  {{ revealButtonLabel }}
                </button>
              </div>
            </div>

            <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
              <div class="space-y-4">
                <div class="rounded-3xl border border-app-border bg-depth-baseFaint p-4">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p
                        class="text-[11px] font-semibold uppercase tracking-[0.3em] text-app-textMuted"
                      >
                        Board
                      </p>
                      <h4 class="mt-1 text-sm font-bold text-app-text">
                        {{ selectedPositionLabel }}
                      </h4>
                    </div>
                    <span
                      class="rounded-full border border-app-border px-3 py-1 text-xs text-app-textMuted"
                    >
                      {{ store.level.turnRule }}
                    </span>
                  </div>

                  <Board
                    v-if="store.board"
                    :board="store.board"
                    :selected-position="store.round.selectedPosition"
                    :show-exact-values="false"
                    :staged-reveals="stagedReveals"
                    @select-position="store.selectPosition"
                  />
                </div>

                <div class="rounded-3xl border border-app-border bg-depth-baseFaint p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p
                        class="text-[11px] font-semibold uppercase tracking-[0.3em] text-app-textMuted"
                      >
                        Bet
                      </p>
                      <h4 class="mt-1 text-sm font-bold text-app-text">
                        Choose stake for the next reveal
                      </h4>
                    </div>
                    <span
                      class="rounded-full border border-app-border px-3 py-1 text-xs text-app-textMuted"
                    >
                      Max {{ store.maxBet }}
                    </span>
                  </div>

                  <div class="mt-4 grid grid-cols-5 gap-2">
                    <button
                      v-for="amount in betOptions"
                      :key="amount"
                      type="button"
                      :disabled="amount > store.maxBet"
                      class="rounded-2xl border px-3 py-3 text-center text-base font-black transition-all"
                      :class="betClass(amount)"
                      @click="store.setPendingBet(amount)"
                    >
                      {{ amount }}
                    </button>
                  </div>
                  <p
                    v-if="isRevealAnimating"
                    class="mt-3 text-xs uppercase tracking-[0.2em] text-semantic-warning-300"
                  >
                    {{ activeRevealLabel }}.
                  </p>
                </div>
              </div>

              <div class="space-y-4">
                <div class="rounded-3xl border border-app-border bg-depth-baseFaint p-4">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.3em] text-app-textMuted"
                  >
                    Support
                  </p>
                  <div class="mt-3 space-y-3 text-sm">
                    <div class="support-row">
                      <span>Support mode</span>
                      <strong>{{ store.supportMode }}</strong>
                    </div>
                    <div class="support-row">
                      <span>Board average</span>
                      <strong>{{ boardAverageLabel }}</strong>
                    </div>
                    <div
                      v-for="rowIndex in store.level.rows"
                      :key="`row-average-${rowIndex}`"
                      class="support-row"
                    >
                      <span>Row {{ rowIndex }}</span>
                      <strong>{{ rowAverageLabel(rowIndex - 1) }}</strong>
                    </div>
                  </div>
                </div>

                <div class="rounded-3xl border border-app-border bg-depth-baseFaint p-4">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.3em] text-app-textMuted"
                  >
                    Discard Pile
                  </p>
                  <div v-if="discardPile.length" class="mt-3 space-y-2">
                    <div
                      v-for="(reveal, index) in discardPile"
                      :key="`${reveal.row}-${reveal.col}-${reveal.layerIndex}-${index}`"
                      class="rounded-2xl border border-app-border bg-depth-panelMuted p-3"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <strong class="text-sm" :class="cardValueTextClass(reveal.cardValue)">
                          {{ reveal.revealedBy }} · {{ reveal.cardValue }}
                        </strong>
                        <span class="text-xs text-app-textMuted">
                          R{{ reveal.row + 1 }} C{{ reveal.col + 1 }} D{{ reveal.layerIndex + 1 }}
                        </span>
                      </div>
                      <div class="mt-1 text-xs text-app-textMuted">
                        Bet {{ reveal.bet }} · Payout {{ reveal.payout }} · Net
                        {{ reveal.net > 0 ? '+' : '' }}{{ reveal.net }}
                      </div>
                    </div>
                  </div>
                  <p v-else class="mt-3 text-sm text-app-textMuted">
                    No cards in the discard pile yet.
                  </p>
                </div>

                <div
                  v-if="showInspector"
                  class="rounded-3xl border border-app-border bg-depth-baseFaint p-4"
                >
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.3em] text-app-textMuted"
                  >
                    Inspector
                  </p>
                  <pre
                    class="mt-3 overflow-x-auto rounded-2xl bg-app-bg p-3 text-xs text-app-textMuted"
                    >{{ inspectorJson }}</pre
                  >
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="displayPhase === 'round-complete'" class="result-shell">
            <div class="result-header">
              <p class="result-kicker">Round Complete</p>
              <h3 class="result-title">Round {{ store.currentRound }} is closed</h3>
              <p class="result-copy">Bank carries forward into the next round of the same level.</p>
            </div>
            <div class="result-stats">
              <div class="summary-card">
                <span>Round P&L</span>
                <strong
                  :class="
                    store.roundProfit >= 0
                      ? 'text-semantic-success-300'
                      : 'text-semantic-danger-300'
                  "
                >
                  {{ store.roundProfit >= 0 ? '+' : '' }}{{ store.roundProfit }}
                </strong>
              </div>
              <div class="summary-card">
                <span>Bank now</span>
                <strong>{{ store.bank }}</strong>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="secondary-button" @click="store.restartLevel()">Replay Level</button>
              <button class="primary-button" @click="store.nextRound()">Next Round</button>
            </div>
          </section>

          <section v-else-if="displayPhase === 'level-complete'" class="result-shell">
            <div class="result-header">
              <p class="result-kicker">Level Complete</p>
              <h3 class="result-title">{{ store.level.name }} cleared</h3>
              <p class="result-copy">
                You completed all {{ store.roundsPerLevel }} rounds on this board.
              </p>
            </div>
            <div class="result-stats">
              <div class="summary-card">
                <span>Final bank</span>
                <strong>{{ store.bank }}</strong>
              </div>
              <div class="summary-card">
                <span>Next step</span>
                <strong>{{
                  hasNextPresetLevel ? 'Advance available' : 'Build a custom level'
                }}</strong>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="secondary-button" @click="store.restartLevel()">Replay Level</button>
              <button v-if="hasNextPresetLevel" class="primary-button" @click="store.nextLevel()">
                Next Level
              </button>
            </div>
          </section>

          <section v-else-if="displayPhase === 'game-over'" class="result-shell">
            <div class="result-header">
              <p class="result-kicker">Game Over</p>
              <h3 class="result-title">The bank is empty</h3>
              <p class="result-copy">
                Restart this level or load a different preset or custom build.
              </p>
            </div>
            <div class="result-stats">
              <div class="summary-card">
                <span>Round</span>
                <strong>{{ store.currentRound }}</strong>
              </div>
              <div class="summary-card">
                <span>Level</span>
                <strong>{{ store.level.name }}</strong>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="secondary-button" @click="store.restartLevel()">Retry Level</button>
              <button class="primary-button" @click="store.previewLevel(1)">Load Level 1</button>
            </div>
          </section>

          <section v-else-if="displayPhase === 'game-complete'" class="result-shell">
            <div class="result-header">
              <p class="result-kicker">Ladder Complete</p>
              <h3 class="result-title">All preset levels are finished</h3>
              <p class="result-copy">
                Use the builder to keep testing new layouts, rule mixes, and deck matrices.
              </p>
            </div>
            <div class="flex gap-2">
              <button class="secondary-button" @click="store.restartLevel()">Replay Current</button>
              <button class="primary-button" @click="loadTemplateIntoBuilder(store.currentLevel)">
                Copy To Builder
              </button>
            </div>
          </section>

          <section v-else class="result-shell">
            <div class="result-header">
              <p class="result-kicker">Choose A Level</p>
              <h3 class="result-title">Load a preset or preview a custom draft</h3>
              <p class="result-copy">
                Depth now runs on rows, columns, depth, and rule-based turn resolution.
              </p>
            </div>
            <div class="flex gap-2">
              <button class="primary-button" @click="store.previewLevel(1)">Load Level 1</button>
              <button class="secondary-button" @click="previewDraftLevel()">Preview Draft</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import Board from '@/games/depth/components/Board.vue';
import LevelBuilder from '@/games/depth/components/LevelBuilder.vue';
import LevelSelector from '@/games/depth/components/LevelSelector.vue';
import {
  DEPTH_DECK_COLORS,
  formatDeckColor,
  getDeckArchetype,
} from '@/games/depth/game/constants/deckArchetypes';
import { DEPTH_LEVEL_INPUTS } from '@/games/depth/game/constants/levelInputs';
import { DEPTH_LEVELS } from '@/games/depth/game/constants/levels';
import type { DeckColor, LevelInput, RevealRecord } from '@/games/depth/game/types';
import { useDepthStore } from '@/games/depth/stores/depth';

interface StagedReveal extends RevealRecord {
  stageId: string;
  discardAt: number;
}

const store = useDepthStore();

const presetLevels = DEPTH_LEVELS;
const availableDecks = DEPTH_DECK_COLORS;

const builderDraft = ref<LevelInput>(cloneLevelInput(DEPTH_LEVEL_INPUTS[0]));
const builderError = ref('');
const stagedReveals = ref<StagedReveal[]>([]);
const discardPile = ref<RevealRecord[]>([]);
const revealCountdownMs = ref(0);
const revealTimeoutIds = new Set<number>();
let revealCountdownIntervalId: number | null = null;
const revealDurationMs = 5000;
let revealSequence = 0;

const phaseLabel = computed(() => {
  switch (displayPhase.value) {
    case 'deck-preview':
      return 'Level Preview';
    case 'playing':
      return 'Playing';
    case 'round-complete':
      return 'Round Complete';
    case 'level-complete':
      return 'Level Complete';
    case 'game-over':
      return 'Bankrupt';
    case 'game-complete':
      return 'Campaign Complete';
    default:
      return 'Workbench';
  }
});

const displayPhase = computed(() => {
  if (
    stagedReveals.value.length > 0 &&
    ['round-complete', 'level-complete', 'game-over', 'game-complete'].includes(store.phase)
  ) {
    return 'playing';
  }

  return store.phase;
});

const defaultDescription = computed(() => {
  return 'Choose from the preset ladder or build a test board with custom deck assignment.';
});

const boardAverageLabel = computed(() => {
  if (store.boardAverageAccessibleValue === null) {
    return 'n/a';
  }
  return store.boardAverageAccessibleValue.toFixed(2);
});

const showExactValues = computed(() => {
  return store.level.showExactRemainingValues || store.supportMode === 'debug';
});

const decksUsedByLevel = computed(() => {
  return Array.from(new Set(store.deckMatrix.flat()));
});

const isRevealAnimating = computed(() => stagedReveals.value.length > 0);
const revealCountdownLabel = computed(() => {
  const seconds = Math.max(0, Math.ceil(revealCountdownMs.value / 1000));
  return `${seconds}s`;
});
const activeRevealLabel = computed(() => {
  if (stagedReveals.value.length === 0) {
    return '';
  }

  if (stagedReveals.value.length === 1) {
    return `1 reveal active. Discard in ${revealCountdownLabel.value}`;
  }

  return `${stagedReveals.value.length} reveals active. Next discard in ${revealCountdownLabel.value}`;
});

const inspectorJson = computed(() => JSON.stringify(store.levelInspectorSnapshot, null, 2));

const showInspector = computed(() => Boolean(store.level.testing?.allowLevelInspector));

const hasNextPresetLevel = computed(() => {
  return presetLevels.some((level) => level.id === store.currentLevel + 1);
});

const selectedPositionLabel = computed(() => {
  const position = store.round.selectedPosition;
  if (!position) {
    return 'Select a stack to target the next reveal';
  }
  return `Selected stack: row ${position.row + 1}, column ${position.col + 1}`;
});

const revealButtonLabel = computed(() => {
  const bet = store.pendingBet;

  switch (store.level.turnRule) {
    case 'column-reveal':
      return `Reveal Column (bet ${bet})`;
    case 'dealer-follow-up':
      return `Reveal + Dealer Follow-up (bet ${bet})`;
    default:
      return `Reveal Selected Stack (bet ${bet})`;
  }
});

const betOptions = computed(() => {
  const upper = Math.max(store.level.maxBet, 5);
  return Array.from({ length: upper }, (_, index) => index + 1);
});

function cloneLevelInput(level: LevelInput): LevelInput {
  return structuredClone(level);
}

function selectPresetLevel(levelId: number): void {
  builderError.value = '';
  clearRevealPresentation();
  store.previewLevel(levelId);
}

function loadTemplateIntoBuilder(levelId: number): void {
  const template = DEPTH_LEVEL_INPUTS.find((level) => level.metadata.id === levelId);
  if (!template) {
    return;
  }

  builderError.value = '';
  builderDraft.value = cloneLevelInput(template);
}

function resetBuilderDraft(): void {
  builderError.value = '';
  builderDraft.value = cloneLevelInput(DEPTH_LEVEL_INPUTS[0]);
}

function previewDraftLevel(): void {
  try {
    builderError.value = '';
    clearRevealPresentation();
    store.previewLevelInput(cloneLevelInput(builderDraft.value));
  } catch (error) {
    builderError.value = error instanceof Error ? error.message : 'Unable to build Depth level.';
  }
}

function clearRevealPresentation(): void {
  stagedReveals.value = [];
  discardPile.value = [];
  revealCountdownMs.value = 0;
  for (const timerId of revealTimeoutIds) {
    window.clearTimeout(timerId);
  }
  revealTimeoutIds.clear();
  if (revealCountdownIntervalId !== null) {
    window.clearInterval(revealCountdownIntervalId);
    revealCountdownIntervalId = null;
  }
}

function updateRevealCountdown(): void {
  const nextDiscardAt = Math.min(...stagedReveals.value.map((reveal) => reveal.discardAt));
  if (!Number.isFinite(nextDiscardAt)) {
    revealCountdownMs.value = 0;
    return;
  }

  revealCountdownMs.value = Math.max(0, nextDiscardAt - Date.now());
}

function ensureRevealCountdown(): void {
  if (revealCountdownIntervalId !== null) {
    return;
  }

  revealCountdownIntervalId = window.setInterval(() => {
    updateRevealCountdown();
    if (stagedReveals.value.length === 0) {
      if (revealCountdownIntervalId !== null) {
        window.clearInterval(revealCountdownIntervalId);
        revealCountdownIntervalId = null;
      }
    }
  }, 100);
  updateRevealCountdown();
}

function stageResolution(reveals: RevealRecord[]): void {
  const discardAt = Date.now() + revealDurationMs;
  const stagedBatch = reveals.map((reveal) => ({
    ...reveal,
    stageId: `${Date.now()}-${revealSequence++}-${reveal.row}-${reveal.col}-${reveal.layerIndex}`,
    discardAt,
  }));

  stagedReveals.value = [...stagedBatch, ...stagedReveals.value];
  ensureRevealCountdown();

  for (const stagedReveal of stagedBatch) {
    const timeoutId = window.setTimeout(() => {
      const target = stagedReveals.value.find((item) => item.stageId === stagedReveal.stageId);
      if (!target) {
        revealTimeoutIds.delete(timeoutId);
        return;
      }

      discardPile.value = [target, ...discardPile.value].slice(0, 24);
      stagedReveals.value = stagedReveals.value.filter(
        (item) => item.stageId !== stagedReveal.stageId
      );
      updateRevealCountdown();
      revealTimeoutIds.delete(timeoutId);
    }, revealDurationMs);

    revealTimeoutIds.add(timeoutId);
  }
}

function handleReveal(): void {
  if (!store.canReveal) {
    return;
  }

  store.revealSelected();

  const resolution = store.round.lastResolution;
  if (!resolution) {
    return;
  }

  const reveals = [...resolution.playerReveals, ...resolution.dealerReveals];
  if (reveals.length > 0) {
    stageResolution(reveals);
  }
}

function rowAverageLabel(rowIndex: number): string {
  const value = store.rowAverageAccessibleValue(rowIndex);
  return value === null ? 'n/a' : value.toFixed(2);
}

function deckName(deckColor: DeckColor): string {
  return formatDeckColor(deckColor);
}

function deckColorClass(color: string): string {
  switch (color) {
    case 'blue':
      return 'border border-edge-infoSoft bg-feedback-infoFaint text-semantic-info-300';
    case 'orange':
      return 'border border-edge-warningMuted bg-feedback-warningSubtle text-semantic-warning-300';
    case 'red':
      return 'border border-edge-dangerSoft bg-feedback-dangerSubtle text-semantic-danger-300';
    default:
      return 'border border-app-border bg-app-bg text-app-textMuted';
  }
}

function cardValueTextClass(value: number): string {
  if (value >= 10) return 'text-semantic-danger-300';
  if (value >= 5) return 'text-semantic-warning-300';
  if (value >= 3) return 'text-semantic-success-300';
  if (value >= 1) return 'text-semantic-info-300';
  return 'text-app-textMuted';
}

function betClass(amount: number): string {
  const isActive = amount === store.pendingBet;
  const isDisabled = amount > store.maxBet;

  if (isDisabled) {
    return 'cursor-not-allowed border-app-border bg-depth-baseFaint text-app-textMuted opacity-35';
  }

  if (isActive) {
    return 'border-semantic-warning-300 bg-incremental-warningBgHover text-white shadow-lg shadow-semantic-warning-900/25';
  }

  return 'border-app-border bg-depth-panel text-app-textMuted hover:border-semantic-info-400 hover:text-app-text';
}

onMounted(() => {
  if (store.phase === 'idle') {
    store.previewLevel(1);
  }
});

watch(
  () => [store.currentLevel, store.currentRound, store.phase] as const,
  ([, , phase]) => {
    if (phase === 'deck-preview' || phase === 'idle') {
      clearRevealPresentation();
    }
  }
);

onBeforeUnmount(() => {
  clearRevealPresentation();
});

defineOptions({
  name: 'DevGame',
});
</script>

<style scoped>
.hud-pill {
  @apply grid gap-[0.15rem] rounded-full px-[0.95rem] py-[0.65rem] text-[0.72rem] text-app-textMuted uppercase tracking-[0.16em];
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 13, 18, 0.7);
}

.hud-pill strong {
  @apply text-[0.78rem] tracking-normal;
  color: #f5f7fb;
}

.hud-pill--bank strong {
  @apply text-semantic-success-300;
}

.meta-chip,
.deck-chip {
  @apply rounded-full px-[0.8rem] py-[0.55rem] text-[0.72rem];
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 13, 18, 0.68);
  color: #c9d2de;
}

.summary-card {
  @apply grid gap-[0.35rem] rounded-[1.4rem] px-[1.1rem] py-4;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 13, 18, 0.45);
}

.summary-card span {
  @apply text-[0.72rem] text-app-textMuted uppercase tracking-[0.18em];
}

.summary-card strong {
  @apply text-[1.05rem];
  color: #f5f7fb;
}

.primary-button,
.secondary-button {
  @apply rounded-2xl px-[1.2rem] py-[0.9rem] text-[0.92rem] font-extrabold transition-all;
}

.primary-button {
  color: white;
  border: 1px solid rgba(125, 211, 252, 0.3);
  background: rgba(14, 116, 144, 0.92);
}

.primary-button:hover:not(:disabled) {
  @apply -translate-y-px;
  background: rgba(8, 145, 178, 0.92);
}

.primary-button:disabled {
  @apply cursor-not-allowed opacity-[0.45];
}

.secondary-button {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 13, 18, 0.7);
  color: #c9d2de;
}

.secondary-button:hover {
  @apply -translate-y-px;
  color: #f5f7fb;
}

.support-row {
  @apply flex items-center justify-between gap-4 rounded-2xl px-[0.95rem] py-[0.8rem];
  background: rgba(9, 13, 18, 0.55);
}

.support-row span {
  @apply text-app-textMuted;
}

.support-row strong {
  color: #f5f7fb;
}

.result-shell {
  @apply grid gap-5 rounded-[2rem] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.18)];
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(19, 24, 31, 0.92);
}

.result-header {
  @apply grid gap-2;
}

.result-kicker {
  @apply text-[0.72rem] font-bold uppercase tracking-[0.24em] text-app-textMuted;
}

.result-title {
  @apply text-[1.8rem] font-black;
  color: #f5f7fb;
}

.result-copy {
  @apply max-w-[42rem] text-[0.95rem] leading-[1.6] text-app-textMuted;
}

.result-stats {
  @apply grid gap-3 md:grid-cols-2;
}
</style>
