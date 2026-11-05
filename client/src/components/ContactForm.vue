<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import {
  ACCEPTED_PICTURE_TYPES,
  PICTURE_MESSAGES,
  validateContact,
  validatePictureFile
} from '../../../validation/contact.js';
import TextField from './TextField.vue';

const props = defineProps({
  contact: { type: Object, default: null },
  submitLabel: { type: String, required: true },
  submitting: { type: Boolean, default: false },
  serverErrors: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['submit']);

const form = reactive({
  name: props.contact?.name ?? '',
  contact: props.contact?.contact ?? '',
  email: props.contact?.email ?? ''
});

const errors = ref({});
const pictureFile = ref(null);
const previewUrl = ref('');

const displayedPicture = computed(() => previewUrl.value || props.contact?.picture || '');

watch(() => props.serverErrors, (serverErrors) => {
  errors.value = serverErrors;
});

function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = '';
}

function selectPicture(event) {
  const [file] = event.target.files;
  clearPreview();
  pictureFile.value = null;

  if (!file) return;

  const pictureError = validatePictureFile(file);
  if (pictureError) {
    errors.value = { ...errors.value, picture: pictureError };
    event.target.value = '';
    return;
  }

  const { picture, ...otherErrors } = errors.value;
  errors.value = otherErrors;
  pictureFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
}

function buildFormData() {
  const formData = new FormData();
  formData.append('name', form.name);
  formData.append('contact', form.contact);
  formData.append('email', form.email);
  if (pictureFile.value) formData.append('picture', pictureFile.value);
  return formData;
}

function submit() {
  const { errors: fieldErrors } = validateContact(form);
  if (!pictureFile.value && !props.contact) fieldErrors.picture = PICTURE_MESSAGES.required;

  errors.value = fieldErrors;
  if (Object.keys(fieldErrors).length === 0) emit('submit', buildFormData());
}

onBeforeUnmount(clearPreview);
</script>

<template>
  <form class="form" novalidate @submit.prevent="submit">
    <TextField
      id="contact-name"
      v-model="form.name"
      label="Nome"
      autocomplete="name"
      maxlength="255"
      :error="errors.name"
    />
    <TextField
      id="contact-phone"
      v-model="form.contact"
      label="Contacto (9 dígitos)"
      type="tel"
      inputmode="numeric"
      autocomplete="tel"
      maxlength="9"
      :error="errors.contact"
    />
    <TextField
      id="contact-email"
      v-model="form.email"
      label="Email"
      type="email"
      autocomplete="email"
      maxlength="254"
      :error="errors.email"
    />

    <div class="field">
      <label class="field__label" for="contact-picture">
        Fotografia {{ contact ? '(opcional, mantém a atual se ficar vazia)' : '' }}
      </label>
      <img v-if="displayedPicture" class="form__preview" :src="displayedPicture" alt="Pré-visualização da fotografia" />
      <input
        id="contact-picture"
        class="field__input"
        type="file"
        :accept="ACCEPTED_PICTURE_TYPES.join(',')"
        :aria-invalid="Boolean(errors.picture)"
        :aria-describedby="errors.picture ? 'contact-picture-error' : 'contact-picture-hint'"
        @change="selectPicture"
      />
      <p id="contact-picture-hint" class="field__hint">JPEG, PNG ou WebP, até 5 MB.</p>
      <p v-if="errors.picture" id="contact-picture-error" class="field__error">{{ errors.picture }}</p>
    </div>

    <div class="form__actions">
      <button type="submit" class="button button--primary" :disabled="submitting">
        {{ submitting ? 'A guardar…' : submitLabel }}
      </button>
      <RouterLink :to="contact ? { name: 'contact-details', params: { id: contact.id } } : { name: 'contacts' }" class="button">
        Cancelar
      </RouterLink>
    </div>
  </form>
</template>
