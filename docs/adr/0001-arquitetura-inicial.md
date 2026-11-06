# ADR-0001 — Arquitetura Inicial do Oficina Fácil

**Status:** Documentada no Documento de Visão — validação da equipe pendente  
**Projeto:** Oficina Fácil  
**Fonte:** Documento de Visão do Produto, seções 20 e 21

## 1. Contexto

O Oficina Fácil é uma aplicação web responsiva destinada a conectar motoristas e oficinas mecânicas.

A aplicação deverá permitir busca de oficinas, agendamentos, gestão de ordens de serviço, aprovação de orçamentos e avaliações de atendimentos.

O Documento de Visão estabelece uma arquitetura web com separação entre front-end, back-end e banco de dados.

## 2. Decisão arquitetural documentada

A arquitetura definida no Documento de Visão utiliza:

- Front-end: HTML5, CSS3 e JavaScript.
- Biblioteca visual: Bootstrap 5.
- Back-end: Node.js e Express.js.
- Comunicação: API REST por HTTPS.
- Banco de dados: PostgreSQL.
- Acesso ao banco: SQL parametrizado com driver pg.
- Autenticação: bcrypt e sessão/token em cookie HttpOnly.
- Versionamento: Git e GitHub.

As regras de negócio e as validações de acesso deverão ser executadas no servidor.

O navegador não deverá acessar diretamente o banco de dados.

As credenciais e configurações sensíveis deverão permanecer fora do código-fonte.

## 3. Justificativas documentadas

O Documento de Visão apresenta as seguintes justificativas:

- Adoção de tecnologias-base da disciplina.
- Utilização de JavaScript no front-end e no back-end.
- Uso de Express.js para organização de uma API REST.
- Utilização de PostgreSQL para os relacionamentos entre usuários, veículos, oficinas, agendamentos e ordens de serviço.
- Uso de transações e restrições no banco para preservar a integridade dos agendamentos.
- Redução de dependências externas no MVP.

## 4. Consequências e restrições

- A aplicação deverá respeitar a arquitetura documentada.
- As regras de negócio não deverão depender exclusivamente de validações no navegador.
- A persistência de dados deverá preservar os relacionamentos e as restrições definidas.
- Integrações externas não são obrigatórias para o MVP.
- Alterações tecnológicas relevantes deverão ser avaliadas e documentadas antes da implementação.

## 5. Alternativas consideradas

O Documento de Visão não apresenta uma comparação formal entre arquiteturas alternativas.

Nenhuma alternativa adicional será registrada como se tivesse sido avaliada pelo grupo.

## 6. Controle de alterações

Mudanças futuras nesta decisão deverão ser registradas em novos ADRs ou em revisões devidamente justificadas.

Os agentes de IA não estão autorizados a alterar unilateralmente a arquitetura estabelecida.

## 7. Validação pendente

A equipe deverá confirmar se a arquitetura estabelecida no Documento de Visão permanece aprovada para a fase de implementação.

Este registro documenta decisões já presentes no material do grupo e não representa uma nova aprovação técnica.
