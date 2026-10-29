
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');

test('GET /api/health retorna status ok', async (t) => {
  const server = app.listen(0);

  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  }));

  await new Promise((resolve) => {
    if (server.listening) resolve();
    else server.once('listening', resolve);
  });

  const port = server.address().port;

  const response = await fetch(
    `http://127.0.0.1:${port}/api/health`
  );

  assert.equal(response.status, 200);

  const resultado = await response.json();

  assert.deepEqual(resultado, {
    status: 'ok',
    projeto: 'Oficina Facil'
  });
});
