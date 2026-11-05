<script setup>
import { useRouter } from 'vue-router';
import { useAuth } from './composables/useAuth.js';
import { useNotification } from './composables/useNotification.js';

const router = useRouter();
const { isAuthenticated, logout } = useAuth();
const { notification, notify } = useNotification();

async function signOut() {
  try {
    await logout();
    await router.push({ name: 'contacts' });
    notify('Sessão terminada.');
  } catch (err) {
    notify(err.message);
  }
}
</script>

<template>
  <header class="app-header">
    <div class="container app-header__content">
      <RouterLink :to="{ name: 'contacts' }" class="app-header__title">Contactos</RouterLink>
      <nav class="app-header__actions" aria-label="Principal">
        <button v-if="isAuthenticated" type="button" class="button" @click="signOut">Sair</button>
        <RouterLink v-else :to="{ name: 'login' }" class="button button--primary">Entrar</RouterLink>
      </nav>
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
