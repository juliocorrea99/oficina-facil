# Oficina Fácil

Projeto Integrador de Programação Web — UNICEPLAC.

## Sobre o projeto

O **Oficina Fácil** é uma plataforma web planejada para conectar clientes a oficinas mecânicas, facilitando a busca por estabelecimentos, o agendamento de serviços, o acompanhamento de atendimentos e a avaliação das oficinas.

O projeto busca oferecer maior transparência nos orçamentos e mais confiança na escolha de serviços automotivos.

## Tecnologias previstas

- **Front-end:** HTML5, CSS3, JavaScript e Bootstrap 5.
- **Back-end:** Node.js e Express.js.
- **Banco de dados:** PostgreSQL.
- **Versionamento:** Git e GitHub.
- **Metodologia:** Specification-Driven Development (SDD).

O PostgreSQL ainda não está integrado à aplicação.

## Estrutura inicial

```text
oficina-facil/
├── docs/
│   ├── spec.md
│   ├── contexto.md
│   └── adr/
├── src/
│   ├── controllers/
│   ├── database/
│   ├── routes/
│   ├── services/
│   └── server.js
├── public/
│   ├── css/
│   └── js/
├── tests/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

As pastas reservadas para funcionalidades futuras contêm apenas arquivos `.gitkeep` neste estágio.

## Documentação SDD

As especificações devem orientar a implementação:

- [`docs/spec.md`](docs/spec.md): requisitos funcionais, requisitos não funcionais e regras de negócio.
- [`docs/contexto.md`](docs/contexto.md): contexto e orientações para o desenvolvimento.
- [`docs/adr/`](docs/adr/): registros das decisões arquiteturais.

Os requisitos funcionais RF01 a RF15 também estão registrados como Issues e organizados no GitHub Projects.

## Preparação do ambiente

**Pré-requisito:** Node.js 20 ou superior e npm.

Após clonar o repositório, acessar sua pasta e instalar as dependências:

```bash
npm install
```

Criar um arquivo `.env` local utilizando `.env.example` como referência, quando necessário.

Para iniciar o servidor:

```bash
npm start
```

Para executar em modo de desenvolvimento:

```bash
npm run dev
```

O servidor está configurado para utilizar a porta 3000 por padrão.

A rota técnica prevista para verificar o servidor é:

`http://localhost:3000/api/health`

**Importante:** os comandos e a rota ainda precisam ser verificados em um ambiente de execução. A integração com PostgreSQL permanece pendente.

## Organização do desenvolvimento

O projeto utiliza as seguintes convenções:

- `main`: branch principal.
- `develop`: integração das alterações revisadas.
- `feature/*`: desenvolvimento de funcionalidades ou tarefas específicas.

As alterações devem ser feitas em branches de trabalho e propostas à `develop` por meio de Pull Requests, com revisão de outro integrante.

Antes de implementar uma funcionalidade, consultar a especificação e a Issue correspondente. Quando necessário, detalhar critérios de aceitação e testes.

## Estado atual

**Fase: estrutura técnica inicial.**

Neste estágio:

- A documentação SDD inicial foi criada.
- Os 15 requisitos funcionais foram registrados como Issues.
- A estrutura de diretórios foi preparada.
- Foi criado um servidor Express mínimo com rota técnica de verificação.

**Ainda não foram implementados** os fluxos de cadastro, busca de oficinas, agendamento, orçamento, ordem de serviço, avaliação ou outras funcionalidades de negócio.

O objetivo desta etapa é estabelecer uma base organizada para o desenvolvimento posterior.
