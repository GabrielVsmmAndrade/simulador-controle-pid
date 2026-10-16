const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth');
const simulationController = require('../controllers/simulationController');

// GET /api/simulation/plants — lista as plantas disponíveis e seus parâmetros padrão
router.get('/plants', authMiddleware, simulationController.getPlants);

// POST /api/simulation — executa uma simulação PID (sem salvar)
router.post('/', authMiddleware, simulationController.simulate);

// POST /api/simulation/save — executa e persiste a simulação
router.post('/save', authMiddleware, simulationController.saveSimulation);

// GET /api/simulation/history — lista o histórico do usuário autenticado
router.get('/history', authMiddleware, simulationController.listHistory);

// GET /api/simulation/history/:id — detalhes de uma simulação salva
router.get('/history/:id', authMiddleware, simulationController.getOne);

// DELETE /api/simulation/history/:id — exclui uma simulação salva
router.delete('/history/:id', authMiddleware, simulationController.removeOne);

module.exports = router;
