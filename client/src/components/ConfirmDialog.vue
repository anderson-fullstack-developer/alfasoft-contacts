<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  confirmLabel: { type: String, required: true },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
});

const emit = defineEmits(['confirm', 'cancel']);

const dialog = ref(null);

// The native <dialog> provides the modal behaviour: focus trap, Esc key and inert background.
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) dialog.value.showModal();
    else dialog.value.close();
  }
);

function requestCancel() {
  if (!props.busy) emit('cancel');
}
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="dialog-title" @cancel.prevent="requestCancel">
    <h2 id="dialog-title" class="dialog__title">{{ title }}</h2>
    <div class="dialog__body"><slot /></div>
    <p v-if="error" class="field__error" role="alert">{{ error }}</p>
    <div class="dialog__actions">
      <button type="button" class="button" autofocus :disabled="busy" @click="requestCancel">Cancelar</button>
      <button type="button" class="button button--danger-solid" :disabled="busy" @click="$emit('confirm')">
        {{ busy ? 'A eliminar…' : confirmLabel }}
      </button>
    </div>
  </dialog>
</template>
