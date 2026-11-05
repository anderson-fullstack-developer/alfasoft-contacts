# NodeJS Contacts

Aplicação web de gestão de contactos, desenvolvida para o exercício técnico da ALFASOFT, com **Node.js, Express, Vue 3 e MariaDB**. O backend e o frontend estão no mesmo projeto.

## Funcionalidades

- Lista pública de contactos em cartões, com todos os dados e a fotografia.
- Página de detalhes de um contacto.
- Criação e edição com o mesmo formulário.
- Eliminação com modal de confirmação.
- Validação no servidor e no formulário, com as mesmas regras:
  - nome com mais de 5 caracteres e pelo menos uma letra;
  - contacto com exatamente 9 dígitos;
  - email válido;
  - fotografia obrigatória ao criar (JPEG, PNG ou WebP, até 5 MB);
  - contacto e email únicos.
- Autenticação: sem sessão, só a lista está acessível.

## Estrutura

```text
index.js            Arranque do servidor
app.js              Configuração do Express e rotas do Vue
db.js               Pool de ligações à MariaDB
auth.js             Password, sessão e proteção de rotas
pictures.js         Deteção do tipo, gravação e remoção de fotografias
controllers/        Rotas da API
models/             Consultas SQL
validation/         Regras partilhadas pela API e pelo formulário
client/             Código-fonte do frontend Vue
public/             Frontend compilado (gerado, fora do Git)
uploads/            Fotografias (fora do Git)
database/schema.sql Estrutura da tabela
scripts/            Utilitário para gerar o hash da password
tests/              Testes da API
```

## Instalação

Requer Node.js 22 ou superior e uma base de dados MariaDB.

```bash
npm install
cp .env.example .env
```

1. Preenche o `.env` com os dados da base de dados.
2. Cria a tabela com `database/schema.sql`.
3. Gera o hash da password e coloca-o em `ADMIN_PASSWORD_HASH`:

   ```bash
   node scripts/hash-password.js "a-tua-password"
   ```

4. Define `ADMIN_USERNAME` e um valor longo e aleatório em `SESSION_SECRET`.

## Execução

Para usar a aplicação compilada, em `http://localhost:3000`:

```bash
npm run build
npm start
```

Para desenvolver o frontend com recarregamento automático, usa dois terminais:

```bash
npm start
npm run dev
```

O cookie de sessão é `Secure`, por isso o login exige HTTPS ou `localhost`.

## API

As respostas são em JSON. Os erros de validação seguem o formato `{ "errors": { "campo": "mensagem" } }`.

| Método | Rota | Sessão | Descrição | Respostas |
| --- | --- | --- | --- | --- |
| `GET` | `/contacts` | Não | Listar contactos | 200 |
| `GET` | `/contacts/:id` | Sim | Ver um contacto | 200, 401, 404 |
| `POST` | `/contacts` | Sim | Criar um contacto (`multipart/form-data`) | 201, 400, 401, 409 |
| `PUT` | `/contacts/:id` | Sim | Editar um contacto (`multipart/form-data`) | 200, 400, 401, 404, 409 |
| `DELETE` | `/contacts/:id` | Sim | Eliminar um contacto | 204, 401, 404 |
| `POST` | `/auth/login` | Não | Iniciar sessão | 200, 401 |
| `POST` | `/auth/logout` | Não | Terminar sessão | 204 |
| `GET` | `/auth/me` | Não | Consultar a sessão atual | 200 |

Os campos de contacto são `name`, `contact`, `email` e `picture`. Ao editar, a fotografia atual mantém-se se não for enviada outra.

Para experimentar a API manualmente, o ficheiro `requests.http` tem os pedidos prontos para a extensão REST Client do VS Code.

## Decisões técnicas

- **Unicidade na base de dados:** as chaves `UNIQUE` garantem a regra mesmo com pedidos simultâneos, e o erro de duplicação é devolvido como 409.
- **Queries parametrizadas:** os valores nunca são juntos ao texto do SQL.
- **Fotografias:** o ficheiro é validado em memória, o tipo é lido dos primeiros bytes e o nome é gerado no servidor. Se a gravação na base de dados falhar, o ficheiro novo é removido.
- **Validação partilhada:** o formulário usa as regras da API para dar resposta imediata, mas a API é sempre quem decide.
- **Sessão sem estado:** um token assinado com HMAC fica num cookie `HttpOnly`, `Secure` e `SameSite=Lax`, e a password é guardada com `scrypt`. Basta um utilizador, por isso as credenciais ficam em variáveis de ambiente.
- **Cabeçalhos de segurança:** todas as respostas incluem `X-Content-Type-Options`, `X-Frame-Options` e `Content-Security-Policy`.
- **Fotografias em pedidos simultâneos:** a edição e a eliminação usam uma transação, para nenhum ficheiro ficar órfão.
- **Pedidos de outros sites:** os pedidos que alteram dados vindos de outra origem são recusados com 403. O `SameSite=Lax` não chega, porque os subdomínios vizinhos contam como o mesmo site.
- **Limite de login:** depois de 10 tentativas falhadas em 15 minutos, o login devolve 429.
- **Funcionalidades nativas:** o modal usa o elemento `<dialog>` e os testes da API usam `node:test`. O `multer` serve apenas para ler o envio do ficheiro.

## Testes

Os testes da API nunca usam a base de dados do `.env`. Ligam-se a uma MariaDB local em `127.0.0.1:3307`, com base de dados, utilizador e password `contacts_test`, e guardam as fotografias numa pasta temporária.

Essa base pode ser qualquer instalação local com `database/schema.sql` aplicado, ou o contentor definido em `docker-compose.test.yml`:

```bash
npm run test:db:up
npm test
npm run test:db:down
```

- **API (`npm run test:api`):** validações, duplicados, contactos inexistentes, fotografias, autenticação e injeção de SQL, com pedidos HTTP reais.
- **Formulário (`npm run test:form`):** erros de validação ao criar e editar, com Vitest e Vue Test Utils.


## Limitações conhecidas

- Se o contacto e o email estiverem ambos duplicados, a API indica um de cada vez.
- O limite de login fica em memória: reinicia com o servidor e não é partilhado entre processos.
- Um cookie continua válido até expirar, mesmo depois do logout, porque a sessão não fica guardada no servidor.
- A fotografia é verificada pelos primeiros bytes, por isso um ficheiro corrompido com um início válido é aceite.
- Existe apenas um utilizador, sem registo de contas.
