# Contexto do Projeto — Oficina Fácil

## 1. Identificação

- Projeto: Oficina Fácil
- Grupo: Unidos
- Disciplina: Programação Web — UNICEPLAC
- Metodologia: Spec-Driven Development (SDD)
- Estado atual: preparação das especificações e estrutura inicial do repositório.

## 2. Objetivo do sistema

O Oficina Fácil é uma plataforma web para conectar motoristas e oficinas mecânicas, permitindo pesquisar oficinas, agendar serviços, acompanhar ordens de serviço e avaliar atendimentos concluídos.

## 3. Fonte de referência

O arquivo `docs/spec.md` contém as especificações consolidadas do projeto.

O Documento de Visão do Produto — Oficina Fácil é a referência original dos requisitos.

Antes de implementar qualquer funcionalidade, consulte as especificações correspondentes.

Se uma informação estiver ausente, ambígua ou contraditória, solicite esclarecimento. Não invente requisitos.

## 4. Tecnologias definidas

- Front-end: HTML5, CSS3, JavaScript e Bootstrap 5.
- Back-end: Node.js e Express.js.
- Banco de dados: PostgreSQL.
- Acesso ao banco: SQL parametrizado com driver pg.
- Autenticação: bcrypt e sessão/token em cookie HttpOnly.
- Versionamento: Git e GitHub.

Não substitua essas tecnologias por outras sem uma decisão arquitetural aprovada.

## 5. Regras para implementação

1. Leia `docs/spec.md` antes de iniciar uma tarefa.
2. Identifique os requisitos e regras de negócio relacionados.
3. Trabalhe exclusivamente na branch de funcionalidade designada.
4. Não modifique diretamente as branches `main` ou `develop`.
5. Não implemente funcionalidades fora do escopo documentado.
6. Preserve a arquitetura estabelecida.
7. Mantenha o código organizado e compreensível.
8. Não armazene senhas, tokens ou credenciais no repositório.
9. Relacione as alterações aos requisitos atendidos.
10. Execute os testes definidos para a tarefa.
11. Não altere ou remova testes apenas para conseguir aprovação.
12. Apresente as alterações realizadas e os resultados dos testes.
13. Não declare uma funcionalidade concluída sem evidências de validação.

## 6. Fluxo de trabalho

1. Ler a especificação.
2. Identificar a Issue designada.
3. Verificar a branch de trabalho.
4. Implementar somente a funcionalidade solicitada.
5. Executar as verificações aplicáveis.
6. Registrar as alterações em commits.
7. Preparar uma Pull Request para revisão.
8. Aguardar a integração conforme o processo definido pelo grupo.

## 7. Controle de mudanças

Se uma tarefa exigir alteração relevante de arquitetura, interrompa a implementação e proponha um registro de decisão arquitetural (ADR).

Não tome decisões arquiteturais não autorizadas.

## 8. Estado atual do projeto

O projeto encontra-se na fase de organização documental e preparação do fluxo de desenvolvimento.

Os contratos de entrada e saída, critérios individuais de aceitação, tarefas de implementação e testes automatizados ainda precisam ser completados ou configurados.

Este arquivo não autoriza o início de implementações fora das especificações aprovadas.
