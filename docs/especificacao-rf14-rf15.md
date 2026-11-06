# Oficina Fácil — Especificação de implementação: RF14–RF15

**Fonte:** `docs/spec.md`, requisitos RF14 e RF15. **Método:** SDD (Specification-Driven Development).
**Base:** RF01–RF13, incluindo a correção PostgreSQL 42P08 na aprovação do orçamento.

## RF14 — Avaliação do atendimento

> O sistema deve permitir uma avaliação de 1 a 5 estrelas e comentário somente para atendimento concluído e pertencente ao cliente.

### Regras e critérios de aceitação

1. **Autorização:** somente usuário autenticado com perfil `cliente` pode cadastrar avaliação; a ordem deve pertencer a esse cliente (vínculo `ordens_servico` → `agendamentos` → `clientes` → `usuarios`).
2. **Conclusão:** apenas ordens com situação `finalizado` ou `entregue` podem ser avaliadas. `cancelado`, `recebido`, `diagnostico`, `orcamento`, `aguardando_aprovacao` e `em_manutencao` não permitem avaliação.
3. **Nota e comentário:** nota inteira entre 1 e 5 e comentário obrigatório com 1 a 1000 caracteres após remoção de espaços das extremidades.
4. **Duplicidade:** apenas uma avaliação por ordem. O banco estabelece `UNIQUE (ordem_id)`; tentativa duplicada recebe HTTP 409.
5. **Persistência:** avaliações são vinculadas à ordem de serviço concluída, preservando a relação com a oficina via agendamento.
6. **Consulta do cliente:** na página `/ordens.html`, o cliente vê formulário nas ordens elegíveis não avaliadas e a própria avaliação nas já avaliadas.
7. **Perfil público da oficina:** em `/oficina.html?id=...`, exibir média calculada, quantidade real de avaliações e até 30 avaliações recentes (nota e comentário). Não mostrar dados pessoais do cliente; exibir mensagem de estado vazio se não houver avaliações.
8. **Segurança:** revalidar propriedade e situação no próprio `INSERT`, além da checagem inicial. A renderização do comentário não interpreta HTML ou scripts.

### API

| Método | Rota | Acesso | Resposta |
|---|---|---|---|
| POST | `/api/avaliacoes` | Cliente autenticado | `201 {sucesso,mensagem,avaliacao}` |
| GET | `/api/avaliacoes/minhas` | Cliente autenticado | `200 {sucesso,avaliacoes}` |
| GET | `/api/oficinas/:id/avaliacoes` | Público | `200 {sucesso,quantidade,media,avaliacoes}` |

Exemplo de POST: `{ "ordemId": 1, "nota": 5, "comentario": "Bom atendimento." }`.

Respostas de erro: `400` para parâmetros inválidos, `401` não autenticado, `403` perfil indevido, `404` ordem fora da conta/oficina inexistente, `409` ordem não concluída ou avaliação duplicada. Erros internos: `500` com mensagem genérica, sem detalhes técnicos expostos no navegador.

### Persistência

- Nova tabela `avaliacoes`, ligada a `ordens_servico` por `ordem_id` (único).
- Campos `nota`, `comentario`, `criado_em` e chave primária.
- Scripts equivalentes `src/database/migrations/005_avaliacoes.sql` e complemento idempotente em `src/database/schema.sql`; o comando de instalação é **somente** `npm run db:init`.
- Não apagar ou recriar dados e tabelas anteriores.

## RF15 — Mensagens de retorno

> O sistema deve exibir mensagens de confirmação, validação e erro para as operações realizadas.

**RF15 não é um chat/mensageria entre cliente e oficina.** Trata das respostas exibidas pela aplicação após operações.

### Critérios de aceitação

1. Após enviar uma avaliação válida, exibir confirmação clara (**Avaliação enviada com sucesso.**).
2. Em campos ausentes/nota inválida, exibir mensagem explicando como corrigir os dados; não gravar avaliação inválida.
3. Em ordem não concluída ou já avaliada, exibir mensagem clara de impedimento.
4. Em falha de servidor ou consulta pública, exibir aviso compreensível sem vazar SQL, tokens ou credenciais.
5. Utilizar mensagens acessíveis: área `aria-live`, `role="status"` em sucesso e `role="alert"` em erro; texto incluído com `textContent`.
6. Preservar as mensagens de confirmação, validação e erro já presentes em RF01–RF13. Na página de ordens, os avisos passam a usar o utilitário comum `public/js/feedback.js`.

## Plano de teste manual no PostgreSQL

1. Execute `npm test` (**90 testes são esperados** neste pacote). Confira ausência de falhas.
2. Execute `npm run db:init` com o banco local correto; faça backup antes se há dados relevantes. Depois, `npm start`.
3. Entre com **Cliente** e abra **Minhas ordens de serviço**. Uma ordem **Entregue** (como a O.S. #1 dos testes RF10–RF13) deverá oferecer formulário de avaliação.
4. Cadastre, por exemplo, nota **5 estrelas** e comentário **"Atendimento de teste concluído."**. Confirme a mensagem de sucesso e a substituição do formulário pela avaliação enviada.
5. Atualize com F5; a avaliação deve continuar registrada e o formulário não deve reaparecer para a mesma ordem.
6. Na página pública da oficina correspondente, confirme nota, média e comentário.
7. Na ordem **Cancelado** (por exemplo, O.S. #2), confirme que **não há** formulário de avaliação.
8. Confira que uma oficina sem avaliações não mostra média fictícia nem selo de verificação.
9. Teste erros de interface: nota não selecionada, comentário vazio e falta de acesso; a mensagem deve explicar o problema sem apagar os demais dados.

**Limites:** testes automatizados usam banco simulado (não substituem a validação real de PostgreSQL e navegador). A amostra de até 30 comentários públicos não implementa paginação completa. Uma avaliação não possui edição/exclusão pelo usuário neste MVP, pois a RF14 não exige essas operações.
