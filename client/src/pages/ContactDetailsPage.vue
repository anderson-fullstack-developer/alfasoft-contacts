<script setup>
import { useRoute } from 'vue-router';
import StatusMessage from '../components/StatusMessage.vue';
import { useContact } from '../composables/useContact.js';

const route = useRoute();
const { contact, loading, error, load } = useContact(route.params.id);
</script>

<template>
  <StatusMessage v-if="loading" variant="loading" title="A carregar o contacto…" />

  <StatusMessage v-else-if="error" variant="error" :title="error">
    <button type="button" class="button" @click="load">Tentar novamente</button>
    <RouterLink :to="{ name: 'contacts' }" class="button">Voltar à lista</RouterLink>
  </StatusMessage>

  <article v-else-if="contact" class="details">
    <img class="details__picture" :src="contact.picture" :alt="`Fotografia de ${contact.name}`" />
    <div class="details__content">
      <h1 class="page-title">{{ contact.name }}</h1>
      <dl class="card__fields">
        <div>
          <dt>ID</dt>
          <dd>{{ contact.id }}</dd>
        </div>
        <div>
          <dt>Nome</dt>
          <dd>{{ contact.name }}</dd>
        </div>
        <div>
          <dt>Contacto</dt>
          <dd><a :href="`tel:${contact.contact}`">{{ contact.contact }}</a></dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd><a :href="`mailto:${contact.email}`">{{ contact.email }}</a></dd>
        </div>
      </dl>
      <div class="form__actions">
        <RouterLink :to="{ name: 'edit-contact', params: { id: contact.id } }" class="button button--primary">
          Editar
        </RouterLink>
        <RouterLink :to="{ name: 'contacts' }" class="button">Voltar à lista</RouterLink>
      </div>
    </div>
  </article>
</template>
