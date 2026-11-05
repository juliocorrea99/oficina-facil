require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const oficinaRoutes = require('./routes/oficinaRoutes');
const veiculoRoutes = require('./routes/veiculoRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const ordemRoutes = require('./routes/ordemRoutes');

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

// Rotas de usuários e edição de perfil (RF02)
app.use('/api/usuarios', usuarioRoutes);

// Rotas de gestão, pesquisa e perfil de oficinas (RF03, RF04, RF05)
app.use('/api/oficinas', oficinaRoutes);

// Rotas de veiculos e agendamentos (RF06-RF09)
app.use('/api/veiculos', veiculoRoutes);
app.use('/api/agendamentos', agendamentoRoutes);

// Ordens de serviço, orçamento e aprovação (RF10-RF13)
app.use('/api/ordens', ordemRoutes);

// Inicia o servidor.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
  });
}

module.exports = app;
