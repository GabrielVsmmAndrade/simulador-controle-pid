const simulationService = require('../services/simulationService');

const simulate = (req, res) => {
  try {
    const { plantType, plantParams, pid, setpoint, duration, dt } = req.body;
    const result = simulationService.simulate({ plantType, plantParams, pid, setpoint, duration, dt });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    const message = error.message || 'Erro ao executar a simulação';
    res.status(status).json({ error: message });
  }
};

const getPlants = (req, res) => {
  res.json(simulationService.listPlants());
};

const saveSimulation = async (req, res) => {
  try {
    const { name, plantType, plantParams, pid, setpoint, duration, dt } = req.body;
    const simulation = await simulationService.saveSimulation(req.userId, {
      name,
      plantType,
      plantParams,
      pid,
      setpoint,
      duration,
      dt,
    });
    res.status(201).json(simulation);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Erro ao salvar a simulação' });
  }
};

const listHistory = async (req, res) => {
  try {
    const simulations = await simulationService.listSimulations(req.userId);
    res.json(simulations);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
};

const getOne = async (req, res) => {
  try {
    const simulation = await simulationService.getSimulation(req.userId, req.params.id);
    res.json(simulation);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Erro ao buscar simulação' });
  }
};

const removeOne = async (req, res) => {
  try {
    await simulationService.deleteSimulation(req.userId, req.params.id);
    res.json({ message: 'Simulação excluída com sucesso' });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Erro ao excluir simulação' });
  }
};

module.exports = { simulate, getPlants, saveSimulation, listHistory, getOne, removeOne };
