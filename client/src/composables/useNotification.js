import { ref } from 'vue';

const DISPLAY_TIME_MS = 4000;

// Module-level state: a message survives the page change that follows a successful save.
const notification = ref('');
let timer;

export function useNotification() {
  function notify(message) {
    clearTimeout(timer);
    notification.value = message;
    timer = setTimeout(() => {
      notification.value = '';
    }, DISPLAY_TIME_MS);
  }

  return { notification, notify };
}
