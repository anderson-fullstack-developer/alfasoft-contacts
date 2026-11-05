<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StatusMessage from '../components/StatusMessage.vue';
import TextField from '../components/TextField.vue';
import { useAuth } from '../composables/useAuth.js';

const route = useRoute();
const router = useRouter();
const { login } = useAuth();

const credentials = reactive({ username: '', password: '' });
const fieldErrors = ref({});
const submitting = ref(false);
const submitError = ref('');

// Only internal paths are accepted, so the link cannot redirect to another site after login.
function redirectTarget() {
  const { redirect } = route.query;
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
}

async function submit() {
  fieldErrors.value = {
    ...(credentials.username ? {} : { username: 'Indica o utilizador.' }),
    ...(credentials.password ? {} : { password: 'Indica a palavra-passe.' })
  };
  submitError.value = '';
  if (Object.keys(fieldErrors.value).length > 0) return;

  submitting.value = true;
  try {
    await login(credentials.username, credentials.password);
    await router.replace(redirectTarget());
  } catch (err) {
    submitError.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <h1 class="page-title">Iniciar sessão</h1>
  <p class="page-intro">A lista de contactos é pública. Para ver detalhes, criar, editar ou eliminar, inicia sessão.</p>

  <StatusMessage v-if="submitError" variant="error" :title="submitError" />

  <form class="form" novalidate @submit.prevent="submit">
    <TextField
      id="login-username"
      v-model="credentials.username"
      label="Utilizador"
      autocomplete="username"
      :error="fieldErrors.username"
    />
    <TextField
      id="login-password"
      v-model="credentials.password"
      label="Palavra-passe"
      type="password"
      autocomplete="current-password"
      :error="fieldErrors.password"
    />
    <div class="form__actions">
      <button type="submit" class="button button--primary" :disabled="submitting">
        {{ submitting ? 'A entrar…' : 'Entrar' }}
      </button>
      <RouterLink :to="{ name: 'contacts' }" class="button">Voltar à lista</RouterLink>
    </div>
  </form>
</template>
