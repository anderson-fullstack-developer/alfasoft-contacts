<script setup>
import { useNotification } from './composables/useNotification.js';

const { notification } = useNotification();
</script>

<template>
  <header class="app-header">
    <div class="container app-header__content">
      <RouterLink :to="{ name: 'contacts' }" class="app-header__title">Contactos</RouterLink>
      <RouterLink :to="{ name: 'new-contact' }" class="button button--primary">Novo contacto</RouterLink>
    </div>
  </header>

  <main class="container app-main">
    <!-- The key recreates the page when moving between /novo and /editar/:id, which share a component. -->
    <RouterView :key="$route.fullPath" />
  </main>

  <div class="notification-area" role="status" aria-live="polite">
    <p v-if="notification" class="notification">{{ notification }}</p>
  </div>
</template>
