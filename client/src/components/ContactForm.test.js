import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MAX_PICTURE_BYTES } from '../../../validation/contact.js';
import ContactForm from './ContactForm.vue';

const VALID_FIELDS = {
  name: 'Maria Silva',
  contact: '912345678',
  email: 'maria.silva@exemplo.pt'
};

const EXISTING_CONTACT = { id: 7, ...VALID_FIELDS, picture: '/uploads/foto.png' };

const pngFile = (size = 10) => {
  const file = new File(['x'], 'foto.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

function mountForm(props = {}) {
  return mount(ContactForm, {
    props: { submitLabel: 'Guardar', ...props },
    global: { stubs: { RouterLink: true } }
  });
}

async function fillFields(wrapper, fields) {
  await wrapper.find('#contact-name').setValue(fields.name);
  await wrapper.find('#contact-phone').setValue(fields.contact);
  await wrapper.find('#contact-email').setValue(fields.email);
}

async function selectFile(wrapper, file) {
  const input = wrapper.find('#contact-picture');
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
  await input.trigger('change');
}

const submit = (wrapper) => wrapper.find('form').trigger('submit');
const errorOf = (wrapper, field) => wrapper.find(`#contact-${field}-error`);

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('ContactForm ao criar', () => {
  test('mostra um erro em cada campo e não submete um formulário vazio', async () => {
    const wrapper = mountForm();
    await submit(wrapper);

    for (const field of ['name', 'phone', 'email', 'picture']) {
      expect(errorOf(wrapper, field).exists()).toBe(true);
    }
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  test('recusa nome com 5 caracteres e aceita com 6', async () => {
    const wrapper = mountForm();
    await fillFields(wrapper, { ...VALID_FIELDS, name: 'Maria' });
    await submit(wrapper);
    expect(errorOf(wrapper, 'name').text()).toContain('mais de 5');

    await wrapper.find('#contact-name').setValue('Marias');
    await submit(wrapper);
    expect(errorOf(wrapper, 'name').exists()).toBe(false);
  });

  test.each([
    ['9999999999', 'números'],
    ['Anderson 11111', 'números'],
    ['Maria_Silva', 'símbolos: _'],
    ['!!!!!!!!', 'símbolos: !'],
    ['------', 'começar por uma letra']
  ])('o nome %s indica o motivo exato', async (name, expected) => {
    const wrapper = mountForm();
    await fillFields(wrapper, { ...VALID_FIELDS, name });
    await submit(wrapper);
    expect(errorOf(wrapper, 'name').text()).toContain(expected);
  });

  test('indica quantos dígitos e caracteres foram escritos', async () => {
    const wrapper = mountForm();
    await fillFields(wrapper, { ...VALID_FIELDS, name: 'Maria', contact: '12345678' });
    await submit(wrapper);
    expect(errorOf(wrapper, 'name').text()).toContain('(tem 5)');
    expect(errorOf(wrapper, 'phone').text()).toContain('(tem 8)');
  });

  test('o erro desaparece enquanto o utilizador corrige, sem submeter', async () => {
    const wrapper = mountForm();
    await wrapper.find('#contact-name').setValue('Anderson 11111');
    await wrapper.find('#contact-name').trigger('blur');
    expect(errorOf(wrapper, 'name').text()).toContain('números');

    await wrapper.find('#contact-name').setValue('Anderson Neto');
    await nextTick();
    expect(errorOf(wrapper, 'name').exists()).toBe(false);
  });

  test('não mostra erro antes de o utilizador sair do campo', async () => {
    const wrapper = mountForm();
    await wrapper.find('#contact-name').setValue('And');
    await nextTick();
    expect(errorOf(wrapper, 'name').exists()).toBe(false);
  });

  test('corrigir um campo não apaga o erro de outro', async () => {
    const wrapper = mountForm();
    await submit(wrapper);
    await wrapper.find('#contact-name').setValue('Anderson Neto');
    await nextTick();
    expect(errorOf(wrapper, 'name').exists()).toBe(false);
    expect(errorOf(wrapper, 'email').exists()).toBe(true);
  });

  test('o erro de duplicado da API desaparece ao alterar o campo', async () => {
    const wrapper = mountForm();
    await fillFields(wrapper, VALID_FIELDS);
    await wrapper.setProps({ serverErrors: { contact: 'Já existe um contacto com este número.' } });
    await flushPromises();
    expect(errorOf(wrapper, 'phone').text()).toContain('Já existe');

    await wrapper.find('#contact-phone').setValue('933333333');
    await nextTick();
    expect(errorOf(wrapper, 'phone').exists()).toBe(false);
  });

  test('o erro de duplicado mantém-se ao sair do campo sem o alterar', async () => {
    const wrapper = mountForm();
    await fillFields(wrapper, VALID_FIELDS);
    await wrapper.setProps({ serverErrors: { contact: 'Já existe um contacto com este número.' } });
    await flushPromises();

    await wrapper.find('#contact-phone').trigger('blur');
    expect(errorOf(wrapper, 'phone').text()).toContain('Já existe');
  });

  test('leva o cursor ao primeiro campo com erro', async () => {
    const wrapper = mount(ContactForm, {
      props: { submitLabel: 'Guardar' },
      global: { stubs: { RouterLink: true } },
      attachTo: document.body
    });
    await fillFields(wrapper, { ...VALID_FIELDS, contact: '123' });
    await submit(wrapper);
    await flushPromises();
    expect(document.activeElement?.id).toBe('contact-phone');
    wrapper.unmount();
  });

  test.each(['José António', "Sinead O'Connor", 'Ana-Rita Silva'])('aceita o nome %s', async (name) => {
    const wrapper = mountForm();
    await fillFields(wrapper, { ...VALID_FIELDS, name });
    await submit(wrapper);
    expect(errorOf(wrapper, 'name').exists()).toBe(false);
  });

  test.each(['12345678', '1234567890', '12345678a'])('recusa o contacto %s', async (contact) => {
    const wrapper = mountForm();
    await fillFields(wrapper, { ...VALID_FIELDS, contact });
    await submit(wrapper);
    expect(errorOf(wrapper, 'phone').text()).toContain('9 dígitos');
  });

  test.each(['sem-arroba.pt', 'a@b', 'a b@c.pt', 'a@b..pt', '.a@b.pt', 'a@b.p'])('recusa o email %s', async (email) => {
    const wrapper = mountForm();
    await fillFields(wrapper, { ...VALID_FIELDS, email });
    await submit(wrapper);
    expect(errorOf(wrapper, 'email').text()).toContain('válido');
  });

  test('exige fotografia', async () => {
    const wrapper = mountForm();
    await fillFields(wrapper, VALID_FIELDS);
    await submit(wrapper);
    expect(errorOf(wrapper, 'picture').text()).toContain('obrigatória');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  test('recusa ficheiro que não é imagem', async () => {
    const wrapper = mountForm();
    await selectFile(wrapper, new File(['x'], 'nota.txt', { type: 'text/plain' }));
    expect(errorOf(wrapper, 'picture').text()).toContain('JPEG');
  });

  test('recusa fotografia acima do limite', async () => {
    const wrapper = mountForm();
    await selectFile(wrapper, pngFile(MAX_PICTURE_BYTES + 1));
    expect(errorOf(wrapper, 'picture').text()).toContain('5 MB');
  });

  test('com dados válidos, emite os campos e a fotografia', async () => {
    const wrapper = mountForm();
    const file = pngFile();
    await fillFields(wrapper, VALID_FIELDS);
    await selectFile(wrapper, file);
    await submit(wrapper);

    const [formData] = wrapper.emitted('submit')[0];
    expect(Object.fromEntries(formData)).toMatchObject(VALID_FIELDS);
    expect(formData.get('picture').name).toBe(file.name);
  });

  test('mostra no campo os erros devolvidos pela API', async () => {
    const wrapper = mountForm();
    await wrapper.setProps({ serverErrors: { contact: 'Já existe um contacto com este número.' } });
    await flushPromises();
    expect(errorOf(wrapper, 'phone').text()).toContain('Já existe');
  });
});

describe('ContactForm ao editar', () => {
  test('preenche o formulário com os dados atuais', () => {
    const wrapper = mountForm({ contact: EXISTING_CONTACT });
    expect(wrapper.find('#contact-name').element.value).toBe(VALID_FIELDS.name);
    expect(wrapper.find('#contact-phone').element.value).toBe(VALID_FIELDS.contact);
    expect(wrapper.find('#contact-email').element.value).toBe(VALID_FIELDS.email);
  });

  test('submete sem fotografia nova', async () => {
    const wrapper = mountForm({ contact: EXISTING_CONTACT });
    await submit(wrapper);

    const [formData] = wrapper.emitted('submit')[0];
    expect(formData.has('picture')).toBe(false);
  });

  test('continua a validar os campos', async () => {
    const wrapper = mountForm({ contact: EXISTING_CONTACT });
    await wrapper.find('#contact-name').setValue('Ana');
    await submit(wrapper);

    expect(errorOf(wrapper, 'name').text()).toContain('mais de 5');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });
});
