# Oficina Fácil — Especificação do Projeto

**Metodologia:** Spec-Driven Development (SDD)  
**Status:** Em elaboração  
**Fonte principal:** Documento de Visão do Produto — Oficina Fácil  
**Disciplina:** Programação Web — UNICEPLAC  
**Grupo:** Unidos

---

## 1. Problema

O projeto Oficina Fácil busca resolver dificuldades enfrentadas por motoristas e oficinas mecânicas durante a busca, o agendamento e o acompanhamento de serviços automotivos.

Para o motorista, encontrar uma oficina adequada normalmente exige consultar avaliações, solicitar indicações, entrar em contato para verificar disponibilidade e acompanhar o andamento do veículo por diferentes canais.

Para a oficina, informações distribuídas entre mensagens, ligações, anotações e planilhas podem dificultar a organização da agenda e dos atendimentos.

A proposta é centralizar esse fluxo em uma única aplicação web.

## 2. Objetivo

Desenvolver uma aplicação web responsiva que conecte motoristas a oficinas mecânicas e centralize o fluxo de busca, agendamento, acompanhamento do atendimento e avaliação.

A solução pretende oferecer maior previsibilidade ao cliente e apoiar a organização operacional das oficinas.

## 3. Escopo do MVP

O Produto Mínimo Viável (MVP) contempla as seguintes funcionalidades:

1. Cadastro e autenticação de clientes e oficinas.
2. Pesquisa e visualização de oficinas por cidade/UF e tipo de serviço.
3. Cadastro e gerenciamento de veículos dos clientes.
4. Agendamento, alteração e cancelamento de serviços conforme as regras de negócio.
5. Gestão da disponibilidade e da agenda das oficinas.
6. Criação e atualização de ordens de serviço.
7. Registro de diagnóstico e orçamento, com aprovação ou recusa pelo cliente.
8. Acompanhamento das etapas do atendimento.
9. Avaliação de atendimentos concluídos.

## 4. Fora do escopo do MVP

As seguintes funcionalidades não fazem parte da entrega inicial:

- Gestão de estoque e compras.
- Gestão financeira.
- Processamento de pagamentos.
- Integração obrigatória com Google Maps.
- Integração com WhatsApp.
- Notificações automáticas por e-mail ou SMS.
- Integrações externas não necessárias ao funcionamento do MVP.

Essas funcionalidades não deverão ser implementadas sem revisão e aprovação do escopo.

## 5. Tecnologias e arquitetura

As tecnologias estabelecidas no Documento de Visão são:

| Camada | Tecnologia |
|---|---|
| Front-end | HTML5, CSS3 e JavaScript |
| Biblioteca visual | Bootstrap 5 |
| Back-end | Node.js |
| Framework back-end | Express.js |
| Banco de dados | PostgreSQL |
| Acesso ao banco | SQL parametrizado com driver pg |
| Autenticação | bcrypt e sessão/token em cookie HttpOnly |
| Versionamento | Git e GitHub |
| Gestão de tarefas | Trello, conforme Documento de Visão |
| Testes | Postman/Insomnia, DevTools, Lighthouse/axe e testes manuais |

### 5.1. Diretrizes arquiteturais

- O navegador executará o front-end responsivo.
- Operações com dados protegidos serão encaminhadas à API REST.
- O back-end será responsável pela validação de autenticação, autorização e regras de negócio.
- O banco de dados não deverá ser acessado diretamente pelo navegador.
- Consultas SQL deverão utilizar parametrização.
- Credenciais e configurações sensíveis deverão utilizar variáveis de ambiente.
- A arquitetura deverá respeitar as decisões documentadas pelo grupo.
- Mudanças arquiteturais relevantes deverão ser registradas antes da implementação.

---

## 6. Requisitos funcionais (RF)

Os requisitos abaixo foram definidos no Documento de Visão do Produto.

### RF01 — Cadastro e autenticação

