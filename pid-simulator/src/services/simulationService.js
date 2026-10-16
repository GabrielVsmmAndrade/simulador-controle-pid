const mongoose = require('mongoose');
const { runSimulation, plants } = require('../engine/simulationEngine');
const Simulation = require('../models/Simulation');

const validPlantTypes = Object.keys(plants);

const simulate = ({ plantType, plantParams, pid, setpoint, duration, dt }) => {
  if (!plantType || !validPlantTypes.includes(plantType)) {
    throw {
      status: 400,
      message: `plantType deve ser um de: ${validPlantTypes.join(', ')}`,
    };
  }

  if (
    !pid ||
    typeof pid.kp !== 'number' ||
    typeof pid.ki !== 'number' ||
    typeof pid.kd !== 'number'
  ) {
    throw { status: 400, message: 'pid deve conter kp, ki e kd numéricos' };
  }

  if (pid.kp < 0 || pid.ki < 0 || pid.kd < 0) {
    throw {
      status: 400,
      message: 'Os ganhos Kp, Ki e Kd devem ser maiores ou iguais a zero',
    };
  }

  if (duration !== undefined && (typeof duration !== 'number' || duration <= 0 || duration > 120)) {
    throw { status: 400, message: 'duration deve ser um número entre 0 e 120 segundos' };
  }

  if (dt !== undefined && (typeof dt !== 'number' || dt <= 0 || dt > 1)) {
    throw { status: 400, message: 'dt deve ser um número entre 0 e 1' };
  }

  if (setpoint !== undefined && typeof setpoint !== 'number') {
    throw { status: 400, message: 'setpoint deve ser numérico' };
  }

  return runSimulation({ plantType, plantParams, pid, setpoint, duration, dt });
};

const listPlants = () => {
  return Object.entries(plants).map(([key, p]) => ({
    key,
    label: p.label,
    defaultParams: p.defaultParams,
    defaultSetpoint: p.defaultSetpoint,
    controlLimits: p.controlLimits,
  }));
};

/**
 * Salva uma simulação. Recalcula via a engine (em vez de confiar em
 * resultados vindos do cliente) para garantir que o que é persistido
 * sempre corresponde aos parâmetros informados.
 */
const saveSimulation = async (userId, { name, plantType, plantParams, pid, setpoint, duration, dt }) => {
  const result = simulate({ plantType, plantParams, pid, setpoint, duration, dt });

  const simulation = await Simulation.create({
    user: userId,
    name: name || '',
    plantType: result.plant,
    plantParams: result.params,
    pid: result.pid,
    setpoint: result.setpoint,
    dt: result.dt,
    duration: result.duration,
    results: {
      time: result.time,
      output: result.output,
      control: result.control,
      error: result.error,
    },
    metrics: result.metrics,
  });

  return simulation;
};

// Lista resumida (sem a série temporal completa) das simulações do usuário
const listSimulations = async (userId) => {
  return Simulation.find({ user: userId })
    .select('name plantType setpoint metrics createdAt')
    .sort({ createdAt: -1 });
};

const getSimulation = async (userId, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw { status: 400, message: 'Id de simulação inválido' };
  }
  const simulation = await Simulation.findOne({ _id: id, user: userId });
  if (!simulation) {
    throw { status: 404, message: 'Simulação não encontrada' };
  }
  return simulation;
};

const deleteSimulation = async (userId, id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw { status: 400, message: 'Id de simulação inválido' };
  }
  const simulation = await Simulation.findOneAndDelete({ _id: id, user: userId });
  if (!simulation) {
    throw { status: 404, message: 'Simulação não encontrada' };
  }
  return simulation;
};

module.exports = {
  simulate,
  listPlants,
  saveSimulation,
  listSimulations,
  getSimulation,
  deleteSimulation,
};
