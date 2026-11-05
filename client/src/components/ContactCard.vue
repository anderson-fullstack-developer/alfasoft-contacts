<script setup>
defineProps({
  contact: { type: Object, required: true }
});

defineEmits(['delete']);
</script>

<template>
  <article class="card">
    <img class="card__picture" :src="contact.picture" :alt="`Fotografia de ${contact.name}`" loading="lazy" />
    <div class="card__body">
      <h2 class="card__name">{{ contact.name }}</h2>
      <dl class="card__fields">
        <div>
          <dt>ID</dt>
          <dd>{{ contact.id }}</dd>
        </div>
        <div>
          <dt>Contacto</dt>
          <dd>{{ contact.contact }}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{{ contact.email }}</dd>
        </div>
      </dl>
    </div>
    <div class="card__actions">
      <RouterLink :to="{ name: 'contact-details', params: { id: contact.id } }" class="button">Detalhes</RouterLink>
      <RouterLink :to="{ name: 'edit-contact', params: { id: contact.id } }" class="button">Editar</RouterLink>
      <button type="button" class="button button--danger" @click="$emit('delete', contact)">Eliminar</button>
    </div>
  </article>
</template>
