const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const register = async ({ name, email, password }) => {
  // Verificar se o e-mail já existe
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw { status: 400, message: 'E-mail já cadastrado' };
  }

  // Criar usuário
  const user = await User.create({ name, email, password });

  return {
    user: { id: user._id, name: user.name, email: user.email },
  };
};

const login = async ({ email, password }) => {
  // Buscar usuário com a senha (select: false no schema)
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw { status: 401, message: 'E-mail ou senha inválidos' };
  }

  // Comparar senha
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw { status: 401, message: 'E-mail ou senha inválidos' };
  }

  // Gerar token
  const token = generateToken(user._id);

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email },
  };
};

module.exports = { register, login };
