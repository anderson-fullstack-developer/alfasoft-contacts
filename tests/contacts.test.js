import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { loginCookie, startTestServer } from './helpers.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

let server;
let baseUrl;
let sessionCookie;
const createdIds = new Set();
let sequence = 0;

const api = (url, options = {}) =>
  fetch(url, { ...options, headers: { ...options.headers, cookie: sessionCookie } });

function uniqueFields() {
  sequence += 1;
  const suffix = String(sequence).padStart(4, '0');
  return {
    name: `Contacto de teste ${suffix.replace(/\d/g, (digit) => 'abcdefghij'[digit])}`,
    contact: `90000${suffix}`,
    email: `teste${suffix}@exemplo.pt`
  };
}

function buildForm(fields, picture) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (picture) form.append('picture', new Blob([picture.bytes], { type: picture.type }), picture.name);
  return form;
}

const validPicture = { bytes: PNG, type: 'image/png', name: 'foto.png' };

const post = (fields, picture = validPicture) =>
  api(`${baseUrl}/contacts`, { method: 'POST', body: buildForm(fields, picture) });

const put = (id, fields, picture) =>
  api(`${baseUrl}/contacts/${id}`, { method: 'PUT', body: buildForm(fields, picture) });

async function createContact(overrides = {}) {
  const fields = { ...uniqueFields(), ...overrides };
  const response = await post(fields);
  assert.equal(response.status, 201);
  const contact = await response.json();
  createdIds.add(contact.id);
  return contact;
}

async function assertFieldError(response, field, status = 400) {
  assert.equal(response.status, status);
  const body = await response.json();
  assert.ok(body.errors[field], `esperado erro no campo ${field}`);
}

before(async () => {
  server = await startTestServer();
  baseUrl = server.baseUrl;
  sessionCookie = await loginCookie(baseUrl);
});

after(async () => {
  for (const id of createdIds) {
    await api(`${baseUrl}/contacts/${id}`, { method: 'DELETE' });
  }
  await server.stop();
});

