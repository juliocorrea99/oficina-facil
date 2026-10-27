# Oficina Fácil — Especificação do Projeto

**Metodologia:** Spec-Driven Development (SDD)  
**Status:** Em elaboração  
**Fonte principal:** Documento de Visão do Produto — Oficina Fácil

## 1. Problema

Motoristas enfrentam dificuldades para encontrar oficinas adequadas, verificar disponibilidade, agendar serviços e acompanhar o andamento de manutenções.

As oficinas também precisam organizar informações de clientes, veículos, horários, orçamentos e ordens de serviço.

O Oficina Fácil propõe centralizar esses processos em uma plataforma web.

## 2. Objetivo

Desenvolver uma aplicação web responsiva que conecte motoristas a oficinas mecânicas, permitindo busca, agendamento, acompanhamento de atendimentos e avaliação dos serviços realizados.

## 3. Escopo do MVP

O sistema deverá contemplar:

1. Cadastro e autenticação de clientes e oficinas.
2. Pesquisa e visualização de oficinas.
3. Cadastro e gerenciamento de veículos.
4. Agendamento de serviços.
5. Gestão da agenda da oficina.
6. Criação e acompanhamento de ordens de serviço.
7. Registro e aprovação de orçamentos.
8. Avaliação de atendimentos concluídos.

## 4. Fora do escopo do MVP

- Gestão de estoque e compras.
- Gestão financeira e pagamentos.
- Integração obrigatória com Google Maps.
- Integração com WhatsApp.
- Notificações automáticas por e-mail ou SMS.

## 5. Tecnologias definidas

- Front-end: HTML5, CSS3 e JavaScript.
- Biblioteca visual: Bootstrap 5.
- Back-end: Node.js e Express.js.
- Banco de dados: PostgreSQL.
- Acesso ao banco: SQL parametrizado com driver pg.
- Controle de versão: Git e GitHub.

## 6. Requisitos funcionais

O Documento de Visão define os requisitos RF01 a RF15.

Esses requisitos deverão ser incorporados integralmente nas próximas revisões desta especificação.

## 7. Requisitos não funcionais

Os requisitos RNF01 a RNF10 serão detalhados conforme o Documento de Visão.

## 8. Regras de negócio

As regras RN01 a RN14 deverão ser incorporadas integralmente, preservando o comportamento definido no Documento de Visão.

## 9. Contratos e critérios de aceitação

Serão definidos os contratos de entrada e saída das funcionalidades, os critérios de aceitação e os testes necessários para verificar cada implementação.

## 10. Controle de mudanças

Alterações relevantes na arquitetura deverão ser documentadas por meio de registros de decisões arquiteturais (ADR).

## 11. Restrições para agentes de IA

- Consultar as especificações antes de implementar funcionalidades.
- Não desenvolver comportamentos fora do escopo aprovado.
- Não alterar a arquitetura sem uma decisão documentada.
- Não modificar testes apenas para produzir resultados positivos.
- Trabalhar na branch designada para cada tarefa.
- Apresentar os resultados dos testes antes de declarar uma implementação concluída.

**Observação:** esta especificação é inicial e ainda não contém todos os requisitos, contratos e critérios de aceitação necessários para orientar a implementação completa.
