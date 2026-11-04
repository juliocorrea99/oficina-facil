const { Pool } = require('pg');

let pool = null;
let customExecutor = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    const config = connectionString
      ? { connectionString }
      : {
          host: process.env.PGHOST || 'localhost',
          port: parseInt(process.env.PGPORT || '5432', 10),
          user: process.env.PGUSER || 'postgres',
          password: process.env.PGPASSWORD || 'postgres',
          database: process.env.PGDATABASE || 'oficina_facil'
        };

    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('Erro inesperado no cliente do pool PostgreSQL:', err);
    });
  }
  return pool;
}

/**
 * Executa uma consulta SQL parametrizada no banco de dados.
 * @param {string} text - Instrução SQL parametrizada ($1, $2, ...)
 * @param {Array} params - Parâmetros da consulta
 * @returns {Promise<{ rows: Array, rowCount: number }>}
 */
async function query(text, params = []) {
  if (customExecutor) {
    return customExecutor.query(text, params);
  }
  const currentPool = getPool();
  return currentPool.query(text, params);
}

/**
 * Obtém um cliente do pool para controle de transações (BEGIN, COMMIT, ROLLBACK).
 */
async function getClient() {
  if (customExecutor) {
    return customExecutor.getClient();
  }
  const currentPool = getPool();
  return currentPool.connect();
}

/**
 * Testa se a conexão com o PostgreSQL está ativa.
 */
async function testConnection() {
  try {
    const currentPool = getPool();
    const result = await currentPool.query('SELECT NOW()');
    return { ok: true, timestamp: result.rows[0].now };
  } catch (error) {
    const detalhe = error.message
      || (Array.isArray(error.errors) && error.errors.map(e => e.message || e.code).filter(Boolean).join('; '))
      || error.code
      || String(error);
    return { ok: false, error: detalhe || 'Erro desconhecido ao conectar ao PostgreSQL' };
  }
}

/**
 * Fecha o pool de conexões (útil para encerramento de testes e processos).
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Permite injetar um executor customizado (usado para testes automatizados sem banco externo).
 */
function setCustomExecutor(executor) {
  customExecutor = executor;
}

module.exports = {
  getPool,
  query,
  getClient,
  testConnection,
  closePool,
  setCustomExecutor
};
