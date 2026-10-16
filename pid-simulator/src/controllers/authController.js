const authService = require('../services/authService');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const result = await authService.register({ name, email, password });
    res.status(201).json({ message: 'Usuário cadastrado com sucesso', ...result });
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || 'Erro interno do servidor';
    res.status(status).json({ error: message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const result = await authService.login({ email, password });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || 'Erro interno do servidor';
    res.status(status).json({ error: message });
  }
};

module.exports = { register, login };
