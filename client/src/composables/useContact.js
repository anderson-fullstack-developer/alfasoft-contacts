import { onMounted, ref } from 'vue';
import { getContact } from '../api/contacts.js';

// Loads one contact when the page opens. Without an id (new contact) there is nothing to load.
export function useContact(id) {
  const contact = ref(null);
  const loading = ref(Boolean(id));
  const error = ref('');

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      contact.value = await getContact(id);
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    if (id) load();
  });

  return { contact, loading, error, load };
}
