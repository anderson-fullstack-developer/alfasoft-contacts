<script setup>
defineProps({
  variant: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'loading', 'error'].includes(value)
  },
  title: { type: String, required: true }
});
</script>

<template>
  <div class="status" :class="`status--${variant}`" :role="variant === 'error' ? 'alert' : 'status'">
    <span v-if="variant === 'loading'" class="spinner" aria-hidden="true"></span>
    <p class="status__title">{{ title }}</p>
    <div v-if="$slots.default" class="status__actions">
      <slot />
    </div>
  </div>
</template>
