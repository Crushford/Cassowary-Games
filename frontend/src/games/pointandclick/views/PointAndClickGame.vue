<template>
  <div
    class="relative w-screen h-screen overflow-hidden bg-black select-none"
    tabindex="0"
    @keydown.space.prevent="advanceDialogue"
    @keydown.enter.prevent="advanceDialogue"
    @keydown.esc="closeDialogue"
  >
    <!-- ── Background ──────────────────────────────────────────────────────── -->
    <div
      class="absolute inset-0 transition-all duration-700"
      :style="backgroundStyle"
    />
    <!-- Atmospheric depth overlay -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15 pointer-events-none" />

    <!-- ── Object hotspots ────────────────────────────────────────────────── -->
    <button
      v-for="layer in objectLayers"
      :key="layer.entityId"
      type="button"
      class="absolute flex flex-col items-center justify-end gap-1 group transition-opacity duration-300"
      :class="visited.has(layer.entityId) ? 'opacity-35' : 'opacity-100'"
      :style="absoluteStyle(layer)"
      :disabled="activeEntityId !== null"
      @click="openInteraction(layer.entityId)"
    >
      <div
        class="rounded-full border-2 transition-all duration-200 mb-1"
        :class="
          visited.has(layer.entityId)
            ? 'h-4 w-4 border-semantic-neutral-600 bg-transparent'
            : 'h-5 w-5 border-semantic-warning-400 bg-semantic-warning-500/20 group-hover:bg-semantic-warning-500/50 shadow-[0_0_14px_rgba(245,158,11,0.5)] animate-pulse'
        "
      />
      <span
        class="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium transition-colors"
        :class="visited.has(layer.entityId) ? 'text-semantic-neutral-600' : 'text-semantic-neutral-200 group-hover:text-white'"
      >
        {{ layer.label }}
      </span>
    </button>

    <!-- ── Character layers ───────────────────────────────────────────────── -->
    <button
      v-for="layer in characterLayers"
      :key="layer.entityId"
      type="button"
      class="absolute flex flex-col items-center justify-end gap-1 group transition-all duration-300"
      :class="[
        visited.has(layer.entityId) ? 'opacity-40' : 'opacity-100',
        activeEntityId === layer.entityId ? 'brightness-125 scale-[1.03]' : 'hover:brightness-110',
      ]"
      :style="absoluteStyle(layer)"
      :disabled="activeEntityId !== null && activeEntityId !== layer.entityId"
      @click="openInteraction(layer.entityId)"
    >
      <!-- Silhouette or real image -->
      <template v-if="characterAsset(layer.entityId)?.imageUrl">
        <img
          :src="characterAsset(layer.entityId)!.imageUrl"
          class="w-full object-contain object-bottom"
          style="height: 88%"
          :alt="layer.label"
        />
      </template>
      <template v-else>
        <div
          class="w-full rounded-t-[40%] transition-all duration-300"
          style="height: 88%"
          :style="{
            background: characterAsset(layer.entityId)?.previewGradient ?? 'linear-gradient(160deg,#1e3a5f,#0f172a)',
            boxShadow: activeEntityId === layer.entityId ? '0 0 40px rgba(99,179,237,0.35)' : '0 0 20px rgba(99,179,237,0.1)',
          }"
        />
      </template>
      <span
        class="mt-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white"
      >
        {{ layer.label }}
      </span>
    </button>

    <!-- ── HUD: top bar ───────────────────────────────────────────────────── -->
    <div class="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/65 to-transparent pointer-events-none">
      <button
        class="pointer-events-auto flex items-center gap-2 text-sm text-semantic-neutral-400 hover:text-white transition-colors rounded-lg px-3 py-1.5 bg-black/40 hover:bg-black/60"
        @click="router.push('/pointandclick/admin')"
      >
        ← Workshop
      </button>

      <div class="text-center">
        <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-semantic-warning-300">
          {{ scene?.location }}
        </p>
        <p class="text-sm font-semibold text-white">{{ scene?.title }}</p>
      </div>

      <div class="pointer-events-auto text-xs text-semantic-neutral-500 rounded-lg px-3 py-1.5 bg-black/40">
        {{ visited.size }} / {{ totalInteractables }} explored
      </div>
    </div>

    <!-- ── Scene complete banner ──────────────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="sceneComplete"
        class="absolute top-16 left-1/2 -translate-x-1/2 rounded-2xl border border-semantic-warning-600 bg-black/80 px-6 py-3 text-center backdrop-blur-sm"
      >
        <p class="text-sm font-semibold text-semantic-warning-300">Scene explored</p>
        <p class="text-xs text-semantic-neutral-400 mt-0.5">All characters and objects interacted with</p>
      </div>
    </Transition>

    <!-- ── Dialogue panel ─────────────────────────────────────────────────── -->
    <Transition name="slide-up">
      <div
        v-if="frame"
        class="absolute bottom-0 left-0 right-0 border-t bg-black/92 backdrop-blur-sm"
        :class="frame.kind === 'character' ? 'border-semantic-info-800' : 'border-semantic-warning-800'"
      >
        <div class="mx-auto max-w-3xl px-6 py-5">
          <div class="flex items-start gap-4">
            <!-- Avatar (image or gradient swatch) -->
            <div
              class="h-14 w-14 shrink-0 rounded-2xl border"
              :class="frame.kind === 'character' ? 'border-semantic-info-700' : 'border-semantic-warning-700'"
              :style="frame.avatarStyle"
            >
              <img
                v-if="frame.avatarImageUrl"
                :src="frame.avatarImageUrl"
                class="h-full w-full rounded-2xl object-cover"
                :alt="frame.speakerName"
              />
            </div>

            <div class="min-w-0 flex-1">
              <p
                class="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                :class="frame.kind === 'character' ? 'text-semantic-info-300' : 'text-semantic-warning-300'"
              >
                {{ frame.speakerName }}
              </p>
              <p class="text-base leading-relaxed text-white">{{ frame.text }}</p>
            </div>

            <button
              type="button"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-semantic-neutral-700 text-lg text-white transition-colors hover:bg-semantic-neutral-600 active:scale-95"
              @click="advanceDialogue"
            >
              {{ hasMore ? '→' : '✕' }}
            </button>
          </div>

          <!-- Progress dots -->
          <div v-if="frame.total > 1" class="mt-3 flex justify-center gap-1.5">
            <div
              v-for="i in frame.total"
              :key="i"
              class="h-1.5 w-1.5 rounded-full transition-colors"
              :class="i - 1 === lineIndex ? 'bg-white' : 'bg-semantic-neutral-700'"
            />
          </div>

          <p class="mt-2 text-center text-[10px] text-semantic-neutral-600">
            {{ hasMore ? 'Space / Enter to continue' : 'Space / Enter or ✕ to close' }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { LayerEntry, AssetCandidate } from '../types';
import { usePointAndClickAdminStore } from '../stores/pointAndClickAdminStore';

const route = useRoute();
const router = useRouter();
const store = usePointAndClickAdminStore();

// ── Load scene ────────────────────────────────────────────────────────────────

onMounted(() => {
  const id = route.params.sceneId as string;
  if (id && store.selectedSceneId !== id) store.selectScene(id);
  // Focus for keyboard events
  (document.activeElement as HTMLElement | null)?.blur?.();
});

const scene = computed(() => store.selectedScene);

// ── Layout layers ─────────────────────────────────────────────────────────────

const characterLayers = computed(() => store.layout?.layers.filter((l) => l.kind === 'character') ?? []);
const objectLayers = computed(() => store.layout?.layers.filter((l) => l.kind === 'object') ?? []);
const totalInteractables = computed(() => characterLayers.value.length + objectLayers.value.length);

function absoluteStyle(layer: LayerEntry): Record<string, string> {
  return { left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%` };
}

// ── Assets ────────────────────────────────────────────────────────────────────

const backgroundStyle = computed(() => {
  const bg = store.selectedBackground;
  if (bg?.imageUrl) return { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return { background: bg?.previewGradient ?? 'linear-gradient(180deg,#111827,#0f172a)' };
});

function characterAsset(entityId: string): AssetCandidate | undefined {
  return store.selectedCharacterById[entityId];
}

// ── Interaction state ─────────────────────────────────────────────────────────

const activeEntityId = ref<string | null>(null);
const lineIndex = ref(0);
const visited = ref(new Set<string>());
const sceneComplete = computed(
  () => visited.value.size >= totalInteractables.value && totalInteractables.value > 0,
);

// Current dialogue frame derived from active entity
interface Frame {
  kind: 'character' | 'object';
  speakerName: string;
  text: string;
  avatarStyle: Record<string, string>;
  avatarImageUrl?: string;
  total: number;
}

const frame = computed((): Frame | null => {
  if (!activeEntityId.value || !scene.value) return null;

  const char = scene.value.characters.find((c) => c.id === activeEntityId.value);
  if (char) {
    const lines = scene.value.dialogue.filter((d) => d.characterId === char.id);
    const asset = characterAsset(char.id);
    return {
      kind: 'character',
      speakerName: `${char.name} · ${char.role}`,
      text: lines[lineIndex.value]?.text ?? char.description,
      avatarStyle: { background: asset?.previewGradient ?? 'linear-gradient(160deg,#1e40af,#0891b2)' },
      avatarImageUrl: asset?.imageUrl,
      total: lines.length || 1,
    };
  }

  const obj = scene.value.interactables.find((i) => i.id === activeEntityId.value);
  if (obj) {
    return {
      kind: 'object',
      speakerName: obj.name,
      text: lineIndex.value === 0 ? obj.description : obj.interactionText,
      avatarStyle: { background: 'linear-gradient(135deg,#78350f,#1c1917)' },
      total: 2,
    };
  }

  return null;
});

const hasMore = computed(() => frame.value !== null && lineIndex.value < frame.value.total - 1);

function openInteraction(entityId: string) {
  if (activeEntityId.value) return;
  activeEntityId.value = entityId;
  lineIndex.value = 0;
}

function advanceDialogue() {
  if (!frame.value) return;
  if (hasMore.value) {
    lineIndex.value++;
  } else {
    closeDialogue();
  }
}

function closeDialogue() {
  if (activeEntityId.value) visited.value.add(activeEntityId.value);
  activeEntityId.value = null;
  lineIndex.value = 0;
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

function onKey(e: KeyboardEvent) {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advanceDialogue(); }
  if (e.key === 'Escape') closeDialogue();
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