O sistema deve permitir o cadastro e a autenticação de usuários com perfil Cliente ou Oficina.

**Prioridade:** Alta.

### RF02 — Edição de perfil

O sistema deve permitir que usuários autenticados editem os dados permitidos de seu próprio perfil.

**Prioridade:** Alta.

### RF03 — Gestão de serviços e disponibilidade

O sistema deve permitir que a oficina cadastre e mantenha seus serviços, horários de funcionamento e disponibilidade.

**Prioridade:** Alta.

### RF04 — Pesquisa de oficinas

O sistema deve permitir que qualquer visitante pesquise oficinas por cidade/UF e tipo de serviço.

**Prioridade:** Alta.

### RF05 — Perfil público da oficina

O sistema deve exibir o perfil público da oficina com dados de contato, serviços, avaliações e disponibilidade.

**Prioridade:** Alta.

### RF06 — Gestão de veículos

O sistema deve permitir que o cliente cadastre, edite e inative veículos vinculados à sua conta.

**Prioridade:** Alta.

### RF07 — Criação de agendamento

O sistema deve permitir que o cliente crie um agendamento selecionando oficina, veículo, serviço, data e horário disponível.

**Prioridade:** Alta.

### RF08 — Alteração e cancelamento de agendamento

O sistema deve permitir alteração ou cancelamento de agendamento enquanto as regras de negócio permitirem.

**Prioridade:** Alta.

### RF09 — Visualização da agenda

O sistema deve permitir que a oficina visualize sua agenda e os dados necessários dos atendimentos agendados.

**Prioridade:** Alta.

### RF10 — Gestão de ordem de serviço

O sistema deve permitir que a oficina crie e atualize uma ordem de serviço vinculada ao agendamento e ao veículo.

**Prioridade:** Alta.

### RF11 — Diagnóstico e orçamento

O sistema deve permitir que a oficina registre diagnóstico, itens/orçamento, valores e estágio do atendimento.

**Prioridade:** Alta.

### RF12 — Aprovação ou recusa do orçamento

O sistema deve permitir que o cliente aprove ou recuse o orçamento antes do início da manutenção.

**Prioridade:** Alta.

### RF13 — Acompanhamento da ordem de serviço

O sistema deve permitir que o cliente acompanhe o status e os dados permitidos de sua ordem de serviço.

**Prioridade:** Alta.

### RF14 — Avaliação do atendimento

O sistema deve permitir uma avaliação de 1 a 5 estrelas e comentário somente para atendimento concluído e pertencente ao cliente.

**Prioridade:** Alta.

### RF15 — Mensagens de retorno

O sistema deve exibir mensagens de confirmação, validação e erro para as operações realizadas.

**Prioridade:** Média.

---

## 7. Requisitos não funcionais (RNF)

### RNF01 — Desempenho

Páginas principais devem ficar utilizáveis em até 3 segundos em teste com conexão móvel simulada e dados de demonstração.

### RNF02 — Responsividade

A interface deve operar de 320 px de largura até desktop, sem rolagem horizontal causada pelo layout e sem perda de função.

### RNF03 — Compatibilidade

A aplicação deve funcionar nas duas versões estáveis mais recentes de Chrome, Edge, Firefox e Safari.

### RNF04 — Acessibilidade

Atender ao menos aos critérios aplicáveis de nível AA da WCAG 2.1 e adotar critérios da WCAG 2.2 quando compatíveis com o projeto.

### RNF05 — Segurança

Senhas devem ser armazenadas somente como hash; comunicação em produção deve usar HTTPS; acessos devem ser autorizados por perfil e propriedade do recurso.

### RNF06 — Integridade

O banco deve impedir agendamento duplicado do mesmo recurso/horário e manter chaves estrangeiras e validações de status.

### RNF07 — Usabilidade

Campos devem possuir rótulos, instruções e erros claros; a jornada de agendamento deve ser concluída em no máximo cinco decisões principais após escolher a oficina.

### RNF08 — Privacidade

