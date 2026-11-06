# Especificação Técnica — RF02 a RF05: Perfis e Oficinas

**Projeto:** Oficina Fácil  
**Status:** Aprovado para Implementação  
**Metodologia:** Specification-Driven Development (SDD)  
**Requisitos Cobertos:** RF02, RF03, RF04, RF05  
**Regras de Negócio e Não Funcionais Relacionadas:** RN01, RN03, RN06, RNF02, RNF04, RNF05, RNF07  

---

## 1. RF02 — Edição do Próprio Perfil

### 1.1. Objetivo
Permitir que usuários autenticados (Cliente ou Oficina) atualizem os dados permitidos de seu próprio cadastro através de interface web no painel e API REST, preservando a segurança da conta e a unicidade de e-mail (RN01).

### 1.2. Critérios de Aceitação
- Usuário autenticado pode consultar seus dados atuais e alterá-los em formulário dedicado.
- Cliente pode alterar: `nome`, `email`, `telefone`, `cpf`.
- Oficina pode alterar: `nome` (responsável), `email`, `telefone`, `nomeFantasia`, `razaoSocial`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `descricao`.
- Se o e-mail for alterado para um endereço já pertencente a outra conta ativa, a operação é rejeitada com `409 Conflict`.
- Não é permitida a alteração de perfil (`cliente` não pode virar `oficina` e vice-versa).
- Não é permitida a alteração direta de `senha_hash` ou campos internos por esta rota (a senha permanece protegida conforme RNF05).
- Tentativas de alterar dados de terceiros são impedidas pelo servidor (a identificação do usuário decorre do token autenticado no cookie HttpOnly/header).
- Validações de servidor devem recusar nomes vazios, e-mails inválidos, CPFs inválidos ou cidades/UFs inválidas com `400 Bad Request`.

### 1.3. Contrato da API
- **Método / Rota:** `PUT /api/usuarios/perfil`
- **Autenticação:** Obrigatória (Cookie `token` ou Header `Authorization: Bearer <token>`)
- **Corpo da Requisição (Cliente):**
  ```json
  {
    "nome": "João Silva Alterado",
    "email": "joao.novo@exemplo.com",
    "telefone": "(61) 98888-0000",
    "cpf": "529.982.247-25"
  }
  ```
- **Corpo da Requisição (Oficina):**
  ```json
  {
    "nome": "Carlos Responsável",
    "email": "oficina.carlos@exemplo.com",
    "telefone": "(61) 3333-1111",
    "nomeFantasia": "Mecânica Carlos Atualizada",
    "razaoSocial": "Carlos Reparações LTDA",
    "cep": "70000-000",
    "logradouro": "SIA Trecho 3",
    "numero": "120",
    "complemento": "Galpão B",
    "bairro": "SIA",
    "cidade": "Brasília",
    "uf": "DF",
    "descricao": "Oficina especializada em suspensão, freios e motor."
  }
  ```
- **Resposta de Sucesso (200 OK):**
  ```json
  {
    "sucesso": true,
    "mensagem": "Perfil atualizado com sucesso!",
    "usuario": {
      "id": 1,
      "nome": "João Silva Alterado",
      "email": "joao.novo@exemplo.com",
      "perfil": "cliente",
      "telefone": "(61) 98888-0000",
      "perfilDetalhes": { ... }
    }
  }
  ```
- **Respostas de Erro:**
  - `400 Bad Request`: Dados inválidos (ex: e-mail inválido, campos obrigatórios em branco).
  - `401 Unauthorized`: Usuário não autenticado.
  - `409 Conflict`: E-mail já utilizado por outro usuário.

---

## 2. RF03 — Gestão de Serviços, Horários e Disponibilidade

### 2.1. Objetivo
Permitir que a Oficina autenticada gerencie os serviços que oferece (nome, descrição, duração estimada em minutos, preço estimado, status ativo/inativo), seus horários de funcionamento semanais e períodos de disponibilidade na agenda para futuros agendamentos (RF07).

