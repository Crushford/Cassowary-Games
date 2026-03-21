<template>
  <div
    class="w-full max-w-[480px] mx-auto bg-app-bgAlt text-app-text bg-[radial-gradient(120%_120%_at_50%_-15%,var(--tw-gradient-from)_0%,var(--tw-gradient-to)_55%)] from-depth-gradientStart to-app-bgAlt flex flex-col overflow-hidden h-dvh"
    data-game="depth"
  >
    <div
      class="flex-none px-4 py-3 border-b border-app-border flex items-center justify-between gap-3"
    >
      <router-link
        to="/"
        class="text-app-textMuted hover:text-app-text transition-colors text-sm flex items-center gap-1 leading-none"
        aria-label="Back to home"
      >
        ← Home
      </router-link>

      <h1 class="text-sm font-bold text-depth-title tracking-widest uppercase">Depth</h1>

      <div v-if="!showLevelSelect" class="flex items-center gap-2">
        <span class="text-app-textMuted text-xs tabular-nums">
          Lvl {{ store.currentLevel }} · R{{ store.currentRound }}/{{ store.roundsPerLevel }}
        </span>
        <span class="font-bold text-semantic-success-400 tabular-nums text-sm">
          🪙 {{ store.bank }}
        </span>
      </div>
      <router-link
        v-else
        to="/depth/dev"
        class="text-app-textMuted hover:text-app-text transition-colors text-xs"
      >
        Dev
      </router-link>
    </div>

    <div v-if="showLevelSelect" class="flex-1 overflow-y-auto p-5">
      <div class="space-y-5 pb-6">
        <div class="text-center pt-2">
          <h2 class="text-2xl font-bold text-depth-title">Choose a Level</h2>
          <p class="text-sm text-app-textMuted mt-2 leading-relaxed">
            Each level changes the board size, reveal rule, and deck mix. Pick one, review the
            rules, then start the round.
          </p>
        </div>

        <div
          v-if="canContinueSavedGame"
          class="rounded-2xl border border-semantic-info-700 bg-app-surface p-4 space-y-4"
        >
          <div>
            <div class="text-xs text-app-textMuted uppercase tracking-wide font-semibold">
              Saved Run
            </div>
            <p class="mt-2 text-sm text-app-text leading-relaxed">
              Continue {{ store.savedSessionSummary?.levelName }} on round
              {{ store.savedSessionSummary?.currentRound }} with
              <span class="font-bold text-semantic-success-400">
                🪙 {{ store.savedSessionSummary?.bank }}
              </span>
              in the bank.
            </p>
          </div>

          <div class="flex gap-2">
            <button
              class="flex-1 py-3 rounded-xl font-bold text-depth-accentText bg-depth-accentBg hover:bg-depth-accentBgHover border border-depth-accentBorder transition-all active:translate-y-px"
              @click="continueSavedGame()"
            >
              Continue Game
            </button>
            <button
              class="flex-1 py-3 rounded-xl font-bold text-app-text bg-app-bg hover:bg-app-surface border border-app-border transition-all active:translate-y-px"
              @click="startOver()"
            >
              Start Over
            </button>
          </div>
        </div>

        <div
          v-for="level in presetLevels"
          :key="level.id"
          class="rounded-2xl border border-app-border bg-app-surface p-4 space-y-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-1 rounded-full bg-app-bg text-app-textMuted text-xs font-bold">
                  Level {{ level.id }}
                </span>
                <h3 class="text-lg font-bold text-app-text">{{ level.name }}</h3>
              </div>
              <p v-if="level.description" class="text-sm text-app-textMuted mt-2 leading-relaxed">
                {{ level.description }}
              </p>
            </div>
            <span class="text-xs uppercase tracking-wide text-app-textMuted">
              {{ level.turnRule }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs text-app-textMuted">
            <div class="rounded-xl bg-app-bg px-3 py-2">
              Board {{ level.rows }}×{{ level.columns }}×{{ level.depth }}
            </div>
            <div class="rounded-xl bg-app-bg px-3 py-2">Rounds {{ level.rounds }}</div>
            <div class="rounded-xl bg-app-bg px-3 py-2">
              Bet {{ level.minBet }}-{{ level.maxBet }}
            </div>
            <div class="rounded-xl bg-app-bg px-3 py-2">Bank {{ level.startingBank }}</div>
          </div>

          <div class="rounded-xl border border-app-border bg-app-bg p-3 space-y-2">
            <div class="text-xs text-app-textMuted uppercase tracking-wide font-semibold">
              Level Rules
            </div>
            <p
              v-for="(rule, index) in describeLevelRules(level)"
              :key="`${level.id}-rule-${index}`"
              class="text-sm text-app-textMuted leading-relaxed"
            >
              • {{ rule }}
            </p>
          </div>

          <button
            class="w-full py-3 rounded-xl font-bold text-depth-accentText bg-depth-accentBg hover:bg-depth-accentBgHover border border-depth-accentBorder transition-all active:translate-y-px"
            @click="selectLevel(level.id)"
          >
            Select Level {{ level.id }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-else-if="store.phase === 'deck-preview'"
      class="flex-1 flex flex-col p-5 gap-5 overflow-y-auto"
    >
      <div class="text-center pt-2">
        <h2 class="text-lg font-bold text-app-text">{{ selectedLevel?.name }}</h2>
        <p class="text-sm text-app-textMuted mt-1">
          Round {{ store.currentRound }} of {{ store.roundsPerLevel }}
        </p>
      </div>

      <div class="rounded-xl border border-app-border bg-app-surface p-4 space-y-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-app-textMuted">Board</span>
          <span class="text-app-text font-semibold">
            {{ selectedLevel?.rows }}×{{ selectedLevel?.columns }}×{{ selectedLevel?.depth }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-app-textMuted">Rule</span>
          <span class="text-app-text font-semibold">{{ selectedLevel?.turnRule }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-app-textMuted">Your bank</span>
          <span class="text-semantic-success-400 font-bold tabular-nums">🪙 {{ store.bank }}</span>
        </div>
      </div>

      <div class="rounded-xl border border-app-border bg-app-surface p-4 space-y-3">
        <div class="text-xs text-app-textMuted uppercase tracking-wide font-semibold">
          Primary deck composition
        </div>
        <div class="flex gap-3 justify-center">
          <div
            v-for="(value, i) in store.deckDefinition.cards"
            :key="i"
            class="w-[64px] h-20 rounded-xl border-2 border-app-border bg-app-bg flex items-center justify-center shadow-md"
          >
            <span :class="cardValueTextClass(value)" class="text-3xl font-black leading-none">
              {{ value }}
            </span>
          </div>
        </div>
        <div class="text-sm text-app-textMuted leading-relaxed">
          {{ selectedLevel?.description }}
        </div>
      </div>

      <div class="rounded-xl border border-app-border bg-app-surface p-4 space-y-2">
        <div class="text-xs text-app-textMuted uppercase tracking-wide font-semibold">
          Rules for this level
        </div>
        <p
          v-for="(rule, index) in selectedRules"
          :key="`selected-rule-${index}`"
          class="text-sm text-app-textMuted leading-relaxed"
        >
          • {{ rule }}
        </p>
      </div>

      <div class="mt-auto flex gap-2">
        <button
          class="flex-1 py-3 rounded-xl font-bold text-app-text bg-app-surface hover:bg-app-bg border border-app-border transition-all active:translate-y-px"
          @click="returnToLevelSelect()"
        >
          Change Level
        </button>
        <button
          class="flex-1 py-3 rounded-xl font-bold text-depth-accentText bg-depth-accentBg hover:bg-depth-accentBgHover border border-depth-accentBorder transition-all active:translate-y-px"
          @click="store.beginRound()"
        >
          Begin Round
        </button>
      </div>
    </div>

    <div v-else-if="store.phase === 'playing'" class="flex-1 overflow-y-auto flex flex-col">
      <div class="p-4 space-y-4">
        <div class="rounded-xl border border-app-border bg-app-surface p-4">
          <div class="text-xs text-app-textMuted uppercase tracking-wide font-semibold mb-2">
            Instruction
          </div>
          <p class="text-sm text-app-textMuted leading-relaxed">
            {{ levelInstruction }}
          </p>
        </div>

        <div
          class="grid gap-1 py-2"
          :style="{
            gridTemplateColumns: `repeat(${Math.max(1, store.level.columns)}, minmax(0, 1fr))`,
          }"
        >
          <button
            v-for="stack in displayStacks"
            :key="`${stack.row}-${stack.col}`"
            type="button"
            :disabled="!isPlayableStack(stack)"
            :class="stackCardClass(stack)"
            class="aspect-square w-full rounded-lg border flex items-center justify-center shadow-sm transition-all duration-200 select-none disabled:cursor-not-allowed"
            @click="handleStackClick(stack)"
          >
            <template v-if="stagedRevealFor(stack)">
              <div class="flip-card h-[78%] w-[78%]">
                <div class="flip-card__inner flip-card__inner--flipped">
                  <div
                    class="flip-card__face flip-card__face--back"
                    :class="cardBackColorClass(stagedRevealFor(stack)?.backingColor ?? '')"
                  />
                  <div class="flip-card__face flip-card__face--front bg-app-surface">
                    <span
                      :class="[
                        cardFrontAccentClass(stagedRevealFor(stack)?.backingColor ?? ''),
                        cardValueSizeClass,
                      ]"
                      class="font-black leading-none"
                    >
                      {{ stagedRevealFor(stack)?.cardValue }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="topCardForDisplay(stack)">
              <div
                :class="cardBackColorClass(topCardForDisplay(stack)?.backingColor ?? '')"
                class="h-[72%] w-[72%] rounded-md"
              />
            </template>
            <template v-else-if="stack.cards.some((card) => card.revealed)">
              <div class="text-[9px] font-semibold uppercase tracking-[0.18em] text-app-textMuted">
                Cleared
              </div>
            </template>
            <template v-else>
              <div
                :class="cardBackColorClass(topCardForDisplay(stack)?.backingColor ?? '')"
                class="h-[72%] w-[72%] rounded-md opacity-35"
              />
            </template>
          </button>
        </div>

        <div class="h-6 flex items-center justify-center">
          <transition name="fade">
            <span
              v-if="store.lastPayoutDelta !== null"
              :key="store.currentCardIndex"
              :class="[
                'text-sm font-semibold tabular-nums',
                store.lastPayoutDelta > 0
                  ? 'text-semantic-success-400'
                  : store.lastPayoutDelta < 0
                    ? 'text-semantic-danger-400'
                    : 'text-app-textMuted',
              ]"
            >
              {{ store.lastPayoutDelta > 0 ? '+' : '' }}{{ store.lastPayoutDelta }} coins
            </span>
          </transition>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs text-app-textMuted">
            <span>Bet amount</span>
            <span
              >{{ store.cardsRemaining }} card{{
                store.cardsRemaining !== 1 ? 's' : ''
              }}
              remaining</span
            >
          </div>
          <div class="flex gap-2 justify-between">
            <button
              v-for="amount in 5"
              :key="amount"
              :disabled="amount > store.maxBet"
              :class="betClass(amount)"
              class="flex-1 h-12 rounded-xl font-bold text-lg transition-all active:translate-y-px disabled:cursor-not-allowed"
              @click="store.setPendingBet(amount)"
            >
              {{ amount }}
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-app-border bg-app-surface overflow-hidden">
          <button
            class="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-app-text"
            @click="showSupport = !showSupport"
          >
            <span>Deck Analysis</span>
            <span class="text-app-textMuted text-xs">{{ showSupport ? '▲' : '▼' }}</span>
          </button>

          <div v-if="showSupport" class="px-4 pb-4 space-y-4 border-t border-app-border pt-3">
            <div>
              <div class="text-xs text-app-textMuted mb-2 uppercase tracking-wide font-semibold">
                Known composition
              </div>
              <div class="flex gap-2">
                <div
                  v-for="card in store.supportPanelCards"
                  :key="card.idx"
                  :class="[
                    'relative w-12 h-16 rounded-lg border-2 flex items-center justify-center text-2xl font-black leading-none transition-all',
                    card.isRevealed
                      ? 'border-app-border bg-app-bg opacity-40'
                      : 'border-app-border bg-app-surface',
                  ]"
                >
                  <span :class="cardValueTextClass(card.value)">{{ card.value }}</span>
                  <div
                    v-if="card.isRevealed"
                    class="absolute inset-0 pointer-events-none"
                    aria-hidden="true"
                  >
                    <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line
                        x1="10"
                        y1="10"
                        x2="90"
                        y2="90"
                        stroke="currentColor"
                        stroke-width="6"
                        class="text-app-textMuted"
                      />
                      <line
                        x1="90"
                        y1="10"
                        x2="10"
                        y2="90"
                        stroke="currentColor"
                        stroke-width="6"
                        class="text-app-textMuted"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-app-textMuted">Cards remaining</span>
                <span class="text-app-text font-semibold tabular-nums">{{
                  store.cardsRemaining
                }}</span>
              </div>
              <div
                v-if="store.averageRemainingValue !== null"
                class="flex items-center justify-between"
              >
                <span class="text-app-textMuted">Average remaining value</span>
                <span :class="averageValueClass" class="font-bold tabular-nums">
                  {{ store.averageRemainingValue.toFixed(2) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="store.phase === 'round-complete'"
      class="flex-1 overflow-y-auto flex flex-col p-5 gap-4"
    >
      <div class="text-center pt-2">
        <div class="text-4xl mb-2">✓</div>
        <h2 class="text-xl font-bold text-semantic-success-400">
          Round {{ store.currentRound }} Complete
        </h2>
        <p class="text-sm text-app-textMuted mt-1">
          Round {{ store.currentRound + 1 }} of {{ store.roundsPerLevel }} coming up.
        </p>
      </div>

      <div class="rounded-xl border border-app-border bg-app-surface p-4 space-y-2">
        <div class="text-xs text-app-textMuted uppercase tracking-wide font-semibold mb-3">
          Round results
        </div>
        <div
          v-for="(card, i) in store.revealedCards"
          :key="i"
          class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 text-sm"
        >
          <span class="text-app-textMuted text-xs">{{ i + 1 }}</span>
          <span :class="cardValueTextClass(card.value)" class="font-bold text-base">
            {{ card.value }}
          </span>
          <span class="text-app-textMuted text-xs">× {{ card.bet }} = {{ card.payout }}</span>
          <span
            :class="
              card.net > 0
                ? 'text-semantic-success-400'
                : card.net < 0
                  ? 'text-semantic-danger-400'
                  : 'text-app-textMuted'
            "
            class="text-xs font-semibold tabular-nums"
          >
            {{ card.net > 0 ? '+' : '' }}{{ card.net }}
          </span>
        </div>
      </div>

      <div class="rounded-xl border border-app-border bg-app-surface p-4 space-y-2 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-app-textMuted">Round P&amp;L</span>
          <span
            :class="
              store.roundProfit >= 0 ? 'text-semantic-success-400' : 'text-semantic-danger-400'
            "
            class="font-bold tabular-nums"
          >
            {{ store.roundProfit >= 0 ? '+' : '' }}{{ store.roundProfit }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-app-textMuted"
            >Bank going in to Round {{ store.currentRound + 1 }}</span
          >
          <span class="text-semantic-success-400 font-bold tabular-nums">🪙 {{ store.bank }}</span>
        </div>
      </div>

      <div class="mt-auto flex gap-2">
        <button
          class="flex-1 py-3 rounded-xl font-bold text-app-text bg-app-surface hover:bg-app-bg border border-app-border transition-all active:translate-y-px"
          @click="returnToLevelSelect()"
        >
          Levels
        </button>
        <button
          class="flex-1 py-3 rounded-xl font-bold text-depth-accentText bg-depth-accentBg hover:bg-depth-accentBgHover border border-depth-accentBorder transition-all active:translate-y-px"
          @click="store.nextRound()"
        >
          Next Round →
        </button>
      </div>
    </div>

    <div
      v-else-if="store.phase === 'level-complete'"
      class="flex-1 overflow-y-auto flex flex-col items-center p-5 gap-5"
    >
      <div class="text-center pt-4">
        <div class="text-5xl mb-3">🎉</div>
        <h2 class="text-2xl font-bold text-semantic-success-400">Level Complete!</h2>
        <p class="text-app-textMuted text-sm mt-1">
          You completed all {{ store.roundsPerLevel }} rounds.
        </p>
        <div class="text-semantic-success-400 font-bold text-xl tabular-nums mt-3">
          Final Bank: 🪙 {{ store.bank }}
        </div>
      </div>

      <div class="w-full rounded-xl border border-app-border bg-app-surface p-4 space-y-2">
        <div class="text-xs text-app-textMuted uppercase tracking-wide font-semibold mb-3">
          Final round
        </div>
        <div
          v-for="(card, i) in store.revealedCards"
          :key="i"
          class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 text-sm"
        >
          <span class="text-app-textMuted text-xs">{{ i + 1 }}</span>
          <span :class="cardValueTextClass(card.value)" class="font-bold text-base">
            {{ card.value }}
          </span>
          <span class="text-app-textMuted text-xs">× {{ card.bet }} = {{ card.payout }}</span>
          <span
            :class="
              card.net > 0
                ? 'text-semantic-success-400'
                : card.net < 0
                  ? 'text-semantic-danger-400'
                  : 'text-app-textMuted'
            "
            class="text-xs font-semibold tabular-nums"
          >
            {{ card.net > 0 ? '+' : '' }}{{ card.net }}
          </span>
        </div>
      </div>

      <div class="w-full mt-auto flex gap-2">
        <button
          class="flex-1 py-3 rounded-xl font-bold text-app-text bg-app-surface hover:bg-app-bg border border-app-border transition-all active:translate-y-px"
          @click="returnToLevelSelect()"
        >
          Levels
        </button>
        <button
          v-if="hasNextLevel"
          class="flex-1 py-3 rounded-xl font-bold text-depth-accentText bg-depth-accentBg hover:bg-depth-accentBgHover border border-depth-accentBorder transition-all active:translate-y-px"
          @click="goToNextLevel()"
        >
          Next Level
        </button>
        <button
          v-else
          class="flex-1 py-3 rounded-xl font-bold text-depth-accentText bg-depth-accentBg hover:bg-depth-accentBgHover border border-depth-accentBorder transition-all active:translate-y-px"
          @click="replayLevel()"
        >
          Replay
        </button>
      </div>
    </div>

    <div
      v-else-if="store.phase === 'game-over'"
      class="flex-1 overflow-y-auto flex flex-col items-center p-5 gap-5"
    >
      <div class="text-center pt-4">
        <div class="text-5xl mb-3">💸</div>
        <h2 class="text-2xl font-bold text-semantic-danger-400">Bankrupt</h2>
        <p class="text-app-textMuted text-sm mt-1">
          Your bank hit zero on Round {{ store.currentRound }}.
        </p>
      </div>

      <div class="w-full rounded-xl border border-app-border bg-app-surface p-4 space-y-2">
        <div class="text-xs text-app-textMuted uppercase tracking-wide font-semibold mb-3">
          Final cards revealed
        </div>
        <div
          v-for="(card, i) in store.revealedCards"
          :key="i"
          class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 text-sm"
        >
          <span class="text-app-textMuted text-xs">{{ i + 1 }}</span>
          <span :class="cardValueTextClass(card.value)" class="font-bold text-base">
            {{ card.value }}
          </span>
          <span class="text-app-textMuted text-xs">× {{ card.bet }} = {{ card.payout }}</span>
          <span
            :class="
              card.net > 0
                ? 'text-semantic-success-400'
                : card.net < 0
                  ? 'text-semantic-danger-400'
                  : 'text-app-textMuted'
            "
            class="text-xs font-semibold tabular-nums"
          >
            {{ card.net > 0 ? '+' : '' }}{{ card.net }}
          </span>
        </div>
      </div>

      <div class="w-full mt-auto flex gap-2">
        <button
          class="flex-1 py-3 rounded-xl font-bold text-app-text bg-app-surface hover:bg-app-bg border border-app-border transition-all active:translate-y-px"
          @click="returnToLevelSelect()"
        >
          Levels
        </button>
        <button
          class="flex-1 py-3 rounded-xl font-bold text-semantic-danger-100 bg-semantic-danger-800 hover:bg-semantic-danger-700 border border-semantic-danger-600 transition-all active:translate-y-px"
          @click="replayLevel()"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { DEPTH_LEVELS } from '@/games/depth/game/constants/levels';
import type {
  BuiltLevelDefinition,
  CardState,
  RevealRecord,
  StackState,
  TurnRuleType,
} from '@/games/depth/game/types';
import { useDepthStore } from '@/games/depth/stores/depth';

const store = useDepthStore();
const route = useRoute();
const router = useRouter();
const presetLevels = DEPTH_LEVELS;
const selectedLevelId = ref<number | null>(null);
const showSupport = ref(true);
const stagedReveals = ref<Array<RevealRecord & { stageId: string }>>([]);
const stagedRevealTimeoutIds = new Set<number>();

const showLevelSelect = computed(() => selectedLevelId.value === null || store.phase === 'idle');
const selectedLevel = computed(
  () => presetLevels.find((level) => level.id === selectedLevelId.value) ?? null
);
const canContinueSavedGame = computed(
  () => store.savedSessionSummary !== null && store.savedSessionSummary.levelSource === 'catalog'
);
const selectedRules = computed(() =>
  selectedLevel.value ? describeLevelRules(selectedLevel.value) : []
);
const deckAverage = computed(() => {
  const cards = store.deckDefinition.cards;
  return cards.reduce((a, b) => a + b, 0) / cards.length;
});
const averageValueClass = computed(() => {
  const avg = store.averageRemainingValue;
  if (avg === null) return 'text-app-textMuted';
  if (avg >= 1.5) return 'text-semantic-success-400';
  if (avg >= 0.5) return 'text-semantic-warning-400';
  return 'text-semantic-danger-400';
});
const hasNextLevel = computed(() =>
  presetLevels.some((level) => level.id === (selectedLevelId.value ?? 0) + 1)
);
const displayStacks = computed(() => store.board?.stacks.flat() ?? []);
const levelInstruction = computed(() => {
  if (store.level.id === 1) {
    return 'Adjust your bet and then select any card to bet on until you have bet on all cards.';
  }

  if (store.level.turnRule === 'column-choice-reveal') {
    const columnNumber = (store.activeColumnIndex ?? 0) + 1;
    return `Adjust your bet and then select any card in column ${columnNumber} to bet on.`;
  }

  if (store.level.turnRule === 'dealer-follow-up') {
    return 'Adjust your bet and then select any available card to bet on. The dealer will reveal an extra card after your pick.';
  }

  if (store.level.turnRule === 'column-reveal') {
    const columnNumber = (store.activeColumnIndex ?? 0) + 1;
    return `Adjust your bet and then select any card in column ${columnNumber} to reveal the whole column.`;
  }

  return 'Adjust your bet and then select any available card to bet on.';
});

function selectLevel(levelId: number): void {
  router.push({ name: 'depth-level', params: { levelId } });
}

function loadLevelFromRoute(levelId: number): void {
  selectedLevelId.value = levelId;
  showSupport.value = true;
  store.previewLevel(levelId);
}

function replayLevel(): void {
  if (selectedLevelId.value === null) {
    returnToLevelSelect();
    return;
  }
  showSupport.value = true;
  store.previewLevel(selectedLevelId.value);
}

function goToNextLevel(): void {
  if (!hasNextLevel.value || selectedLevelId.value === null) {
    return;
  }
  selectLevel(selectedLevelId.value + 1);
}

function returnToLevelSelect(): void {
  router.push({ name: 'depth-levels' });
}

function continueSavedGame(): void {
  const resumed = store.continueSavedSession();
  if (!resumed) {
    return;
  }

  selectedLevelId.value = store.currentLevel;
  router.push({ name: 'depth-level', params: { levelId: store.currentLevel } });
}

function startOver(): void {
  selectedLevelId.value = null;
  showSupport.value = true;
  store.restartGame();
}

function describeLevelRules(level: BuiltLevelDefinition): string[] {
  const rules = [
    `The board is ${level.rows} rows by ${level.columns} columns with depth ${level.depth}.`,
    `You play ${level.rounds} rounds with a starting bank of ${level.startingBank} coins.`,
    `Bets must stay between ${level.minBet} and ${level.maxBet} coins.`,
    describeTurnRule(level.turnRule),
  ];

  if (level.dealerEnabled) {
    rules.push('Dealer effects can reveal additional cards after your action.');
  }

  return rules;
}

function describeTurnRule(turnRule: TurnRuleType): string {
  switch (turnRule) {
    case 'column-choice-reveal':
      return 'Choose one card from the active column, then the whole column flips before play moves to the next column.';
    case 'column-reveal':
      return 'Each action resolves a whole column instead of a single stack.';
    case 'dealer-follow-up':
      return 'Your reveal is followed by an extra dealer reveal.';
    default:
      return 'Each action reveals one stack using the current bet.';
  }
}

function cardValueTextClass(value: number): string {
  if (value >= 10) return 'text-semantic-danger-400';
  if (value >= 5) return 'text-semantic-warning-400';
  if (value >= 3) return 'text-semantic-success-400';
  if (value >= 1) return 'text-semantic-info-400';
  return 'text-app-textMuted';
}

function topCardForDisplay(stack: StackState): CardState | null {
  return stack.cards.find((card) => !card.revealed) ?? null;
}

function stagedRevealFor(
  stack: StackState
): (RevealRecord & { stageId: string; backingColor?: string }) | null {
  const stagedReveal = stagedReveals.value.find(
    (reveal) => reveal.row === stack.row && reveal.col === stack.col
  );

  if (!stagedReveal) {
    return null;
  }

  const matchingCard = stack.cards.find((card) => card.layerIndex === stagedReveal.layerIndex);
  return {
    ...stagedReveal,
    backingColor: matchingCard?.backingColor,
  };
}

function isPlayableStack(stack: StackState): boolean {
  if (stagedRevealFor(stack)) {
    return false;
  }

  if (store.level.turnRule === 'column-choice-reveal') {
    return store.activeColumnPositions.some(
      (position) => position.row === stack.row && position.col === stack.col
    );
  }

  return store.accessiblePositions.some(
    (position) => position.row === stack.row && position.col === stack.col
  );
}

function stackCardClass(stack: StackState): string {
  if (stagedRevealFor(stack)) {
    return 'border-app-border bg-app-surface';
  }

  const isActiveColumn = store.activeColumnIndex !== null && stack.col === store.activeColumnIndex;
  const topCard = topCardForDisplay(stack);
  if (!topCard) {
    return 'border-app-border bg-app-surface text-app-textMuted';
  }

  const backColorClass = cardBackColorClass(topCardForDisplay(stack)?.backingColor ?? '');

  if (isPlayableStack(stack)) {
    return `${backColorClass} border-app-border hover:border-semantic-info-400`;
  }

  if (isActiveColumn) {
    return `${backColorClass} border-app-border opacity-70`;
  }

  return `${backColorClass} border-app-border opacity-35`;
}

const cardValueSizeClass = computed(() => {
  if (store.level.columns >= 10) return 'text-sm';
  if (store.level.columns >= 8) return 'text-base';
  if (store.level.columns >= 6) return 'text-lg';
  return 'text-2xl';
});

function cardBackColorClass(color: string): string {
  switch (color) {
    case 'blue':
      return 'bg-semantic-info-700';
    case 'orange':
      return 'bg-semantic-warning-700';
    case 'red':
      return 'bg-semantic-danger-700';
    default:
      return 'bg-app-border';
  }
}

function cardFrontAccentClass(color: string): string {
  switch (color) {
    case 'blue':
      return 'text-semantic-info-400';
    case 'orange':
      return 'text-semantic-warning-400';
    case 'red':
      return 'text-semantic-danger-400';
    default:
      return 'text-app-text';
  }
}

function betClass(amount: number): string {
  const isActive = amount === store.pendingBet;
  const isDisabled = amount > store.maxBet;

  if (isDisabled) {
    return 'bg-app-surface border border-app-border text-app-textMuted opacity-30';
  }
  if (isActive) {
    return 'bg-semantic-info-700 border-2 border-semantic-info-400 text-white shadow-lg';
  }
  return 'bg-app-surface border border-app-border text-app-textMuted hover:bg-app-bg hover:text-app-text';
}

function handleStackClick(stack: StackState): void {
  if (!isPlayableStack(stack)) {
    return;
  }

  store.selectPosition({ row: stack.row, col: stack.col });
  store.revealNext();

  const resolution = store.round.lastResolution;
  if (!resolution) {
    return;
  }

  stageReveals([...resolution.playerReveals, ...resolution.dealerReveals]);
}

function stageReveals(reveals: RevealRecord[]): void {
  const nextStaged = reveals.map((reveal, index) => ({
    ...reveal,
    stageId: `${Date.now()}-${index}-${reveal.row}-${reveal.col}-${reveal.layerIndex}`,
  }));

  stagedReveals.value = [...nextStaged, ...stagedReveals.value];

  for (const stagedReveal of nextStaged) {
    const timeoutId = window.setTimeout(() => {
      stagedReveals.value = stagedReveals.value.filter(
        (item) => item.stageId !== stagedReveal.stageId
      );
      stagedRevealTimeoutIds.delete(timeoutId);
    }, 3000);

    stagedRevealTimeoutIds.add(timeoutId);
  }
}

function clearStagedReveals(): void {
  for (const timeoutId of stagedRevealTimeoutIds) {
    window.clearTimeout(timeoutId);
  }

  stagedRevealTimeoutIds.clear();
  stagedReveals.value = [];
}

watch(
  () => route.name,
  () => {
    if (route.name === 'depth-levels') {
      clearStagedReveals();
      selectedLevelId.value = null;
      showSupport.value = true;
      store.refreshSavedSessionSummary();
      return;
    }

    if (route.name !== 'depth-level') {
      return;
    }

    const levelId = Number(route.params.levelId);
    const levelExists = presetLevels.some((level) => level.id === levelId);

    if (!Number.isInteger(levelId) || !levelExists) {
      router.replace({ name: 'depth-levels' });
      return;
    }

    if (selectedLevelId.value !== levelId) {
      clearStagedReveals();
      loadLevelFromRoute(levelId);
    }
  },
  { immediate: true }
);

watch(
  () => store.phase,
  (phase) => {
    if (phase === 'deck-preview' || phase === 'idle') {
      clearStagedReveals();
    }
  }
);

onBeforeUnmount(() => {
  clearStagedReveals();
});

store.initializePersistence();

defineOptions({
  name: 'Game',
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.h-18 {
  height: 4.5rem;
}

.flip-card {
  perspective: 800px;
}

.flip-card__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.flip-card__inner--flipped {
  transform: rotateY(180deg);
}

.flip-card__face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  backface-visibility: hidden;
}

.flip-card__face--front {
  transform: rotateY(180deg);
}
</style>