Coletar apenas dados necessários ao fluxo, exibir finalidade e fornecer meios para consulta, correção e solicitação de exclusão conforme o contexto do projeto.

### RNF09 — Manutenibilidade

Código versionado em Git, organizado por módulos, sem credenciais no repositório; configurações sensíveis ficam em variáveis de ambiente.

### RNF10 — Auditabilidade

Operações críticas de agendamento, mudança de status e aprovação de orçamento devem registrar usuário e data/hora, sem armazenar senhas ou dados sensíveis em logs.

---

## 8. Regras de negócio (RN)

### RN01 — Unicidade de conta

Cada e-mail deve identificar uma única conta ativa no sistema.

### RN02 — Permissão para agendamento

Somente Cliente autenticado pode criar agendamento e somente para veículo pertencente à sua conta.

### RN03 — Disponibilidade da oficina

Uma oficina só pode receber agendamentos em períodos marcados como disponíveis e dentro de seu horário de atendimento.

### RN04 — Integridade do agendamento

A criação de agendamento deve ser transacional: se o horário deixar de estar disponível durante a confirmação, o sistema deve recusar e solicitar nova escolha.

### RN05 — Cancelamento e reagendamento

O cliente pode cancelar ou reagendar enquanto o veículo ainda não tiver sido marcado como recebido pela oficina.

### RN06 — Controle de acesso da oficina

A oficina só pode consultar e alterar agendamentos e ordens de serviço pertencentes à própria oficina.

### RN07 — Vínculo da ordem de serviço

A ordem de serviço é vinculada a um agendamento e a um veículo; não pode ser transferida para outro cliente sem novo registro.

### RN08 — Fluxo da ordem de serviço

O fluxo principal da O.S. segue:

Recebido → Diagnóstico → Orçamento → Aguardando aprovação → Em manutenção → Finalizado → Entregue.

"Cancelado" é um estado excepcional, com motivo registrado.

### RN09 — Aprovação obrigatória

A O.S. não pode avançar de "Aguardando aprovação" para "Em manutenção" sem registro de aprovação do cliente.

### RN10 — Composição e alteração do orçamento

Valores do orçamento devem armazenar itens, mão de obra e total calculável; mudanças relevantes após aprovação exigem nova aprovação.

### RN11 — Permissão para avaliação

Somente o cliente vinculado ao atendimento pode avaliá-lo, e somente após a O.S. chegar a Finalizado ou Entregue.

### RN12 — Unicidade de avaliação

Cada atendimento concluído aceita no máximo uma avaliação ativa do cliente, evitando múltiplas notas para o mesmo serviço.

### RN13 — Validação da avaliação

A nota deve estar no intervalo de 1 a 5 e o comentário deve respeitar limite de tamanho definido pela interface.

### RN14 — Integridade dos relacionamentos

A exclusão ou inativação de registros com histórico não deve quebrar relacionamentos; quando necessário, utilizar inativação lógica em vez de apagar dados relacionados.

---

## 9. Entidades principais

Conforme o Documento de Visão, o modelo de dados contempla:

- Usuário.
- Oficina.
- Veículo.
- Serviço.
- Disponibilidade.
- Agendamento.
- Ordem de Serviço.
- Item da Ordem de Serviço.
- Avaliação.

Os atributos, relacionamentos, chaves e restrições deverão respeitar o modelo de dados definido pelo grupo e ser detalhados na modelagem técnica.

## 10. Contratos de entrada e saída

Os contratos das operações deverão ser documentados antes da implementação de cada unidade funcional.

Cada contrato deverá identificar, conforme aplicável:

- Operação ou funcionalidade.
- Dados de entrada.
- Dados de saída.
- Validações.
- Autenticação e autorização necessárias.
- Condições de sucesso.
- Condições de erro.
- Regras de negócio relacionadas.

Os endpoints, métodos HTTP e formatos JSON específicos ainda deverão ser definidos e revisados pelo grupo.

