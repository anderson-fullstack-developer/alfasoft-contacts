<script setup>
import { computed } from 'vue';

const props = defineProps({
  contact: { type: Object, required: true },
  canManage: { type: Boolean, default: false }
});

defineEmits(['delete']);

const emailParts = computed(() => props.contact.email.split('@'));
</script>

<template>
  <article class="card">
    <div class="card__header">
      <img class="card__picture" :src="contact.picture" :alt="`Fotografia de ${contact.name}`" loading="lazy" />
      <div class="card__identity">
        <h2 class="card__name">{{ contact.name }}</h2>
        <p class="card__id">ID {{ contact.id }}</p>
      </div>
    </div>
    <dl class="card__fields card__fields--inline">
      <div>
        <dt>Contacto</dt>
        <dd>{{ contact.contact }}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <!-- A long address breaks after the @ rather than in the middle of the domain. -->
        <dd>{{ emailParts[0] }}@<wbr />{{ emailParts[1] }}</dd>
      </div>
    </dl>
    <div v-if="canManage" class="card__actions">
      <RouterLink :to="{ name: 'contact-details', params: { id: contact.id } }" class="button">Detalhes</RouterLink>
      <RouterLink :to="{ name: 'edit-contact', params: { id: contact.id } }" class="button">Editar</RouterLink>
      <button type="button" class="button button--danger" @click="$emit('delete', contact)">Eliminar</button>
    </div>
  </article>
</template>
