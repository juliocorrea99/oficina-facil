require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite receber dados em formato JSON e formulários URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Permite leitura de cookies (necessário para sessão com cookie HttpOnly)
app.use(cookieParser());

// Serve arquivos estáticos da pasta public/ (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rota técnica para verificar o funcionamento do servidor.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    projeto: 'Oficina Facil'
  });
});

// Rotas do módulo de autenticação e cadastro (RF01)
app.use('/api/auth', authRoutes);

// Inicia o servidor.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
  });
}

module.exports = app;
