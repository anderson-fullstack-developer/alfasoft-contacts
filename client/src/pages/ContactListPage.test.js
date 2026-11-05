import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { computed } from 'vue';
import { deleteContact, listContacts } from '../api/contacts.js';
import ContactListPage from './ContactListPage.vue';

vi.mock('../api/contacts.js', () => ({ deleteContact: vi.fn(), listContacts: vi.fn() }));
vi.mock('../composables/useAuth.js', () => ({
  useAuth: () => ({ isAuthenticated: computed(() => true) })
}));

const MARIA = { id: 7, name: 'Maria Silva', contact: '912345678', email: 'maria.silva@exemplo.pt', picture: '/uploads/a.png' };
const JOANA = { id: 8, name: 'Joana Costa', contact: '922222222', email: 'joana.costa@exemplo.pt', picture: '/uploads/b.png' };

async function openPage() {
  const wrapper = mount(ContactListPage, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } }
  });
  await flushPromises();
  return wrapper;
}

const askToDeleteFirst = (wrapper) => wrapper.find('.card__actions .button--danger').trigger('click');
const dialogButton = (wrapper, label) =>
  wrapper.find('dialog').findAll('button').find((button) => button.text() === label);

beforeEach(() => {
  vi.clearAllMocks();
  listContacts.mockResolvedValue([MARIA, JOANA]);
  deleteContact.mockResolvedValue(null);
});

describe('eliminar na lista de contactos', () => {
  test('pede confirmação antes de eliminar', async () => {
    const wrapper = await openPage();
    await askToDeleteFirst(wrapper);

    expect(wrapper.find('dialog').element.open).toBe(true);
    expect(wrapper.find('dialog').text()).toContain(MARIA.name);
    expect(deleteContact).not.toHaveBeenCalled();
  });

  test('cancelar fecha o modal e mantém o contacto', async () => {
    const wrapper = await openPage();
    await askToDeleteFirst(wrapper);
    await dialogButton(wrapper, 'Cancelar').trigger('click');

    expect(wrapper.find('dialog').element.open).toBe(false);
    expect(deleteContact).not.toHaveBeenCalled();
    expect(wrapper.findAll('.card')).toHaveLength(2);
  });

  test('confirmar elimina esse contacto e retira-o da lista', async () => {
    const wrapper = await openPage();
    await askToDeleteFirst(wrapper);
    await dialogButton(wrapper, 'Eliminar').trigger('click');
    await flushPromises();

    expect(deleteContact).toHaveBeenCalledExactlyOnceWith(MARIA.id);
    expect(wrapper.find('dialog').element.open).toBe(false);
    expect(wrapper.findAll('.card')).toHaveLength(1);
    expect(wrapper.text()).not.toContain(MARIA.email);
  });

  test('se a eliminação falhar, mantém o modal aberto, o erro e o contacto', async () => {
    deleteContact.mockRejectedValue(new Error('Não foi possível eliminar.'));
    const wrapper = await openPage();
    await askToDeleteFirst(wrapper);
    await dialogButton(wrapper, 'Eliminar').trigger('click');
    await flushPromises();

    expect(wrapper.find('dialog').element.open).toBe(true);
    expect(wrapper.find('[role="alert"]').text()).toBe('Não foi possível eliminar.');
    expect(wrapper.findAll('.card')).toHaveLength(2);
  });
});
