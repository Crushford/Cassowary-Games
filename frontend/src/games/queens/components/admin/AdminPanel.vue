<template>
  <section class="rounded-[30px] border border-semantic-neutral-800 bg-surface-darkFirm p-5">
    <div
      v-if="title || description || $slots.badge || $slots.actions"
      class="flex flex-wrap items-start justify-between gap-4"
    >
      <div>
        <h2 v-if="title" class="text-xl font-semibold text-white">{{ title }}</h2>
        <p v-if="description" class="mt-2 max-w-3xl text-sm leading-6 text-semantic-neutral-300">
          {{ description }}
        </p>
      </div>

      <div v-if="$slots.badge || $slots.actions" class="flex flex-wrap items-center gap-3">
        <slot name="badge" />
        <slot name="actions" />
      </div>
    </div>

    <div :class="contentClass ?? 'mt-5'">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
  contentClass?: string;
}>();
</script>
