# Oficina Fácil — Especificação de Implementação: RF06–RF09

**Base:** documento de visão do projeto e `docs/spec.md`. **Método:** SDD.

## RF06 — Gestão de veículos

Cliente autenticado pode cadastrar, listar, editar e inativar **somente seus veículos**. Veículo contém placa brasileira (7 caracteres, formato antigo ou Mercosul), marca, modelo, ano opcional e apelido opcional. Placas são normalizadas em maiúsculas, sem pontuação; o mesmo cliente não pode repetir uma placa. Inativação é lógica e preserva atendimentos anteriores.

**Rotas autenticadas — perfil Cliente:**
- `GET /api/veiculos` → `{ sucesso, veiculos }`.
- `POST /api/veiculos` com `{ placa, marca, modelo, ano?, apelido? }` → HTTP 201.
- `PUT /api/veiculos/:id` com os mesmos dados → HTTP 200.
- `PATCH /api/veiculos/:id/inativar` → HTTP 200.

**Critérios:** acesso não autenticado 401; perfil Oficina 403; veículo alheio/inexistente 404; placa duplicada para mesmo Cliente 409.

## RF07 — Criação de agendamento

Cliente seleciona Oficina, um **seu veículo ativo**, Serviço ativo, data e horário disponível. O horário inicial escolhido deve estar alinhado à janela de 30 em 30 minutos; o horário final é derivado da duração estimada do serviço. Toda a faixa deve estar contida numa janela ativa da Oficina e no horário semanal de funcionamento.

**Rotas:**
- `GET /api/agendamentos/horarios?oficinaId=...&servicoId=...&data=AAAA-MM-DD` (consulta pública) → horários estimados para a duração do serviço. O retorno não garante disponibilidade até a confirmação.
- `POST /api/agendamentos` (Cliente) com `{ oficinaId, veiculoId, servicoId, disponibilidadeId, data, horarioInicio, observacoes? }` → HTTP 201, agendamento confirmado.

**RN02–RN04 / RNF06:** confirmação em transação PostgreSQL, com `SELECT ... FOR UPDATE` no veículo, oficina e janela. Isso serializa a verificação de capacidade da Oficina e impede reservas incompatíveis em concorrência. Checar sobreposição no período inteiro, inclusive se o Cliente tentar agendar o mesmo veículo em outra oficina. Responder 409 se não houver vaga ou o recurso estiver indisponível; oferecer nova escolha no front-end. Há índice único parcial contra o mesmo veículo com mesmo instante inicial ativo.

A contagem de conflitos é conservadora: qualquer reserva que se sobreponha à duração pretendida ocupa uma vaga do intervalo. Não há cobrança/pagamento, integração de mapa nem envio automático de mensagens.

## RF08 — Reagendamento e cancelamento

- `GET /api/agendamentos/me` (Cliente) → histórico de agendamentos.
- `PUT /api/agendamentos/:id` (Cliente proprietário) com `{ disponibilidadeId, data, horarioInicio, veiculoId?, servicoId?, observacoes? }` → atualiza a data/horário, mantendo Oficina e vínculo do agendamento.
- `PATCH /api/agendamentos/:id/cancelar` (Cliente proprietário), body `{ motivo? }` → inativa o agendamento (`status='cancelado'`), sem apagar histórico.

**RN05:** somente status **agendado** permite reagendar/cancelar. Após status **recebido**, ambas as operações são bloqueadas (409). A ação de recebimento e as ordens de serviço estão previstas no bloco RF10–RF13 e **não foram implementadas neste bloco**.

**RNF10:** criação, reagendamento e cancelamento registram usuário e data/hora em `agendamento_eventos`.

## RF09 — Agenda da Oficina

`GET /api/agendamentos/oficina?data=AAAA-MM-DD` (autenticado como Oficina) → agenda da **própria oficina**, contendo cliente, telefone, veículo, serviço, data, horário, observações e situação. Sem parâmetro de data retorna até 300 itens, ordenados. Não permite consultar a agenda de outra Oficina.

## Modelo de dados e migração

`src/database/migrations/003_veiculos_agendamentos.sql` cria `veiculos`, `agendamentos` e `agendamento_eventos`. As mesmas instruções foram adicionadas ao `src/database/schema.sql`, executado por `npm run db:init`. As instruções usam `IF NOT EXISTS`; **não é necessário executar os dois scripts**. Há relacionamentos e restrições para impedir a exclusão destrutiva de registros referenciados.

A remoção de uma janela de disponibilidade no RF03 passou a ser inativação lógica para preservar o histórico quando já existem agendamentos.

## Telas

- `/veiculos.html` — cadastro, edição e inativação de veículos (Cliente).
- `/agendar.html?oficinaId=ID` — criação de agendamento (Cliente, acessível a partir do perfil público da Oficina).
- `/agendamentos.html` — consulta, reagendamento e cancelamento (Cliente).
- `/dashboard.html` — seção **Agenda da oficina** e filtros de data (Oficina); atalhos de veículos e agenda para Cliente.

## Testes e critérios de validação

- `npm test` executa os testes anteriores e os testes adicionais.
- Testes novos abrangem autorização, propriedade dos veículos, duplicidade de placa, oferta de slots, lotação, conflito de veículo, reagendamento, cancelamento, bloqueio após recebido, isolamento da agenda e navegação.
- Os testes de API atuais usam um executor simulado com as mesmas consultas SQL que a aplicação. **É obrigatório homologar as operações reais com PostgreSQL local e duas sessões de usuários**, especialmente duas reservas concorrentes no último horário disponível. A implementação não foi executada contra o PostgreSQL do computador do aluno nesta entrega.

## Roteiro manual para a faculdade

1. Aplicar a migração: `npm run db:init`; verificar a mensagem de sucesso e tabelas no pgAdmin.
2. `npm test` e `npm start` na branch correta; entrar como Cliente.
3. Cadastrar veículo em `/veiculos.html`; editar e recarregar; verificar persistência.
4. Entrar como Oficina; criar um Serviço ativo, salvar horários de funcionamento e uma janela futura com **1 vaga**.
5. Em outra sessão Cliente, abrir Busca → Perfil público da Oficina → **Agendar atendimento**; selecionar veículo, serviço, data e horário.
6. Voltar como Oficina e conferir a reserva em **Agenda da oficina**.
7. Tentar reservar mesmo intervalo com outro veículo. Com capacidade 1, o sistema deve responder indisponível.
8. Reagendar o primeiro atendimento e depois cancelá-lo; conferir agenda e histórico.
9. Confirmar que Cliente não acessa agenda de Oficina e Oficina não cadastra veículo.

**Pendências naturais para RF10–RF13:** recebimento do veículo, ordem de serviço, diagnóstico/orçamento, aprovação e acompanhamento; a transição `recebido` não é exposta ao usuário no bloco RF06–RF09.
