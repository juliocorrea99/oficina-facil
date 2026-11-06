# Oficina Fácil — Especificação de implementação RF10–RF13

**Fonte normativa:** `docs/spec.md` (RF10 a RF13; RN06 a RN10; RNF05, RNF06, RNF10).  
**Método:** Specification-Driven Development (SDD).  
**Base:** código existente RF01–RF09, sem alteração de contratos anteriores.

## RF10 — Ordem de serviço vinculada ao recebimento

**Ator:** Oficina autenticada. Uma O.S. é criada exclusivamente a partir de um agendamento **agendado** pertencente à oficina, pela ação **Registrar recebimento**. A transação bloqueia a linha de `agendamentos`, altera a situação para `recebido`, cria uma única O.S. ligada ao `agendamento_id` e registra evento de auditoria. O vínculo a cliente e veículo é herdado do agendamento (RN07). Não há exclusão física de histórico.

**Contrato:** `POST /api/ordens/receber`, corpo `{ "agendamentoId": 1 }` → HTTP 201 com `{ sucesso, mensagem, ordem }`. Agendamento cancelado ou já recebido → 409. Agendamento fora da oficina → 404. Perfil Cliente → 403; sem autenticação → 401.

## RF11 — Diagnóstico e orçamento

**Ator:** Oficina proprietária.

**Fluxo de estados:** `recebido → diagnostico → orcamento → aguardando_aprovacao → em_manutencao → finalizado → entregue`. `cancelado` é excepcional e exige motivo. Mudança de etapa ocorre apenas pela operação autorizada.

- `PUT /api/ordens/:id/diagnostico`, `{ "diagnostico": "..." }`: obrigatório; até 5.000 caracteres; disponível em `recebido` ou `diagnostico`.
- `PUT /api/ordens/:id/orcamento`, `{ "itens": [{ "tipo": "peca", "descricao": "Filtro", "quantidade": 1, "valorUnitario": 50 }, { "tipo": "mao_de_obra", "descricao": "Instalação", "quantidade": 1, "valorUnitario": 80 }] }`: 1 a 30 itens; tipos `peca`, `servico`, `mao_de_obra`; valores não negativos e quantidades maiores que zero. **Total** = soma de `quantidade × valor_unitario` de todos os itens. **Mão de obra** = soma dos subtotais dos itens do tipo `mao_de_obra`.
- `POST /api/ordens/:id/enviar-orcamento`: somente após registrar orçamento; estado muda para `aguardando_aprovacao`.

A edição de orçamento incrementa `orcamento_versao`, invalida aprovação anterior (`versao_aprovada = NULL`) e retorna a `orcamento`; se a manutenção já estava em andamento, não pode ser finalizada sem que a nova versão seja enviada e aprovada. Orçamento recusado não pode ser reenviado sem revisão dos itens (RN09–RN10).

## RF12 — Decisão do cliente e encerramento

**Ator:** Cliente proprietário do agendamento.

- `POST /api/ordens/:id/decisao`, `{ "decisao": "aprovado" }`: somente em `aguardando_aprovacao`; registra `versao_aprovada`, `decisao_em` e evento. O estado permanece `aguardando_aprovacao` até a oficina iniciar manutenção.
- `POST /api/ordens/:id/decisao`, `{ "decisao": "recusado", "motivo": "..." }`: registra recusa e retorna para `orcamento` para permitir proposta revisada. O cliente pode encerrar a O.S. a seguir.
- `POST /api/ordens/:id/decisao`, `{ "decisao": "recusado", "encerrar": true, "motivo": "..." }`: **recusa e encerra na mesma ação**, com situação `cancelado`, motivo e auditoria. Não exige passos adicionais.
- `POST /api/ordens/:id/encerrar`, `{ "motivo": "..." }`: encerra diretamente após recusa prévia, enquanto a O.S. permanecer em `orcamento` com decisão `recusado`.

A oficina só consegue iniciar manutenção (`POST /api/ordens/:id/avancar`, `{ "status": "em_manutencao" }`) se o cliente aprovou a **mesma versão** do orçamento que está vigente. Repetição de decisão ou decisão em etapa incorreta → HTTP 409.

## RF13 — Acompanhamento e entrega

**Ator:** Cliente ou Oficina autenticada, limitados às suas ordens.

- `GET /api/ordens`: lista as próprias ordens e itens, diagnóstico, total, decisão e situação.
- `GET /api/ordens/:id`: consulta uma O.S. própria; acesso a registro de terceiro retorna 404.
- `POST /api/ordens/:id/avancar`, `{ "status": "finalizado" }`: Oficina, apenas em manutenção.
- `POST /api/ordens/:id/avancar`, `{ "status": "entregue" }`: Oficina, apenas após finalização.
- `POST /api/ordens/:id/cancelar`, `{ "motivo": "..." }`: Oficina, antes de finalização ou entrega; motivo obrigatório.

Interface web: `/ordens.html`. O painel da Oficina possui botão para registrar recebimento e gerenciar ordens; o painel do Cliente tem link para acompanhar orçamento e status. A operação de cancelamento da O.S. preserva o recebimento histórico no agendamento original e registra seu próprio status de encerramento na O.S.

## Estrutura de dados e integridade

Migração **004** em `src/database/migrations/004_ordens_orcamentos.sql` reproduzida ao final de `src/database/schema.sql` para compatibilidade com `npm run db:init` atual. Utiliza `CREATE TABLE IF NOT EXISTS` e índices `IF NOT EXISTS`:

- `ordens_servico`: 1:1 com `agendamentos` (`UNIQUE agendamento_id`), estado, diagnóstico, versão, decisão e encerramento.
- `orcamento_itens`: itens detalhados, quantidades, preços e tipos.
- `ordem_eventos`: ator, operação, situação anterior/nova, versão e data/hora.

Todas as mudanças críticas do bloco usam transação (`BEGIN`/`COMMIT`/`ROLLBACK`); os comandos de atualização usam `FOR UPDATE OF os` e parâmetros SQL. No recebimento é bloqueada a linha do agendamento. Autorização é imposta por perfil e propriedade do agendamento **no servidor**.

## Validação e limites de homologação

- 67 testes anteriores mantidos.
- 12 testes novos de API, transições, isolamento entre contas, auditoria básica, alteração de orçamento e interface.
- **79 testes automatizados passaram no ambiente de desenvolvimento utilizando banco simulado.**
- Pendente: homologação manual com PostgreSQL real após `npm run db:init`, incluindo gravação, recusa, aprovação, reaprovação e visibilidade cruzada entre contas; testes de concorrência em PostgreSQL real também pendentes.
- RF14 (avaliações) e RF15 (mensagens de retorno) permanecem como bloco futuro; mensagens básicas de feedback nesta implementação não representam cobertura integral do RF15.