### 2.2. Critérios de Aceitação
- Somente usuários com perfil `oficina` podem cadastrar, alterar ou inativar serviços, horários e disponibilidades.
- Uma oficina só pode gerenciar os registros vinculados à sua própria conta (RN06).
- **Serviços:**
  - Campos: `nome` (obrigatório), `descricao` (opcional), `duracao_estimada_minutos` (obrigatório, inteiro > 0), `preco_estimado` (opcional, numérico >= 0), `ativo` (booleano).
  - É possível inativar/ativar um serviço sem excluí-lo do banco (inativação lógica - RN14).
- **Horários de Funcionamento:**
  - Permite configurar para os 7 dias da semana (0 = Domingo a 6 = Sábado): `dia_semana`, `horario_abertura`, `horario_fechamento`, `fechado`.
  - Validação: se não estiver fechado, `horario_abertura` deve ser anterior ao `horario_fechamento`.
- **Disponibilidade (Janelas/Datas):**
  - Permite registrar janelas de atendimento por data: `data` (YYYY-MM-DD), `horario_inicio` (HH:MM), `horario_fim` (HH:MM), `vagas_simultaneas` (>= 1).
  - Validação: `horario_inicio` deve ser estritamente anterior a `horario_fim`.

### 2.3. Contratos da API
- **Listar Serviços da Oficina Autenticada:**
  - `GET /api/oficinas/me/servicos`
  - Resposta (200 OK): `[ { "id": 1, "nome": "Troca de Óleo", "descricao": "...", "duracaoEstimadaMinutos": 45, "precoEstimado": "180.00", "ativo": true } ]`
- **Cadastrar Serviço:**
  - `POST /api/oficinas/me/servicos`
  - Entrada: `{ "nome": "Alinhamento e Balanceamento", "descricao": "4 rodas", "duracaoEstimadaMinutos": 60, "precoEstimado": 120.00 }`
  - Resposta (201 Created): Objeto do serviço criado.
- **Editar Serviço:**
  - `PUT /api/oficinas/me/servicos/:id`
  - Entrada: `{ "nome": "...", "descricao": "...", "duracaoEstimadaMinutos": 60, "precoEstimado": 130.00, "ativo": true }`
  - Resposta (200 OK): Objeto do serviço atualizado.
- **Alternar Status do Serviço (Ativar/Inativar):**
  - `PATCH /api/oficinas/me/servicos/:id/status`
  - Entrada: `{ "ativo": false }`
  - Resposta (200 OK): Objeto do serviço com status atualizado.
- **Consultar Horários de Funcionamento:**
  - `GET /api/oficinas/me/horarios`
  - Resposta (200 OK): Array com até 7 registros (domingo a sábado).
- **Salvar / Atualizar Horários de Funcionamento:**
  - `PUT /api/oficinas/me/horarios`
  - Entrada: Array com os dias da semana e horários.
  - Resposta (200 OK): `{ "sucesso": true, "mensagem": "Horários atualizados com sucesso!" }`
- **Listar Disponibilidades:**
  - `GET /api/oficinas/me/disponibilidades`
  - Resposta (200 OK): Array de disponibilidades cadastradas.
- **Criar Disponibilidade:**
  - `POST /api/oficinas/me/disponibilidades`
  - Entrada: `{ "data": "2026-11-10", "horarioInicio": "08:00", "horarioFim": "12:00", "vagasSimultaneas": 2 }`
  - Resposta (201 Created): Objeto da disponibilidade criada.
- **Remover Disponibilidade:**
  - `DELETE /api/oficinas/me/disponibilidades/:id`
  - Resposta (200 OK): `{ "sucesso": true, "mensagem": "Disponibilidade removida com sucesso." }`

---

## 3. RF04 — Pesquisa Pública de Oficinas

### 3.1. Objetivo
Permitir que qualquer visitante (sem necessidade de login) pesquise oficinas mecânicas reais cadastradas no PostgreSQL através de filtros por cidade, UF, tipo de serviço e suas combinações.

