require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Iniciando aplicação do schema no PostgreSQL...');

  const connectionCheck = await db.testConnection();
  if (!connectionCheck.ok) {
    console.error('Falha ao conectar com o banco de dados PostgreSQL:');
    console.error(`- Motivo: ${connectionCheck.error}`);
    console.error('- Verifique se o serviço PostgreSQL está em execução e se a variável DATABASE_URL no .env está correta.');
    throw new Error(`Falha de conexão com PostgreSQL: ${connectionCheck.error}`);
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Schema inicial do banco de dados aplicado com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao executar o schema SQL:', err.message);
    throw err;
  } finally {
    client.release();
    await db.closePool();
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeDatabase };
