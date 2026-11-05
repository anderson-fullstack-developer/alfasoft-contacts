<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
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

const FIELD_INPUT_IDS = {
  name: 'contact-name',
  contact: 'contact-phone',
  email: 'contact-email',
  picture: 'contact-picture'
};

const form = reactive({
  name: props.contact?.name ?? '',
  contact: props.contact?.contact ?? '',
  email: props.contact?.email ?? ''
});

const errors = ref({});
const pictureFile = ref(null);
const previewUrl = ref('');

const displayedPicture = computed(() => previewUrl.value || props.contact?.picture || '');

const touched = reactive({ name: false, contact: false, email: false });

function validateField(field) {
  const { [field]: _removed, ...otherErrors } = errors.value;
  const { errors: fieldErrors } = validateContact(form);
  errors.value = fieldErrors[field] ? { ...otherErrors, [field]: fieldErrors[field] } : otherErrors;
}

function markTouched(field) {
  touched[field] = true;
  // An existing message stays until the value changes: it may be a duplicate reported by the API.
  if (!errors.value[field]) validateField(field);
}

// Before the first blur nothing is shown, so the user is not corrected while still typing.
// After that, the message follows every change and disappears as soon as the value is valid.
for (const field of Object.keys(touched)) {
  watch(() => form[field], () => {
    if (touched[field]) validateField(field);
  });
}

async function focusFirstError() {
  await nextTick();
  const firstField = Object.keys(FIELD_INPUT_IDS).find((field) => errors.value[field]);
  if (firstField) document.getElementById(FIELD_INPUT_IDS[firstField])?.focus();
}

watch(() => props.serverErrors, (serverErrors) => {
  errors.value = serverErrors;
  Object.keys(touched).forEach((field) => { touched[field] = true; });
  focusFirstError();
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
  Object.keys(touched).forEach((field) => { touched[field] = true; });

  if (Object.keys(fieldErrors).length === 0) emit('submit', buildFormData());
  else focusFirstError();
}

onBeforeUnmount(clearPreview);
</script>

<template>
  <form class="form" novalidate @submit.prevent="submit">
    <TextField
      id="contact-name"
      v-model="form.name"
      label="Nome"
      hint="Mais de 5 caracteres, só com letras, espaços, hífens, apóstrofos e pontos."
      autocomplete="name"
      maxlength="255"
      :error="errors.name"
      @blur="markTouched('name')"
    />
    <TextField
      id="contact-phone"
      v-model="form.contact"
      label="Contacto"
      hint="Exatamente 9 dígitos, sem espaços."
      type="tel"
      inputmode="numeric"
      autocomplete="tel"
      :error="errors.contact"
      @blur="markTouched('contact')"
    />
    <TextField
      id="contact-email"
      v-model="form.email"
      label="Email"
      hint="Por exemplo, nome@dominio.pt."
      type="email"
      autocomplete="email"
      maxlength="254"
      :error="errors.email"
      @blur="markTouched('email')"
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
