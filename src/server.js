const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite receber dados em formato JSON.
app.use(express.json());

// Rota técnica para verificar o funcionamento do servidor.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    projeto: 'Oficina Facil'
  });
});

// Inicia o servidor.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
  });
}

module.exports = app;
