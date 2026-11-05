import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import ContactCard from './ContactCard.vue';

const CONTACT = {
  id: 7,
  name: 'Maria Silva',
  contact: '912345678',
  email: 'maria.silva@exemplo.pt',
  picture: '/uploads/foto.png'
};

const mountCard = (canManage) =>
  mount(ContactCard, {
    props: { contact: CONTACT, canManage },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } }
  });

describe('ContactCard', () => {
  test('mostra todos os dados e a fotografia, com ou sem sessão', () => {
    for (const canManage of [false, true]) {
      const wrapper = mountCard(canManage);
      for (const value of ['7', CONTACT.name, CONTACT.contact, CONTACT.email]) {
        expect(wrapper.text()).toContain(value);
      }
      expect(wrapper.find('img').attributes('src')).toBe(CONTACT.picture);
    }
  });

  test('sem sessão, não mostra ações', () => {
    expect(mountCard(false).find('.card__actions').exists()).toBe(false);
  });

  test('com sessão, mostra detalhes, editar e eliminar', () => {
    const wrapper = mountCard(true);
    const actions = wrapper.find('.card__actions').text();
    expect(actions).toContain('Detalhes');
    expect(actions).toContain('Editar');
    expect(actions).toContain('Eliminar');
  });

  test('o botão eliminar emite o contacto', async () => {
    const wrapper = mountCard(true);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('delete')[0]).toEqual([CONTACT]);
  });
});
