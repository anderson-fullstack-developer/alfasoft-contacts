// The real page, the real API and the isolated test database working together.
// The API is started by tests/functional-setup.js, which refuses any database other than the test one.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { mount } from '@vue/test-utils';
import mysql from 'mysql2/promise';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, test, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ContactFormPage from './ContactFormPage.vue';

const PNG_BYTES = readFileSync(path.join(import.meta.dirname, '../../../tests/fixtures/sample.png'));
const EMAIL_PREFIX = 'funcional-';

const VALID_FIELDS = { name: 'Maria Silva', contact: '930000001', email: `${EMAIL_PREFIX}maria@exemplo.pt` };
const OTHER_FIELDS = { name: 'Joana Costa', contact: '930000002', email: `${EMAIL_PREFIX}joana@exemplo.pt` };

const EmptyPage = { template: '<div />' };

let db;

async function insertRow({ name, contact, email }) {
  const [result] = await db.execute(
    'INSERT INTO contacts (name, contact, email, picture) VALUES (?, ?, ?, ?)',
    [name, contact, email, 'semente.png']
  );
  return result.insertId;
}

async function findRows() {
  const [rows] = await db.execute('SELECT * FROM contacts WHERE email LIKE ? ORDER BY id', [`${EMAIL_PREFIX}%`]);
  return rows;
}

async function openPage(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'contacts', component: EmptyPage },
      { path: '/novo', name: 'new-contact', component: ContactFormPage },
      { path: '/editar/:id', name: 'edit-contact', component: ContactFormPage },
      { path: '/ver/:id', name: 'contact-details', component: EmptyPage }
    ]
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(ContactFormPage, { global: { plugins: [router] } });
  await vi.waitFor(() => expect(wrapper.find('form').exists()).toBe(true));
  return { wrapper, router };
}

async function fillFields(wrapper, { name, contact, email }) {
  await wrapper.find('#contact-name').setValue(name);
  await wrapper.find('#contact-phone').setValue(contact);
  await wrapper.find('#contact-email').setValue(email);
}

async function selectPicture(wrapper, bytes = PNG_BYTES) {
  const input = wrapper.find('#contact-picture');
  const file = new File([bytes], 'foto.png', { type: 'image/png' });
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
  await input.trigger('change');
}

const submit = (wrapper) => wrapper.find('form').trigger('submit');

const expectError = (wrapper, field, text) =>
  vi.waitFor(() => expect(wrapper.find(`#contact-${field}-error`).text()).toContain(text));

beforeAll(async () => {
  db = await mysql.createConnection(inject('database'));
  window.happyDOM.setURL(inject('baseUrl'));
  document.cookie = inject('sessionCookie');
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(async () => {
  await db.execute('DELETE FROM contacts WHERE email LIKE ?', [`${EMAIL_PREFIX}%`]);
});

afterAll(async () => {
  await db.execute('DELETE FROM contacts WHERE email LIKE ?', [`${EMAIL_PREFIX}%`]);
  await db.end();
});

describe('adicionar um contacto', () => {
  test('com campos inválidos, mostra os erros e não grava nada', async () => {
    const { wrapper } = await openPage('/novo');
    await fillFields(wrapper, { name: 'Maria', contact: '12345678', email: 'sem-arroba' });
    await submit(wrapper);

    await expectError(wrapper, 'name', 'mais de 5');
    await expectError(wrapper, 'phone', '9 dígitos');
    await expectError(wrapper, 'email', 'Email inválido');
    await expectError(wrapper, 'picture', 'obrigatória');
    expect(await findRows()).toHaveLength(0);
  });

  test('com um número já usado, mostra o erro da API e não grava nada', async () => {
    await insertRow(OTHER_FIELDS);
    const { wrapper } = await openPage('/novo');
    await fillFields(wrapper, { ...VALID_FIELDS, contact: OTHER_FIELDS.contact });
    await selectPicture(wrapper);
    await submit(wrapper);

    await expectError(wrapper, 'phone', 'Já existe um contacto com este número');
    expect(await findRows()).toHaveLength(1);
  });

  test('com um email já usado, mostra o erro da API e não grava nada', async () => {
    await insertRow(OTHER_FIELDS);
    const { wrapper } = await openPage('/novo');
    await fillFields(wrapper, { ...VALID_FIELDS, email: OTHER_FIELDS.email.toUpperCase() });
    await selectPicture(wrapper);
    await submit(wrapper);

    await expectError(wrapper, 'email', 'Já existe um contacto com este email');
    expect(await findRows()).toHaveLength(1);
  });

  test('com um ficheiro disfarçado de imagem, mostra o erro da API e não grava nada', async () => {
    const { wrapper } = await openPage('/novo');
    await fillFields(wrapper, VALID_FIELDS);
    await selectPicture(wrapper, Buffer.from('isto não é uma imagem'));
    await submit(wrapper);

    await expectError(wrapper, 'picture', 'JPEG, PNG ou WebP');
    expect(await findRows()).toHaveLength(0);
  });

  test('com dados válidos, grava na base de dados e abre os detalhes', async () => {
    const { wrapper, router } = await openPage('/novo');
    await fillFields(wrapper, VALID_FIELDS);
    await selectPicture(wrapper);
    await submit(wrapper);

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('contact-details'));
    const [row] = await findRows();
    expect(row).toMatchObject(VALID_FIELDS);
    expect(row.picture).toMatch(/\.png$/);
    expect(router.currentRoute.value.params.id).toBe(String(row.id));
  });
});

describe('editar um contacto', () => {
  test('com campos inválidos, mostra os erros e mantém os dados', async () => {
    const id = await insertRow(VALID_FIELDS);
    const { wrapper } = await openPage(`/editar/${id}`);
    await fillFields(wrapper, { ...VALID_FIELDS, name: 'Maria', contact: 'abc' });
    await submit(wrapper);

    await expectError(wrapper, 'name', 'mais de 5');
    await expectError(wrapper, 'phone', '9 dígitos');
    const [row] = await findRows();
    expect(row).toMatchObject(VALID_FIELDS);
  });

  test('com o número de outro contacto, mostra o erro da API e mantém os dados', async () => {
    const id = await insertRow(VALID_FIELDS);
    await insertRow(OTHER_FIELDS);
    const { wrapper } = await openPage(`/editar/${id}`);
    await fillFields(wrapper, { ...VALID_FIELDS, contact: OTHER_FIELDS.contact });
    await submit(wrapper);

    await expectError(wrapper, 'phone', 'Já existe um contacto com este número');
    const [row] = await findRows();
    expect(row).toMatchObject(VALID_FIELDS);
  });

  test('com dados válidos, atualiza a base de dados e mantém a fotografia', async () => {
    const id = await insertRow(VALID_FIELDS);
    const { wrapper, router } = await openPage(`/editar/${id}`);
    await fillFields(wrapper, { ...VALID_FIELDS, name: 'Maria Silva Lopes' });
    await submit(wrapper);

    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('contact-details'));
    const [row] = await findRows();
    expect(row.name).toBe('Maria Silva Lopes');
    expect(row.picture).toBe('semente.png');
  });
});