describe('validação ao criar', () => {
  test('recusa nome com 5 caracteres', async () => {
    await assertFieldError(await post({ ...uniqueFields(), name: 'Maria' }), 'name');
  });

  test('não conta os espaços nas pontas do nome', async () => {
    await assertFieldError(await post({ ...uniqueFields(), name: '  Maria  ' }), 'name');
  });

  test('aceita nome com 6 caracteres', async () => {
    const contact = await createContact({ name: 'Marias' });
    assert.equal(contact.name, 'Marias');
  });

  for (const name of ['9999999999', '!!!!!!!!', '------', '123 456', 'Maria\u0000Silva', 'Maria\u202eSilva', 'a'.repeat(256)]) {
    test(`recusa o nome "${name}"`, async () => {
      await assertFieldError(await post({ ...uniqueFields(), name }), 'name');
    });
  }

  for (const name of ['José António', "Sinead O'Connor", 'Ana-Rita Silva', 'J. R. Tolkien', 'Teste 1', 'Maria_123']) {
    test(`aceita o nome "${name}"`, async () => {
      const contact = await createContact({ name });
      assert.equal(contact.name, name);
    });
  }

  test('reduz espaços repetidos no nome', async () => {
    const contact = await createContact({ name: 'Maria    Silva' });
    assert.equal(contact.name, 'Maria Silva');
  });

  for (const contact of ['12345678', '1234567890', '12345678a', '123 45678', ' 123456789']) {
    test(`recusa o contacto "${contact}"`, async () => {
      await assertFieldError(await post({ ...uniqueFields(), contact }), 'contact');
    });
  }

  for (const email of ['', 'sem-arroba.pt', 'a@b', 'a b@c.pt', 'a@@b.pt', 'a@b..pt', '.a@b.pt', 'a.@b.pt', 'a..b@c.pt', 'a@b.p', 'a@-b.pt', 'a@b.123', '<script>alert(1)</script>@b.pt', 'a,b@c.pt', 'ação@b.pt']) {
    test(`recusa o email "${email}"`, async () => {
      await assertFieldError(await post({ ...uniqueFields(), email }), 'email');
    });
  }

  test("aceita um email com apóstrofo", async () => {
    const contact = await createContact({ email: "o'connor@exemplo.pt" });
    assert.equal(contact.email, "o'connor@exemplo.pt");
  });

  test('recusa contacto sem fotografia', async () => {
    const response = await api(`${baseUrl}/contacts`, {
      method: 'POST',
      body: buildForm(uniqueFields())
    });
    await assertFieldError(response, 'picture');
  });

  test('recusa ficheiro que não é imagem, mesmo com tipo de imagem', async () => {
    const fake = { bytes: Buffer.from('isto não é uma imagem'), type: 'image/png', name: 'foto.png' };
    await assertFieldError(await post(uniqueFields(), fake), 'picture');
  });

  test('recusa fotografia com mais de 5 MB', async () => {
    const big = { bytes: Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]), type: 'image/png', name: 'grande.png' };
    await assertFieldError(await post(uniqueFields(), big), 'picture');
  });

  test('recusa envio multipart malformado', async () => {
    const response = await api(`${baseUrl}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=limite' },
      body: '--limite\r\nConteudo sem cabecalhos validos'
    });
    await assertFieldError(response, 'picture');
  });

  test('indica todos os campos inválidos na mesma resposta', async () => {
    const response = await api(`${baseUrl}/contacts`, { method: 'POST', body: new FormData() });
    assert.equal(response.status, 400);
    const { errors } = await response.json();
    assert.deepEqual(Object.keys(errors).sort(), ['contact', 'email', 'name', 'picture']);
  });

  test('recusa contacto duplicado', async () => {
    const existing = await createContact();
    await assertFieldError(await post({ ...uniqueFields(), contact: existing.contact }), 'contact', 409);
  });

  test('recusa email duplicado, sem distinguir maiúsculas', async () => {
    const existing = await createContact();
    const email = existing.email.toUpperCase();
    await assertFieldError(await post({ ...uniqueFields(), email }), 'email', 409);
  });
});

describe('pedidos anormais', () => {
  test('um corpo acima do limite devolve 413', async () => {
    const response = await api(`${baseUrl}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'a'.repeat(200000) })
    });
    assert.equal(response.status, 413);
  });

  test('JSON malformado devolve 400', async () => {
    const response = await api(`${baseUrl}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":'
    });
    assert.equal(response.status, 400);
  });

  test('um endereço mal codificado devolve 400', async () => {
    assert.equal((await api(`${baseUrl}/contacts/%E0%A4%A`)).status, 400);
  });

  test('não permite ler ficheiros fora de uploads', async () => {
    for (const path of ['/.env', '/uploads/..%2f.env', '/uploads/%2e%2e/.env', '/db.js', '/package.json']) {
      assert.equal((await fetch(baseUrl + path)).status, 404, path);
    }
  });

  test('as respostas trazem os cabeçalhos de segurança', async () => {
    const { headers } = await fetch(`${baseUrl}/contacts`);
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.equal(headers.get('x-frame-options'), 'DENY');
    assert.equal(headers.get('strict-transport-security'), 'max-age=86400');
    assert.ok(headers.get('content-security-policy'));
    assert.equal(headers.get('x-powered-by'), null);
  });
});

describe('pedidos em simultâneo', () => {
  test('o mesmo número só é criado uma vez', async () => {
    const { contact } = uniqueFields();
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => post({ ...uniqueFields(), contact }))
    );
    const statuses = responses.map((response) => response.status).sort();
    for (const response of responses) {
      if (response.status === 201) createdIds.add((await response.json()).id);
    }
    assert.deepEqual(statuses, [201, ...Array(9).fill(409)]);
  });

  test('edições em simultâneo não deixam fotografias órfãs', async () => {
    const { id, name, contact, email } = await createContact();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => put(id, { name, contact, email }, validPicture))
    );
    assert.ok(responses.every((response) => response.status === 200));

    const pictures = await Promise.all(responses.map((response) => response.json()));
    const current = (await (await api(`${baseUrl}/contacts/${id}`)).json()).picture;
    for (const { picture } of pictures) {
      const expected = picture === current ? 200 : 404;
      assert.equal((await fetch(baseUrl + picture)).status, expected);
    }
  });
});

describe('leitura', () => {
  test('GET /contacts inclui o contacto criado', async () => {
    const contact = await createContact();
    const response = await api(`${baseUrl}/contacts`);
    assert.equal(response.status, 200);
    const list = await response.json();
    assert.ok(list.some((item) => item.id === contact.id));
  });

  test('GET /contacts/:id devolve todos os campos e a fotografia abre', async () => {
    const contact = await createContact();
    const response = await api(`${baseUrl}/contacts/${contact.id}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), contact);

    const picture = await fetch(`${baseUrl}${contact.picture}`);
    assert.equal(picture.status, 200);
    assert.deepEqual(Buffer.from(await picture.arrayBuffer()), PNG);
  });

  for (const id of ['999999999', 'abc', '0', '1%20OR%201=1']) {
    test(`GET /contacts/${id} devolve 404`, async () => {
      const response = await api(`${baseUrl}/contacts/${id}`);
      assert.equal(response.status, 404);
    });
  }

  test('o nome é guardado literalmente, sem injeção de SQL', async () => {
    const name = "Ana' OR 'a Silva";
    const contact = await createContact({ name });
    const response = await api(`${baseUrl}/contacts/${contact.id}`);
    assert.equal((await response.json()).name, name);
  });
});

