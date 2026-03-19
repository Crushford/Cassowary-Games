<template>
  <div
    class="w-full max-w-[480px] mx-auto bg-app-bgAlt text-app-text bg-[radial-gradient(120%_120%_at_50%_-15%,var(--tw-gradient-from)_0%,var(--tw-gradient-to)_55%)] from-ballarat-gradientStart to-app-bgAlt flex flex-col overflow-hidden h-dvh"
    data-game="ballarat"
  >
    <!-- ── Header ──────────────────────────────────────────────────────────── -->
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

      <h1 class="text-sm font-bold text-ballarat-title tracking-widest uppercase">Ballarat</h1>

      <div v-if="store.phase !== 'idle'" class="flex items-center gap-2">
        <span class="text-app-textMuted text-xs tabular-nums">
          Lvl {{ store.currentLevel }} · R{{ store.currentRound }}/{{ store.roundsPerLevel }}
        </span>
        <span class="font-bold text-semantic-success-400 tabular-nums text-sm">
          🪙 {{ store.bank }}
        </span>
      </div>
      <div v-else class="w-20" />
    </div>

    <!-- ── IDLE: Start screen ──────────────────────────────────────────────── -->
    <div v-if="store.phase === 'idle'" class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-sm space-y-6">
        <!-- Fanned cards decoration -->
        <div class="flex justify-center items-end gap-1 h-20">
          <div
            v-for="(rotation, i) in [-12, -6, 0, 6, 12]"
            :key="i"
            class="w-12 h-18 rounded-lg border-2 border-semantic-info-600 bg-gradient-to-br from-semantic-info-800 to-semantic-info-900 shadow-lg"
            :style="{ transform: `rotate(${rotation}deg) translateY(${Math.abs(rotation) / 4}px)` }"
          />
        </div>

        <div class="text-center">
          <h2 class="text-2xl font-bold text-ballarat-title mb-2">Ballarat</h2>
          <p class="text-app-textMuted text-sm leading-relaxed">
            A probability and betting game. The deck is open — use the odds.
          </p>
        </div>

        <div
          class="rounded-xl border border-app-border bg-app-surface p-4 space-y-2 text-sm text-app-textMuted"
        >
          <p>
            • Deck contains <span class="text-app-text font-semibold">5 cards: 3, 2, 0, 0, 0</span>
          </p>
          <p>• Choose a bet of 1–5 coins before each reveal</p>
          <p>• Payout = card value × bet (0 card = nothing back)</p>
          <p>
            • Complete <span class="text-app-text font-semibold">3 rounds</span> to finish Level 1
          </p>
          <p>• Bank hits 0 = game over — start from the beginning</p>
        </div>

        <button
          class="w-full py-3 rounded-xl font-bold text-ballarat-accentText bg-ballarat-accentBg hover:bg-ballarat-accentBgHover border border-ballarat-accentBorder transition-all active:translate-y-px"
          @click="store.startGame()"
        >
          Start Game
        </button>
      </div>
    </div>

    <!-- ── DECK PREVIEW: Study the composition ────────────────────────────── -->
    <div
      v-else-if="store.phase === 'deck-preview'"
      class="flex-1 flex flex-col p-5 gap-5 overflow-y-auto"
    >
      <div class="text-center pt-2">
        <h2 class="text-lg font-bold text-app-text">
          Round {{ store.currentRound }} of {{ store.roundsPerLevel }}
        </h2>
        <p class="text-sm text-app-textMuted mt-1">
          Study the deck. It will be shuffled before play begins.
        </p>
      </div>

      <!-- Face-up cards showing deck composition -->
      <div class="flex gap-3 justify-center">
        <div
          v-for="(value, i) in store.deckDefinition.cards"
          :key="i"
          class="w-[72px] h-24 rounded-xl border-2 border-app-border bg-app-surface flex items-center justify-center shadow-md"
        >
          <span :class="cardValueTextClass(value)" class="text-4xl font-black leading-none">
            {{ value }}
          </span>
        </div>
      </div>

      <!-- Deck stats -->
      <div class="rounded-xl border border-app-border bg-app-surface p-4 text-sm space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-app-textMuted">Cards in deck</span>
          <span class="text-app-text font-semibold">{{ store.deckDefinition.cards.length }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-app-textMuted">Average value</span>
          <span class="text-app-text font-semibold tabular-nums">
            {{ deckAverage.toFixed(1) }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-app-textMuted">Positive cards</span>
          <span class="text-app-text font-semibold">
            {{ store.deckDefinition.cards.filter((v) => v > 0).length }} of
            {{ store.deckDefinition.cards.length }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-app-textMuted">Your bank</span>
          <span class="text-semantic-success-400 font-bold tabular-nums">🪙 {{ store.bank }}</span>
        </div>
      </div>

      <div class="mt-auto">
        <button
          class="w-full py-3 rounded-xl font-bold text-ballarat-accentText bg-ballarat-accentBg hover:bg-ballarat-accentBgHover border border-ballarat-accentBorder transition-all active:translate-y-px"
          @click="store.beginRound()"
        >
          Begin Round {{ store.currentRound }}
        </button>
      </div>
    </div>

    <!-- ── PLAYING: Main game loop ─────────────────────────────────────────── -->
    <div v-else-if="store.phase === 'playing'" class="flex-1 overflow-y-auto flex flex-col">
      <div class="p-4 space-y-4">
        <!-- Cards row -->
        <div class="flex gap-2 justify-center py-2">
          <div
            v-for="i in store.totalCardsInRound"
            :key="i - 1"
            :class="cardClass(i - 1)"
            class="w-[72px] h-24 rounded-xl border-2 flex items-center justify-center shadow-md transition-all duration-200 select-none"
          >
            <template v-if="i - 1 < store.currentCardIndex">
              <!-- Revealed -->
              <span
                :class="cardValueTextClass(store.shuffledCards[i - 1])"
                class="text-4xl font-black leading-none"
              >
                {{ store.shuffledCards[i - 1] }}
              </span>
            </template>
            <template v-else-if="i - 1 === store.currentCardIndex">
              <!-- Active: face-down with subtle inner frame -->
              <div class="w-12 h-16 rounded-lg border border-semantic-info-600 opacity-40" />
            </template>
            <template v-else>
              <!-- Upcoming: face-down -->
              <div class="w-12 h-16 rounded-lg border border-semantic-info-700 opacity-25" />
            </template>
          </div>
        </div>

        <!-- Last payout feedback -->
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

        <!-- Bet selector -->
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

        <!-- Reveal button -->
        <button
          :disabled="!store.canReveal"
          class="w-full py-3 rounded-xl font-bold text-ballarat-accentText bg-ballarat-accentBg hover:bg-ballarat-accentBgHover border border-ballarat-accentBorder transition-all active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
          @click="store.revealNext()"
        >
          Reveal (bet {{ store.pendingBet }})
        </button>

        <!-- ── Deck Analysis Support Panel ──────────────────────────────── -->
        <div class="rounded-xl border border-app-border bg-app-surface overflow-hidden">
          <button
            class="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-app-text"
            @click="showSupport = !showSupport"
          >
            <span>Deck Analysis</span>
            <span class="text-app-textMuted text-xs">{{ showSupport ? '▲' : '▼' }}</span>
          </button>

          <div v-if="showSupport" class="px-4 pb-4 space-y-4 border-t border-app-border pt-3">
            <!-- Known deck cards with revealed marking -->
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
                  <!-- Cross-out overlay for revealed cards -->
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

            <!-- Remaining stats -->
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

    <!-- ── ROUND COMPLETE ─────────────────────────────────────────────────── -->
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

      <!-- Per-card results -->
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

      <!-- Round summary -->
      <div class="rounded-xl border border-app-border bg-app-surface p-4 space-y-2 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-app-textMuted">Round P&L</span>
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

      <div class="mt-auto">
        <button
          class="w-full py-3 rounded-xl font-bold text-ballarat-accentText bg-ballarat-accentBg hover:bg-ballarat-accentBgHover border border-ballarat-accentBorder transition-all active:translate-y-px"
          @click="store.nextRound()"
        >
          Next Round →
        </button>
      </div>
    </div>

    <!-- ── LEVEL COMPLETE ─────────────────────────────────────────────────── -->
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

      <!-- Final round card results -->
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

      <p class="text-app-textMuted text-sm text-center italic">More levels coming soon…</p>

      <div class="w-full mt-auto">
        <button
          class="w-full py-3 rounded-xl font-bold text-ballarat-accentText bg-ballarat-accentBg hover:bg-ballarat-accentBgHover border border-ballarat-accentBorder transition-all active:translate-y-px"
          @click="store.restartGame()"
        >
          Play Again
        </button>
      </div>
    </div>

    <!-- ── GAME OVER ───────────────────────────────────────────────────────── -->
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

      <div class="w-full mt-auto">
        <button
          class="w-full py-3 rounded-xl font-bold text-semantic-danger-100 bg-semantic-danger-800 hover:bg-semantic-danger-700 border border-semantic-danger-600 transition-all active:translate-y-px"
          @click="store.restartGame()"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBallaratStore } from '@/stores/ballaratStore';

const store = useBallaratStore();

const showSupport = ref(true);

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

function cardValueTextClass(value: number): string {
  if (value === 3) return 'text-semantic-success-400';
  if (value === 2) return 'text-semantic-info-400';
  return 'text-app-textMuted';
}

function cardClass(index: number): string {
  if (index < store.currentCardIndex) {
    // Revealed
    return 'border-app-border bg-app-surface';
  } else if (index === store.currentCardIndex) {
    // Active — next to be revealed
    return 'border-semantic-info-500 bg-gradient-to-br from-semantic-info-800 to-semantic-info-900 ring-2 ring-semantic-info-400 ring-offset-1 ring-offset-app-bgAlt shadow-lg';
  } else {
    // Upcoming face-down
    return 'border-semantic-info-700 bg-gradient-to-br from-semantic-info-800 to-semantic-info-900 opacity-60';
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

defineOptions({ name: 'BallaratGame' });
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

/* card fan in idle screen */
.h-18 {
  height: 4.5rem;
}
</style>
