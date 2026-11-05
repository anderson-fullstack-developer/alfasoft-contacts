import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import ConfirmDialog from './ConfirmDialog.vue';

const mountDialog = (props = {}) =>
  mount(ConfirmDialog, {
    props: { open: false, title: 'Eliminar contacto', confirmLabel: 'Eliminar', ...props },
    slots: { default: '<p>Tens a certeza?</p>' }
  });

const openDialog = async (props) => {
  const wrapper = mountDialog(props);
  await wrapper.setProps({ open: true });
  return wrapper;
};

const cancelButton = (wrapper) => wrapper.findAll('button')[0];
const confirmButton = (wrapper) => wrapper.findAll('button')[1];

describe('ConfirmDialog', () => {
  test('abre e fecha conforme a propriedade open', async () => {
    const wrapper = mountDialog();
    expect(wrapper.element.open).toBe(false);

    await wrapper.setProps({ open: true });
    expect(wrapper.element.open).toBe(true);

    await wrapper.setProps({ open: false });
    expect(wrapper.element.open).toBe(false);
  });

  test('mostra o título, a mensagem e a etiqueta de confirmação', async () => {
    const wrapper = await openDialog();
    expect(wrapper.find('#dialog-title').text()).toBe('Eliminar contacto');
    expect(wrapper.text()).toContain('Tens a certeza?');
    expect(confirmButton(wrapper).text()).toBe('Eliminar');
  });

  test('o botão Cancelar pede para cancelar e não confirma', async () => {
    const wrapper = await openDialog();
    await cancelButton(wrapper).trigger('click');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('confirm')).toBeUndefined();
  });

  test('a tecla Esc pede para cancelar', async () => {
    const wrapper = await openDialog();
    await wrapper.trigger('cancel');
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });

  test('o botão de confirmação confirma e não cancela', async () => {
    const wrapper = await openDialog();
    await confirmButton(wrapper).trigger('click');
    expect(wrapper.emitted('confirm')).toHaveLength(1);
    expect(wrapper.emitted('cancel')).toBeUndefined();
  });

  test('durante a eliminação, bloqueia os botões e a tecla Esc', async () => {
    const wrapper = await openDialog({ busy: true });
    expect(cancelButton(wrapper).attributes('disabled')).toBeDefined();
    expect(confirmButton(wrapper).attributes('disabled')).toBeDefined();
    expect(confirmButton(wrapper).text()).toBe('A eliminar…');

    await wrapper.trigger('cancel');
    expect(wrapper.emitted('cancel')).toBeUndefined();
  });

  test('mostra o erro recebido', async () => {
    const wrapper = await openDialog({ error: 'Não foi possível eliminar.' });
    expect(wrapper.find('[role="alert"]').text()).toBe('Não foi possível eliminar.');
  });
});
