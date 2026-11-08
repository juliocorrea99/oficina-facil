# Oficina Fácil

**Projeto Integrador de Programação Web — UNICEPLAC (Grupo Unidos).**

## Sobre o projeto

O **Oficina Fácil** é uma plataforma web que conecta motoristas a oficinas mecânicas. Permite pesquisar oficinas por localização e serviços oferecidos, consultar horários e disponibilidades, agendar atendimentos, acompanhar ordens de serviço e avaliar atendimentos concluídos.

O projeto busca melhorar a organização dos agendamentos e a transparência do processo de diagnóstico, orçamento e autorização de serviços automotivos.

## Escopo funcional do MVP

Os **15 requisitos funcionais (RF01–RF15)** foram implementados e integrados à branch principal `main` por meio da Pull Request #24 (`develop` → `main`):

| Requisitos | Funcionalidades |
| --- | --- |
| RF01–RF02 | Cadastro e autenticação de clientes e oficinas; edição de perfil. |
| RF03 | Cadastro e gerenciamento de serviços, horários de atendimento e disponibilidades pela oficina. |
| RF04–RF05 | Pesquisa pública de oficinas e perfil público com serviços e informações de atendimento. |
| RF06 | Cadastro e gestão de veículos do cliente. |
| RF07–RF09 | Agendamento, alteração e cancelamento de agendamentos; consulta da agenda da oficina. |
| RF10–RF11 | Recebimento de veículos, ordens de serviço, diagnóstico e orçamento detalhado. |
| RF12–RF13 | Aprovação ou recusa de orçamento; acompanhamento das etapas de manutenção, finalização e entrega. |
| RF14 | Avaliação de atendimentos concluídos, com nota e comentário, exibida no perfil público da oficina. |
| RF15 | Mensagens de retorno, sucesso, validação e erro nas operações da aplicação. |

O cliente pode recusar um orçamento e encerrar o atendimento. A oficina não deve iniciar a manutenção sem a aprovação do orçamento. As avaliações são vinculadas a atendimentos elegíveis.

## Tecnologias e arquitetura

- **Front-end:** HTML5, CSS3, JavaScript e Bootstrap 5.
- **Back-end:** Node.js e Express.js.
- **Banco de dados:** PostgreSQL.
- **Autenticação:** JWT, com middleware de autorização por perfil.
- **Versionamento:** Git e GitHub, com desenvolvimento em branches e Pull Requests.
- **Metodologia:** Specification-Driven Development (SDD).
- **Testes:** suíte automatizada executada com `npm test`.

O código está organizado em `public/` (páginas e scripts do navegador), `src/` (rotas, controladores, serviços, acesso ao banco e servidor), `tests/` (testes automatizados) e `docs/` (especificações e decisões técnicas).

## Colaboração com IA

O projeto utilizou Google Antigravity e ChatGPT como apoio ao desenvolvimento e às correções do código, seguindo as especificações SDD presentes em `docs/`.

As alterações foram submetidas a Pull Requests, revisadas por integrantes da equipe e validadas com testes automatizados.

## Pré-requisitos

- Node.js 20 ou superior e npm, conforme a configuração documentada do projeto.
- PostgreSQL instalado, em execução e com um banco local destinado à aplicação.
- Acesso ao terminal na pasta do repositório.

## Instalação e execução local

1. Clone o repositório e entre na pasta do projeto:

   ```bash
   git clone https://github.com/juliocorrea99/oficina-facil.git
cd oficina-facil
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Crie o arquivo `.env` na pasta principal a partir de `.env.example` e configure a conexão com o PostgreSQL, além da chave de autenticação JWT. As variáveis utilizadas pelo código incluem `DATABASE_URL` (ou as configurações `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`), `JWT_SECRET`, `JWT_EXPIRES_IN` e `PORT`.

   **Segurança:** não publique o `.env`, credenciais ou segredos no repositório.

4. Com o PostgreSQL em execução e o `.env` configurado, inicialize o esquema do banco de dados:

   ```bash
   npm run db:init
   ```

   **Atenção:** execute a inicialização somente no banco de desenvolvimento ou testes apropriado. Confira o destino da conexão e mantenha cópia de segurança antes de aplicar alterações a qualquer banco que contenha dados importantes.

5. Inicie a aplicação:

   ```bash
   npm start
   ```

6. Acesse no navegador:

   - Página inicial: <http://localhost:3000>
   - Pesquisa pública de oficinas: <http://localhost:3000/oficinas.html>
   - Verificação técnica do servidor: <http://localhost:3000/api/health>

O servidor utiliza a porta **3000** por padrão, salvo configuração diferente em `PORT`.

## Testes automatizados

Execute:

```bash
npm test
```

**Última validação local (08/11/2026):** 96 testes executados, 96 aprovados e nenhuma falha, na branch `main`, após a integração da Pull Request #26.

Também foram executados testes manuais dos fluxos principais, da publicação de avaliação e da navegação em tela móvel simulada. Esses resultados **não substituem** uma auditoria completa de segurança, desempenho, acessibilidade ou publicação em produção.

## Documentação SDD

- [`docs/spec.md`](docs/spec.md) — requisitos funcionais, não funcionais e regras de negócio.
- [`docs/contexto.md`](docs/contexto.md) — contexto e orientações de desenvolvimento.
- [`docs/adr/`](docs/adr/) — decisões arquiteturais.
- [`docs/especificacao-rf02-rf05.md`](docs/especificacao-rf02-rf05.md) — perfis, serviços e busca de oficinas.
- [`docs/especificacao-rf06-rf09.md`](docs/especificacao-rf06-rf09.md) — veículos e agendamentos.
- [`docs/especificacao-rf10-rf13.md`](docs/especificacao-rf10-rf13.md) — ordens de serviço e orçamentos.
- [`docs/especificacao-rf14-rf15.md`](docs/especificacao-rf14-rf15.md) — avaliações e mensagens de retorno.

Os RF01–RF15 são acompanhados por Issues e pelo quadro do GitHub Projects, registrado com 15 itens em **Done** ao final da implementação.

## Fluxo de versionamento e situação da entrega

- `main` — branch principal, destinada à versão aprovada do projeto.
- `develop` — branch de integração das funcionalidades revisadas.
- `feature/*` e `fix/*` — desenvolvimento de funcionalidades e correções em branches específicas.

**Situação em 06/11/2026:** o MVP funcional, incluindo as correções da navegação mobile e desktop, foi integrado à branch `main` pela **Pull Request #24**, após revisão aprovada e teste do GitHub Actions bem-sucedido. A versão local da `main` foi atualizada no GitHub Desktop após o merge.

A execução e a validação confirmadas até aqui ocorreram em ambiente **local**. Publicação em ambiente externo e os critérios finais de entrega acadêmica precisam ser verificados conforme a orientação da disciplina.

## Observações para entrega

A última validação na branch `main` confirmou **96 testes automatizados aprovados, sem falhas**. Os testes manuais também verificaram os principais fluxos do MVP. Essas validações não substituem uma auditoria completa de segurança, desempenho e acessibilidade.