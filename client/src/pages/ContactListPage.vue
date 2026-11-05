<script setup>
import { computed, onMounted, ref } from 'vue';
import { deleteContact, listContacts } from '../api/contacts.js';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import ContactCard from '../components/ContactCard.vue';
import StatusMessage from '../components/StatusMessage.vue';
import TextField from '../components/TextField.vue';
import { useAuth } from '../composables/useAuth.js';
import { useNotification } from '../composables/useNotification.js';
import { filterContacts } from '../utils/contactSearch.js';

const { isAuthenticated } = useAuth();
const { notify } = useNotification();

const contacts = ref([]);
const loading = ref(true);
const loadError = ref('');
const searchQuery = ref('');

const visibleContacts = computed(() => filterContacts(contacts.value, searchQuery.value));

const countLabel = computed(() => {
  const total = contacts.value.length;
  const noun = total === 1 ? 'contacto' : 'contactos';
  return searchQuery.value.trim() ? `${visibleContacts.value.length} de ${total} ${noun}` : `${total} ${noun}`;
});

const contactToDelete = ref(null);
const dialogOpen = ref(false);
const deleting = ref(false);
const deleteError = ref('');

async function loadContacts() {
  loading.value = true;
  loadError.value = '';
  try {
    contacts.value = await listContacts();
  } catch (err) {
    loadError.value = err.message;
  } finally {
    loading.value = false;
  }
}

function askToDelete(contact) {
  contactToDelete.value = contact;
  deleteError.value = '';
  dialogOpen.value = true;
}

function closeDialog() {
  dialogOpen.value = false;
}

async function confirmDelete() {
  const { id, name } = contactToDelete.value;
  deleting.value = true;
  deleteError.value = '';
  try {
    await deleteContact(id);
    contacts.value = contacts.value.filter((contact) => contact.id !== id);
    closeDialog();
    notify(`${name} foi eliminado.`);
  } catch (err) {
    deleteError.value = err.message;
  } finally {
    deleting.value = false;
  }
}

onMounted(loadContacts);
</script>

<template>
  <header class="page-header">
    <div>
      <h1 class="page-title">Lista de contactos</h1>
      <output v-if="!loading && !loadError" class="page-count">{{ countLabel }}</output>
    </div>
    <RouterLink v-if="isAuthenticated" :to="{ name: 'new-contact' }" class="button button--primary">
      Novo contacto
    </RouterLink>
  </header>

  <p v-if="!isAuthenticated" class="page-intro">
    <RouterLink :to="{ name: 'login' }">Inicia sessão</RouterLink> para ver detalhes, criar, editar ou eliminar contactos.
  </p>

  <StatusMessage v-if="loading" variant="loading" title="A carregar os contactos…" />

  <StatusMessage v-else-if="loadError" variant="error" :title="loadError">
    <button type="button" class="button" @click="loadContacts">Tentar novamente</button>
  </StatusMessage>

  <StatusMessage v-else-if="contacts.length === 0" title="Ainda não existem contactos.">
    <RouterLink v-if="isAuthenticated" :to="{ name: 'new-contact' }" class="button button--primary">
      Adicionar o primeiro contacto
    </RouterLink>
  </StatusMessage>

  <template v-else>
    <div class="list-search">
      <TextField
        id="contact-search"
        v-model="searchQuery"
        label="Pesquisar"
        type="search"
        placeholder="Nome, telefone ou email"
      />
    </div>

    <StatusMessage v-if="visibleContacts.length === 0" title="Nenhum contacto corresponde à pesquisa.">
      <button type="button" class="button" @click="searchQuery = ''">Limpar pesquisa</button>
    </StatusMessage>

    <div v-else class="card-grid">
      <ContactCard
        v-for="contact in visibleContacts"
        :key="contact.id"
        :contact="contact"
        :can-manage="isAuthenticated"
        @delete="askToDelete"
      />
    </div>
  </template>

  <ConfirmDialog
    :open="dialogOpen"
    title="Eliminar contacto"
    confirm-label="Eliminar"
    :busy="deleting"
    :error="deleteError"
    @confirm="confirmDelete"
    @cancel="closeDialog"
  >
    <p>
      Tens a certeza de que queres eliminar <strong>{{ contactToDelete?.name }}</strong>? Esta ação não pode ser
      anulada.
    </p>
  </ConfirmDialog>
</template>
