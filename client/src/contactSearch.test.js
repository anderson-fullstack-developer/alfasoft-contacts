import { describe, expect, test } from 'vitest';
import { filterContacts } from './contactSearch.js';

const INES = { name: 'Inês Carvalho', contact: '910000003', email: 'ines.carvalho@exemplo.pt' };
const TIAGO = { name: 'Tiago Fernandes', contact: '910000002', email: 'tiago.fernandes@exemplo.pt' };
const CONTACTS = [INES, TIAGO];

describe('filterContacts', () => {
  test('sem pesquisa, devolve todos', () => {
    expect(filterContacts(CONTACTS, '   ')).toEqual(CONTACTS);
  });

  test('pesquisa por nome, sem distinguir maiúsculas nem acentos', () => {
    expect(filterContacts(CONTACTS, 'INES')).toEqual([INES]);
    expect(filterContacts(CONTACTS, 'inês')).toEqual([INES]);
  });

  test('pesquisa por telefone e por email', () => {
    expect(filterContacts(CONTACTS, '000002')).toEqual([TIAGO]);
    expect(filterContacts(CONTACTS, 'tiago.f')).toEqual([TIAGO]);
  });

  test('sem resultados, devolve uma lista vazia', () => {
    expect(filterContacts(CONTACTS, 'inexistente')).toEqual([]);
  });
});
