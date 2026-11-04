-- ==========================================================
-- Oficina Fácil - Script DDL de Estrutura Inicial do Banco
-- Requisito: RF01 - Cadastro e autenticação
-- Regras atendidas: RN01 (Unicidade de conta por e-mail), RNF05 (Segurança)
-- ==========================================================

-- Tabela principal de usuários do sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('cliente', 'oficina')),
    telefone VARCHAR(20),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RN01: Cada e-mail deve identificar uma única conta ativa no sistema
-- Índice único insensível a maiúsculas/minúsculas para garantir unicidade
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_lower ON usuarios (LOWER(email));

-- Tabela complementar de perfil: Cliente
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    cpf VARCHAR(14),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela complementar de perfil: Oficina
CREATE TABLE IF NOT EXISTS oficinas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_fantasia VARCHAR(150) NOT NULL,
    razao_social VARCHAR(150),
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    cep VARCHAR(10),
    logradouro VARCHAR(200),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    descricao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização de consultas futuras (ex: busca por cidade/UF - RF04)
CREATE INDEX IF NOT EXISTS idx_oficinas_cidade_uf ON oficinas (cidade, uf);
CREATE INDEX IF NOT EXISTS idx_oficinas_cnpj ON oficinas (cnpj);