describe('validação e comportamento ao editar', () => {
  test('recusa dados inválidos', async () => {
    const { id, name, contact, email } = await createContact();
    await assertFieldError(await put(id, { name: 'Maria', contact, email }), 'name');
    await assertFieldError(await put(id, { name, contact: '123', email }), 'contact');
    await assertFieldError(await put(id, { name, contact, email: 'invalido' }), 'email');
  });

  test('recusa ficheiro que não é imagem', async () => {
    const { id, name, contact, email } = await createContact();
    const fake = { bytes: Buffer.from('texto'), type: 'image/png', name: 'foto.png' };
    await assertFieldError(await put(id, { name, contact, email }, fake), 'picture');
  });

  test('sem fotografia nova mantém a atual', async () => {
    const existing = await createContact();
    const { id, contact, email } = existing;
    const response = await put(id, { name: 'Nome atualizado', contact, email });
    assert.equal(response.status, 200);
    const updated = await response.json();
    assert.equal(updated.name, 'Nome atualizado');
    assert.equal(updated.picture, existing.picture);
  });

  test('não acusa duplicado com o próprio contacto', async () => {
    const { id, name, contact, email } = await createContact();
    const response = await put(id, { name, contact, email });
    assert.equal(response.status, 200);
  });

  test('recusa contacto e email de outro registo', async () => {
    const other = await createContact();
    const { id, name, contact, email } = await createContact();
    await assertFieldError(await put(id, { name, contact: other.contact, email }), 'contact', 409);
    await assertFieldError(await put(id, { name, contact, email: other.email }), 'email', 409);
  });

  test('fotografia nova substitui e apaga a antiga', async () => {
    const existing = await createContact();
    const { id, name, contact, email } = existing;
    const response = await put(id, { name, contact, email }, { bytes: JPEG, type: 'image/jpeg', name: 'nova.jpg' });
    assert.equal(response.status, 200);
    const updated = await response.json();
    assert.notEqual(updated.picture, existing.picture);
    assert.equal((await fetch(`${baseUrl}${updated.picture}`)).status, 200);
    assert.equal((await fetch(`${baseUrl}${existing.picture}`)).status, 404);
  });

  test('devolve 404 se o contacto não existir', async () => {
    const response = await put(999999999, uniqueFields());
    assert.equal(response.status, 404);
  });
});

describe('eliminação', () => {
  test('remove o registo e a fotografia', async () => {
    const contact = await createContact();
    const response = await api(`${baseUrl}/contacts/${contact.id}`, { method: 'DELETE' });
    assert.equal(response.status, 204);
    createdIds.delete(contact.id);
    assert.equal((await api(`${baseUrl}/contacts/${contact.id}`)).status, 404);
    assert.equal((await fetch(`${baseUrl}${contact.picture}`)).status, 404);
  });

  test('devolve 404 se o contacto não existir', async () => {
    const response = await api(`${baseUrl}/contacts/999999999`, { method: 'DELETE' });
    assert.equal(response.status, 404);
  });
});
