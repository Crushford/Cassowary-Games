<template>
  <section
    class="rounded-3xl border border-app-border bg-depth-panel p-4 shadow-xl shadow-black/10"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-app-textMuted">
          Preset Levels
        </p>
        <h2 class="mt-1 text-lg font-black text-app-text">Depth Ladder</h2>
      </div>
      <span class="rounded-full border border-app-border px-2 py-1 text-[10px] text-app-textMuted">
        {{ levels.length }} presets
      </span>
    </div>

    <div class="mt-4 space-y-3">
      <article
        v-for="level in levels"
        :key="level.id"
        class="rounded-2xl border p-3 transition-colors"
        :class="
          level.id === currentLevelId && currentSource === 'catalog'
            ? 'border-semantic-info-400 bg-feedback-infoSoft'
            : 'border-app-border bg-depth-baseMuted'
        "
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-app-bg px-2 py-0.5 text-xs font-bold text-app-textMuted">
                {{ level.id }}
              </span>
              <h3 class="text-sm font-bold text-app-text">{{ level.name }}</h3>
            </div>
            <p v-if="level.description" class="mt-1 text-xs leading-relaxed text-app-textMuted">
              {{ level.description }}
            </p>
          </div>
          <span
            class="rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em]"
            :class="ruleBadgeClass(level.turnRule)"
          >
            {{ level.turnRule }}
          </span>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-app-textMuted">
          <div class="rounded-xl bg-app-bg px-3 py-2">
            {{ level.rows }}×{{ level.columns }}×{{ level.depth }}
          </div>
          <div class="rounded-xl bg-app-bg px-3 py-2">{{ level.rounds }} rounds</div>
          <div class="rounded-xl bg-app-bg px-3 py-2">Bank {{ level.startingBank }}</div>
          <div class="rounded-xl bg-app-bg px-3 py-2">
            Bet {{ level.minBet }}-{{ level.maxBet }}
          </div>
        </div>

        <div class="mt-3 flex gap-2">
          <button
            class="flex-1 rounded-xl border border-semantic-info-400 bg-incremental-infoBg px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-semantic-info-600"
            @click="$emit('select-level', level.id)"
          >
            Load
          </button>
          <button
            class="rounded-xl border border-app-border px-3 py-2 text-sm font-semibold text-app-textMuted transition-colors hover:bg-app-bg hover:text-app-text"
            @click="$emit('use-template', level.id)"
          >
            Use in Builder
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BuiltLevelDefinition, TurnRuleType } from '@/games/depth/game/types';

defineProps<{
  levels: BuiltLevelDefinition[];
  currentLevelId: number;
  currentSource: 'catalog' | 'custom';
}>();

defineEmits<{
  (event: 'select-level', levelId: number): void;
  (event: 'use-template', levelId: number): void;
}>();

function ruleBadgeClass(rule: TurnRuleType): string {
  switch (rule) {
    case 'basic-reveal':
      return 'border border-incremental-successBorderFaint bg-feedback-successSubtle text-semantic-success-300';
    case 'column-choice-reveal':
      return 'border border-edge-infoSoft bg-feedback-infoFaint text-semantic-info-300';
    case 'column-reveal':
      return 'border border-edge-warningMuted bg-feedback-warningSubtle text-semantic-warning-300';
    case 'dealer-follow-up':
      return 'border border-edge-dangerSoft bg-feedback-dangerSubtle text-semantic-danger-300';
  }
}

defineOptions({
  name: 'LevelSelector',
});
</script>
