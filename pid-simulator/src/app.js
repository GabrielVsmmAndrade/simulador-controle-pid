const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Raiz redireciona para a tela de login
app.get('/', (req, res) => res.redirect('/pages/login.html'));

// Rotas da API
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/simulation', require('./routes/simulationRoutes'));

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
};

start();