Nenhum contrato não documentado deverá ser considerado aprovado automaticamente.

## 11. Critérios de aceitação e testes

As funcionalidades deverão possuir critérios de aceitação verificáveis, relacionados aos requisitos funcionais e às regras de negócio.

O Documento de Visão estabelece objetivos de validação, incluindo:

- Execução dos cenários principais dos requisitos funcionais de alta prioridade.
- Ausência de reservas incompatíveis duplicadas nos testes de concorrência.
- Execução da jornada principal: pesquisa, agendamento, ordem de serviço, aprovação, acompanhamento e avaliação.
- Ausência de acesso indevido nos cenários de autorização testados.
- Verificação de desempenho e acessibilidade conforme requisitos não funcionais.

Os testes específicos de cada funcionalidade ainda deverão ser definidos.

## 12. Unidades de implementação

Os requisitos deverão ser decompostos em unidades de trabalho para organização no GitHub Issues.

Cada unidade deverá indicar:

- Identificador da tarefa.
- Requisitos relacionados.
- Descrição do comportamento esperado.
- Responsável.
- Critérios de aceitação.
- Dependências, quando existirem.
- Testes necessários.
- Branch de desenvolvimento correspondente.

A decomposição final das unidades será realizada antes do desenvolvimento.

## 13. Controle de mudanças arquiteturais

As alterações relevantes de arquitetura deverão ser documentadas por meio de registros de decisão arquitetural (ADR — Architecture Decision Record).

Cada registro deverá identificar:

- Decisão proposta.
- Contexto.
- Justificativa.
- Alternativas consideradas.
- Consequências da decisão.
- Situação da aprovação.

Nenhum agente de IA deverá alterar unilateralmente as tecnologias ou a arquitetura estabelecidas no projeto.

## 14. Diretrizes para agentes de IA

Os agentes deverão obedecer às seguintes orientações:

1. Ler a documentação do projeto antes de implementar qualquer funcionalidade.
2. Utilizar as especificações como fonte de requisitos.
3. Não implementar comportamentos fora do escopo documentado.
4. Solicitar revisão das especificações quando encontrar requisitos ausentes, contraditórios ou insuficientes.
5. Respeitar a arquitetura e as tecnologias definidas.
6. Trabalhar somente na branch designada.
7. Não realizar alterações diretamente na branch principal.
8. Relacionar as implementações aos requisitos e regras de negócio correspondentes.
9. Executar os testes definidos para cada tarefa.
10. Não eliminar, enfraquecer ou modificar testes apenas para obter resultados positivos.
11. Apresentar os resultados das verificações realizadas.
12. Não declarar uma tarefa concluída sem evidências de atendimento aos critérios de aceitação.

## 15. Pendências da especificação

Antes de utilizar este documento como referência completa para implementação, ainda será necessário:

- [x] Registrar problema, objetivo e escopo do MVP.
- [x] Incorporar RF01 a RF15.
- [x] Incorporar RNF01 a RNF10.
- [x] Incorporar RN01 a RN14.
- [x] Registrar a arquitetura e as tecnologias estabelecidas.
- [ ] Revisar ambiguidades e eventuais inconsistências entre requisitos.
- [ ] Especificar contratos de entrada e saída.
- [ ] Definir critérios de aceitação individuais.
- [ ] Decompor funcionalidades em tarefas rastreáveis.
- [ ] Criar Issues correspondentes no GitHub.
- [ ] Configurar o mecanismo de testes automatizados.
- [ ] Preparar o arquivo de contexto dos agentes.
- [ ] Registrar decisões arquiteturais adicionais, quando necessárias.

---

**Status do documento:** especificação consolidada inicial, ainda em elaboração.

Os requisitos e regras de negócio têm como referência o Documento de Visão do Produto — Oficina Fácil.

A documentação ainda não contém todos os contratos e critérios de aceitação necessários para orientar uma implementação integral sem decisões adicionais do grupo.
