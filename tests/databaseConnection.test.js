const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/database/db');

test('testConnection - retorna objeto com status sem lançar exceções não tratadas', async () => {
  // Testa a função testConnection
  const status = await db.testConnection();
  assert.equal(typeof status, 'object');
  assert.equal(typeof status.ok, 'boolean');

  if (status.ok) {
    assert.ok(status.timestamp);
  } else {
    // Quando o PostgreSQL não está ativo localmente, deve reportar o motivo com clareza
    assert.equal(typeof status.error, 'string');
    assert.ok(status.error.length > 0);
  }
});
