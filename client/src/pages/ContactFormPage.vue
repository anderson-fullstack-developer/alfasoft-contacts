<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createContact, updateContact } from '../api/contacts.js';
import ContactForm from '../components/ContactForm.vue';
import StatusMessage from '../components/StatusMessage.vue';
import { useContact } from '../composables/useContact.js';
import { useNotification } from '../composables/useNotification.js';

const route = useRoute();
const router = useRouter();
const { notify } = useNotification();

const contactId = route.params.id;
const isEditing = Boolean(contactId);

const { contact, loading, error, load } = useContact(contactId);

const submitting = ref(false);
const submitError = ref('');
const serverErrors = ref({});

async function save(formData) {
  submitting.value = true;
  submitError.value = '';
  serverErrors.value = {};
  try {
    const saved = isEditing ? await updateContact(contactId, formData) : await createContact(formData);
    notify(isEditing ? 'Contacto atualizado.' : 'Contacto criado.');
    await router.push({ name: 'contact-details', params: { id: saved.id } });
  } catch (err) {
    if (err.fieldErrors) serverErrors.value = err.fieldErrors;
    else submitError.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <h1 class="page-title">{{ isEditing ? 'Editar contacto' : 'Novo contacto' }}</h1>

  <StatusMessage v-if="loading" variant="loading" title="A carregar o contacto…" />

  <StatusMessage v-else-if="error" variant="error" :title="error">
    <button type="button" class="button" @click="load">Tentar novamente</button>
    <RouterLink :to="{ name: 'contacts' }" class="button">Voltar à lista</RouterLink>
  </StatusMessage>

  <template v-else>
    <StatusMessage v-if="submitError" variant="error" :title="submitError" />
    <ContactForm
      :contact="contact"
      :submit-label="isEditing ? 'Guardar alterações' : 'Criar contacto'"
      :submitting="submitting"
      :server-errors="serverErrors"
      @submit="save"
    />
  </template>
</template>