### 3.2. Critérios de Aceitação
- Acessível publicamente por interface web e API REST.
- Suporta busca combinada:
  - `cidade`: busca parcial/insensível a maiúsculas (ex: `cidade=Brasilia` ou `cidade=Brasília`).
  - `uf`: filtro exato de estado com 2 caracteres (ex: `uf=DF`).
  - `servico`: filtro por nome/termo de serviço ativo oferecido pela oficina.
- Não exibe oficinas fictícias ou fixas; retorna apenas registros reais do banco de dados.
- Não expõe dados confidenciais (senhas, e-mails de acesso de terceiros, IDs internos desnecessários).
- Quando nenhum resultado for encontrado, retorna lista vazia com status `200 OK` e a interface exibe estado amigável ("Nenhuma oficina encontrada com os filtros selecionados.").

### 3.3. Contrato da API
- **Método / Rota:** `GET /api/oficinas`
- **Parâmetros de Consulta (Query):**
  - `cidade` (opcional, string)
  - `uf` (opcional, string de 2 letras)
  - `servico` (opcional, string)
- **Resposta de Sucesso (200 OK):**
  ```json
  {
    "sucesso": true,
    "total": 1,
    "oficinas": [
      {
        "id": 1,
        "nomeFantasia": "Oficina Central Auto",
        "cidade": "Brasília",
        "uf": "DF",
        "bairro": "SIA",
        "telefone": "(61) 3333-4444",
        "descricao": "Especializada em freios e suspensão",
        "servicos": ["Troca de Óleo", "Alinhamento e Balanceamento"]
      }
    ]
  }
  ```

---

## 4. RF05 — Perfil Público da Oficina

### 4.1. Objetivo
Exibir a página pública detalhada de uma oficina mecânica com seus dados de identificação, localização, serviços ativos, horários de funcionamento, disponibilidades cadastradas e seção de avaliações (com estado vazio informativo, pois o RF14 ainda não foi desenvolvido).

### 4.2. Critérios de Aceitação
- Acessível publicamente sem autenticação via URL amigável (`/oficina.html?id=:id`) e rota de API.
- Apresenta:
  - Identificação: Nome Fantasia, Razão Social (se pública), Descrição.
  - Localização e Contato: Endereço completo, Bairro, Cidade, UF, CEP, Telefone público.
  - Catálogo de Serviços: Lista com nome, descrição, duração estimada e preço estimado de serviços ativos.
  - Horários de Funcionamento da semana.
  - Janelas de Disponibilidade cadastradas.
  - Seção de Avaliações: exibe mensagem clara de que ainda não há avaliações registradas para a oficina (sem notas ou médias fictícias).
- Retorna `404 Not Found` caso a oficina não exista.
- Não expõe `senha_hash`, dados de sessão ou informações de clientes.

### 4.3. Contrato da API
- **Método / Rota:** `GET /api/oficinas/:id`
- **Resposta de Sucesso (200 OK):**
  ```json
  {
    "sucesso": true,
    "oficina": {
      "id": 1,
      "nomeFantasia": "Oficina Central Auto",
      "razaoSocial": "Central Auto Reparos LTDA",
      "descricao": "Oficina completa para seu veículo.",
      "telefone": "(61) 3333-4444",
      "cep": "70000-000",
      "logradouro": "SIA Trecho 3",
      "numero": "100",
      "complemento": null,
      "bairro": "SIA",
      "cidade": "Brasília",
      "uf": "DF",
      "servicos": [
        {
          "id": 10,
          "nome": "Revisão Preventiva",
          "descricao": "Checagem de 30 itens essenciais",
          "duracaoEstimadaMinutos": 120,
          "precoEstimado": "350.00"
        }
      ],
      "horarios": [
        {
          "diaSemana": 1,
          "horarioAbertura": "08:00",
          "horarioFechamento": "18:00",
          "fechado": false
        }
      ],
      "disponibilidades": [
        {
          "id": 5,
          "data": "2026-11-10",
          "horarioInicio": "08:00",
          "horarioFim": "12:00",
          "vagasSimultaneas": 2
        }
      ],
      "avaliacoes": []
    }
  }
  ```
- **Resposta de Erro (404 Not Found):**
  ```json
  {
    "sucesso": false,
    "mensagem": "Oficina não encontrada."
  }
  ```
